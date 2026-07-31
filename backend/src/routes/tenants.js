/**
 * Tenant (School) Routes
 * Handles school/tenant CRUD operations - Super Admin only
 * 
 * IMPORTANT: Static routes MUST be defined before dynamic parameter routes
 * to prevent "create" from being interpreted as an ID parameter
 * Using MongoDB/Mongoose
 */

const express = require('express');
const { body, param } = require('express-validator');
const tenantController = require('../controllers/tenantController');
const { authenticate, isSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require Super Admin role
router.use(authenticate);
router.use(isSuperAdmin);

/**
 * @route   GET /api/tenants
 * @desc    Get all tenants (schools)
 * @access  Super Admin
 * @query   page, limit, search
 */
router.get('/', tenantController.getAllTenants);

/**
 * @route   POST /api/tenants
 * @desc    Create a new tenant (school) with admin credentials
 * @access  Super Admin
 * @body    { name, code, address, phone, email, adminEmail, adminPassword, adminName }
 * 
 * NOTE: This POST route is defined BEFORE the /:id routes to prevent
 * "create" or other static paths from being interpreted as ID parameters
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('School name is required')
      .isLength({ max: 200 })
      .withMessage('School name must be less than 200 characters'),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('School code is required')
      .isLength({ max: 50 })
      .withMessage('School code must be less than 50 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('adminEmail')
      .isEmail()
      .withMessage('Admin email is required and must be valid')
      .normalizeEmail(),
    body('adminPassword')
      .isLength({ min: 6 })
      .withMessage('Admin password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Admin password must contain at least one number'),
    body('adminName')
      .trim()
      .notEmpty()
      .withMessage('Admin name is required')
      .isLength({ max: 100 })
      .withMessage('Admin name must be less than 100 characters'),
  ],
  tenantController.createTenant
);

/**
 * @route   GET /api/tenants/:id
 * @desc    Get single tenant by ID
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 * 
 * NOTE: Dynamic parameter routes MUST come after static routes
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
  ],
  tenantController.getTenantById
);

/**
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant information
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 * @body    { name, address, phone, email }
 */
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('School name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('School name must be less than 200 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
  ],
  tenantController.updateTenant
);

/**
 * @route   DELETE /api/tenants/:id
 * @desc    Delete a tenant (hard delete with cascade)
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 */
router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
  ],
  tenantController.deleteTenant
);

/**
 * @route   GET /api/tenants/:id/stats
 * @desc    Get tenant statistics (students count, classes count, etc.)
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 */
router.get(
  '/:id/stats',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
  ],
  tenantController.getTenantStats
);

module.exports = router;