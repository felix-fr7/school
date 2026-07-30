/**
 * SuperAdmin Routes
 * Routes accessible only by SUPER_ADMIN role
 * Handles tenant management operations
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate, isSuperAdmin } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

// Import controller
const superadminController = require('../controllers/superadmin.controller');

// All routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(isSuperAdmin);

/**
 * @route   GET /api/superadmin/stats
 * @desc    Get overall system statistics
 * @access  SUPER_ADMIN
 */
router.get('/stats', superadminController.getSuperAdminStats);

/**
 * @route   POST /api/superadmin/tenants
 * @desc    Create a new tenant
 * @access  SUPER_ADMIN
 * @body    { name, domain_slug, subscription_plan?, max_users?, max_students?, settings? }
 */
router.post('/tenants', superadminController.createTenant);

/**
 * @route   GET /api/superadmin/tenants
 * @desc    Get all tenants with pagination and filtering
 * @access  SUPER_ADMIN
 * @query   page, limit, status, subscription_plan, search
 */
router.get('/tenants', superadminController.getAllTenants);

/**
 * @route   GET /api/superadmin/tenants/:id
 * @desc    Get single tenant by ID with stats
 * @access  SUPER_ADMIN
 */
router.get('/tenants/:id', superadminController.getTenantById);

/**
 * @route   PATCH /api/superadmin/tenants/:id
 * @desc    Update tenant details
 * @access  SUPER_ADMIN
 * @body    { name?, domain_slug?, subscription_plan?, max_users?, max_students?, settings? }
 */
router.patch('/tenants/:id', superadminController.updateTenant);

/**
 * @route   PATCH /api/superadmin/tenants/:id/status
 * @desc    Update tenant status (suspend/activate)
 * @access  SUPER_ADMIN
 * @body    { status: 'ACTIVE' | 'SUSPENDED' }
 */
router.patch('/tenants/:id/status', superadminController.updateTenantStatus);

/**
 * @route   DELETE /api/superadmin/tenants/:id
 * @desc    Delete tenant (soft delete)
 * @access  SUPER_ADMIN
 */
router.delete('/tenants/:id', superadminController.deleteTenant);

module.exports = router;