/**
 * Tenant (School) Routes
 * Handles school/tenant CRUD operations - Super Admin only
 */

const express = require('express');
const { body, param } = require('express-validator');
const tenantController = require('../controllers/tenantController');
const { protect, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require Super Admin role
router.use(protect);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/tenants
 * @desc    Get all tenants (schools)
 * @access  Super Admin
 * @query   page, limit, search, isActive
 */
router.get('/', tenantController.getAllTenants);

/**
 * @route   GET /api/tenants/:id
 * @desc    Get single tenant by ID
 * @access  Super Admin
 * @params  id (UUID)
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid tenant ID format'),
  ],
  tenantController.getTenantById
);

/**
 * @route   POST /api/tenants
 * @desc    Create a new tenant (school) with admin credentials
 * @access  Super Admin
 * @body    { name, code, address, phone, email, adminEmail, adminPassword, adminName }
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
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant information
 * @access  Super Admin
 * @params  id (UUID)
 * @body    { name, address, phone, email, isActive }
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid tenant ID format'),
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
 * @desc    Delete a tenant (soft delete by setting isActive = false)
 * @access  Super Admin
 * @params  id (UUID)
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid tenant ID format'),
  ],
  tenantController.deleteTenant
);

/**
 * @route   GET /api/tenants/:id/stats
 * @desc    Get tenant statistics (students count, classes count, etc.)
 * @access  Super Admin
 * @params  id (UUID)
 */
router.get(
  '/:id/stats',
  [
    param('id').isUUID().withMessage('Invalid tenant ID format'),
  ],
  tenantController.getTenantStats
);

module.exports = router;