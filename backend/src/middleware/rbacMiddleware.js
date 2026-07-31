/**
 * Role-Based Access Control (RBAC) & Multi-Tenancy Middleware
 * Restricts access based on user roles and ensures data isolation by school
 * Phase 4 Implementation
 */

/**
 * Role-Based Access Control Middleware
 * Restricts access to routes based on user roles
 * 
 * Usage: verifyRole(['Super Admin', 'School Admin'])
 * 
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const verifyRole = (allowedRoles) => {
  // Validate allowedRoles is an array and not empty
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('allowedRoles must be a non-empty array of role strings');
  }

  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required.',
            code: 'AUTH_REQUIRED'
          }
        });
      }

      // Normalize user role and allowed roles to handle both 'SUPER_ADMIN' and 'Super Admin'
      const userRoleRaw = req.user.role || '';
      const userRoleNormalized = userRoleRaw.replace(/_/g, ' ').toUpperCase();
      const allowedNormalized = allowedRoles.map(r => r.replace(/_/g, ' ').toUpperCase());

      // Check if user's role is in the allowed roles
      const isAllowed = allowedRoles.includes(userRoleRaw) || allowedNormalized.includes(userRoleNormalized);

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions. This action requires one of the following roles: ' + allowedRoles.join(', '),
            code: 'FORBIDDEN',
            requiredRoles: allowedRoles,
            userRole: req.user.role
          }
        });
      }

      // Role is valid, proceed to next middleware
      next();
    } catch (error) {
      console.error('RBAC Error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error during authorization.',
          code: 'RBAC_ERROR'
        }
      });
    }
  };
};

/**
 * Multi-Tenancy Data Isolation Middleware
 * Ensures users (except Super Admin) can only access resources belonging to their school
 * 
 * Usage: enforceSchoolIsolation('schoolId') or enforceSchoolIsolation(['schoolId', 'tenantId'])
 * 
 * @param {string|string[]} schoolIdField - Field name(s) in request params/body that contain school ID
 * @returns {Function} Express middleware function
 */
const enforceSchoolIsolation = (schoolIdField = 'schoolId') => {
  const fields = Array.isArray(schoolIdField) ? schoolIdField : [schoolIdField];

  return (req, res, next) => {
    try {
      // Normalize role check for Super Admin
      const userRole = req.user.role || '';
      const isSuperAdmin = userRole === 'Super Admin' || userRole === 'SUPER_ADMIN' || userRole.replace(/_/g, ' ').toUpperCase() === 'SUPER ADMIN';

      // Super Admin can access all schools
      if (isSuperAdmin) {
        return next();
      }

      // For all other roles, schoolId is required
      if (!req.user.schoolId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. User is not associated with any school.',
            code: 'NO_SCHOOL_ASSOCIATION'
          }
        });
      }

      // Check if any of the specified fields contain a school ID
      let requestedSchoolId = null;
      
      for (const field of fields) {
        // Check in params (URL parameters)
        if (req.params && req.params[field]) {
          requestedSchoolId = req.params[field];
          break;
        }
        
        // Check in body
        if (req.body && req.body[field]) {
          requestedSchoolId = req.body[field];
          break;
        }
        
        // Check in query parameters
        if (req.query && req.query[field]) {
          requestedSchoolId = req.query[field];
          break;
        }
      }

      // If no school ID found in request, allow to proceed
      if (!requestedSchoolId) {
        return next();
      }

      // Compare requested school ID with user's school ID
      if (requestedSchoolId !== req.user.schoolId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only access resources belonging to your school.',
            code: 'SCHOOL_MISMATCH',
            userSchoolId: req.user.schoolId,
            requestedSchoolId: requestedSchoolId
          }
        });
      }

      // School ID matches, proceed
      next();
    } catch (error) {
      console.error('School Isolation Error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error during school isolation check.',
          code: 'ISOLATION_ERROR'
        }
      });
    }
  };
};

/**
 * School Context Middleware
 * Automatically adds user's schoolId to request query for multi-tenant filtering
 * This is useful for GET requests where the schoolId should be automatically filtered
 * 
 * Usage: addSchoolContext()
 * 
 * @returns {Function} Express middleware function
 */
const addSchoolContext = () => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role || '';
      const isSuperAdmin = userRole === 'Super Admin' || userRole === 'SUPER_ADMIN' || userRole.replace(/_/g, ' ').toUpperCase() === 'SUPER ADMIN';

      // Super Admin doesn't need school context
      if (isSuperAdmin) {
        return next();
      }

      // Add schoolId to query if not already present
      if (req.user.schoolId && !req.query.schoolId) {
        req.query.schoolId = req.user.schoolId;
      }

      next();
    } catch (error) {
      console.error('School Context Error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error adding school context.',
          code: 'CONTEXT_ERROR'
        }
      });
    }
  };
};

/**
 * Predefined Role Checkers
 * Convenience middleware for common role checks
 */
const requireSuperAdmin = verifyRole(['Super Admin', 'SUPER_ADMIN']);
const requireSchoolAdmin = verifyRole(['School Admin', 'SCHOOL_ADMIN']);
const requireTeacher = verifyRole(['Teacher', 'TEACHER']);
const requireStudent = verifyRole(['Student', 'STUDENT']);
const requireParent = verifyRole(['Parent', 'PARENT']);

// Combined role checkers
const requireAdmin = verifyRole(['Super Admin', 'SUPER_ADMIN', 'School Admin', 'SCHOOL_ADMIN']);
const requireStaff = verifyRole(['Super Admin', 'SUPER_ADMIN', 'School Admin', 'SCHOOL_ADMIN', 'Teacher', 'TEACHER']);
const requireAnyRole = (...roles) => verifyRole(roles);

module.exports = {
  verifyRole,
  enforceSchoolIsolation,
  addSchoolContext,
  // Predefined role checkers
  requireSuperAdmin,
  requireSchoolAdmin,
  requireTeacher,
  requireStudent,
  requireParent,
  requireAdmin,
  requireStaff,
  requireAnyRole
};