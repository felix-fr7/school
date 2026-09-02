/**
 * Tenant (School) Routes
 * Handles school/tenant CRUD operations - Super Admin only
 * 
 * IMPORTANT: Static routes MUST be defined before dynamic parameter routes
 * to prevent "create" from being interpreted as an ID parameter
 * Using MongoDB/Mongoose
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const tenantController = require('../controllers/tenantController');
const { authenticate, isSuperAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: errors.array()[0].msg
      }
    });
  }
  next();
};

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
  uploadSingle('schoolLogo'),
  [
    body('schoolName')
      .trim()
      .notEmpty()
      .withMessage('School name is required')
      .isLength({ max: 200 })
      .withMessage('School name must be less than 200 characters'),
    body('schoolCode')
      .trim()
      .notEmpty()
      .withMessage('School code is required')
      .isLength({ max: 50 })
      .withMessage('School code must be less than 50 characters'),
    body('contactEmail')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('contactPhone')
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
  handleValidationErrors,
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
  handleValidationErrors,
  tenantController.getTenantById
);

/**
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant information
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 * @body    { schoolName, schoolCode, address, contactPhone, contactEmail }
 */
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
    body('schoolName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('School name cannot be empty')
      .isLength({ max: 200 })
      .withMessage('School name must be less than 200 characters'),
    body('schoolCode')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('School code cannot be empty')
      .isLength({ max: 50 })
      .withMessage('School code must be less than 50 characters'),
    body('contactEmail')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('contactPhone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number'),
    body('address')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Address cannot be empty'),
  ],
  handleValidationErrors,
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
  handleValidationErrors,
  tenantController.deleteTenant
);

/**
 * @route   PUT /api/tenants/:id/logo
 * @desc    Upload / replace the school logo
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 * @body    multipart/form-data field "schoolLogo"
 */
router.put(
  '/:id/logo',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
  ],
  handleValidationErrors,
  uploadSingle('schoolLogo'),
  tenantController.uploadSchoolLogo
);

/**
 * @route   DELETE /api/tenants/:id/logo
 * @desc    Delete the school logo
 * @access  Super Admin
 * @params  id (MongoDB ObjectId)
 */
router.delete(
  '/:id/logo',
  [
    param('id').isMongoId().withMessage('Invalid tenant ID format'),
  ],
  handleValidationErrors,
  tenantController.deleteSchoolLogo
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
  handleValidationErrors,
  tenantController.getTenantStats
);

module.exports = router;