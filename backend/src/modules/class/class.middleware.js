/**
 * Class Middleware
 * Role-specific middleware for Class Controller module
 * Handles class-based authentication and authorization
 * Modular structure - Class module
 */

/**
 * Validate class session
 * Ensures the logged-in class session is valid
 */
const validateClassSession = (req, res, next) => {
  // Check if class info is available in request
  if (!req.user || !req.user.classId) {
    return res.status(401).json({
      success: false,
      message: 'Class authentication required. Please login with class credentials.'
    });
  }

  next();
};

/**
 * Log Class Controller actions for audit purposes
 */
const logClassAction = (req, res, next) => {
  const action = `${req.method} ${req.path}`;
  const classId = req.user?.classId || 'unknown';
  const timestamp = new Date().toISOString();
  
  console.log(`[Class Controller Audit] ${timestamp} - Class ${classId} performed: ${action}`);
  
  res.locals.auditLog = {
    action,
    classId,
    timestamp,
    ipAddress: req.ip
  };
  
  next();
};

/**
 * Validate student-related operations within class
 * Ensures operations are scoped to the logged-in class
 */
const validateStudentAccess = (req, res, next) => {
  const userClassId = req.user?.classId;
  const studentClassId = req.body?.classId || req.params?.classId;

  // Ensure student operations are within the current class
  if (studentClassId && userClassId && studentClassId !== userClassId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only manage students within your class.'
    });
  }

  // Auto-assign classId if not provided
  if (req.body && userClassId && !req.body.classId) {
    req.body.classId = userClassId;
  }

  next();
};

/**
 * Validate homework operations within class
 */
const validateHomeworkAccess = (req, res, next) => {
  const userClassId = req.user?.classId;

  // Auto-assign classId to homework operations
  if (req.body && userClassId) {
    req.body.classId = userClassId;
  }

  next();
};

module.exports = {
  validateClassSession,
  logClassAction,
  validateStudentAccess,
  validateHomeworkAccess
};