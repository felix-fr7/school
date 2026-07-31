/**
 * Student Middleware
 * Role-specific middleware for Student module
 * Handles student authentication and authorization
 * Modular structure - Student module
 */

/**
 * Validate student session
 * Ensures the logged-in user is a student
 */
const validateStudentSession = (req, res, next) => {
  // Check if user is a student
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Student authentication required. Please login as a student.'
    });
  }

  // Ensure student has classId (required for most student operations)
  if (!req.user.classId) {
    return res.status(403).json({
      success: false,
      message: 'Student must be assigned to a class to access this resource.'
    });
  }

  next();
};

/**
 * Log Student actions for audit purposes
 */
const logStudentAction = (req, res, next) => {
  const action = `${req.method} ${req.path}`;
  const studentId = req.user?.id || 'unknown';
  const classId = req.user?.classId || 'unknown';
  const timestamp = new Date().toISOString();
  
  console.log(`[Student Audit] ${timestamp} - Student ${studentId} (Class: ${classId}) performed: ${action}`);
  
  res.locals.auditLog = {
    action,
    studentId,
    classId,
    timestamp,
    ipAddress: req.ip
  };
  
  next();
};

/**
 * Validate that student can only access their own data
 * Prevents students from accessing other students' information
 */
const validateOwnDataAccess = (req, res, next) => {
  const userId = req.user?.id;
  const requestedUserId = req.params?.userId || req.params?.studentId;

  // If a specific user ID is requested, ensure it's the logged-in user's own ID
  if (requestedUserId && requestedUserId !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access your own data.'
    });
  }

  // Auto-inject user ID for requests that need it
  if (req.body && userId) {
    req.body.studentId = userId;
  }

  next();
};

/**
 * Validate homework submission access
 * Ensures students can only submit their own homework
 */
const validateHomeworkSubmission = (req, res, next) => {
  const studentId = req.user?.id;
  const homeworkId = req.params?.id;

  // Store studentId for use in controller
  req.body.studentId = studentId;

  next();
};

module.exports = {
  validateStudentSession,
  logStudentAction,
  validateOwnDataAccess,
  validateHomeworkSubmission
};