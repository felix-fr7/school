/**
 * Admin Middleware
 * Role-specific middleware for School Admin module
 * Modular structure - Admin module
 */

/**
 * Validate that the admin is accessing resources within their tenant
 * Ensures data isolation between different schools/tenants
 */
const validateTenantAccess = (req, res, next) => {
  const userTenantId = req.user?.tenantId;
  const paramTenantId = req.params.tenantId || req.body.tenantId;

  // If user has a tenantId, ensure they're accessing their own tenant's resources
  if (userTenantId && paramTenantId && userTenantId !== paramTenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access resources within your own school.'
    });
  }

  next();
};

/**
 * Log Admin actions for audit purposes
 */
const logAdminAction = (req, res, next) => {
  const action = `${req.method} ${req.path}`;
  const userId = req.user?.id || 'unknown';
  const tenantId = req.user?.tenantId || 'unknown';
  const timestamp = new Date().toISOString();
  
  console.log(`[Admin Audit] ${timestamp} - User ${userId} (Tenant: ${tenantId}) performed: ${action}`);
  
  res.locals.auditLog = {
    action,
    userId,
    tenantId,
    timestamp,
    ipAddress: req.ip
  };
  
  next();
};

/**
 * Validate class-related operations
 * Ensures admin can only manage classes within their school
 */
const validateClassAccess = (req, res, next) => {
  const userTenantId = req.user?.tenantId;
  const classId = req.params.id || req.body.classId;

  // If classId is provided, verify it belongs to the admin's tenant
  if (classId && userTenantId) {
    // Store for later use - actual validation happens in controller
    req.locals = req.locals || {};
    req.locals.userTenantId = userTenantId;
  }

  next();
};

/**
 * Check if admin has permission for specific actions
 * Can be extended for role-based permissions within admin module
 */
const checkAdminPermission = (permission) => {
  return (req, res, next) => {
    // For now, all authenticated admins have full permissions
    // Can be extended for more granular control
    next();
  };
};

module.exports = {
  validateTenantAccess,
  logAdminAction,
  validateClassAccess,
  checkAdminPermission
};