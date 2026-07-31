/**
 * Super Admin Routes
 * Handles school registration, tenant management, and system-wide operations
 * Phase 5 Implementation
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { param } = require('express-validator');

const {
  registerSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  updateSchoolStatus,
  deleteSchool,
  getSystemStats
} = require('../controllers/superAdminController');

const { authenticate } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/rbacMiddleware');

// All routes require Super Admin authentication
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/super-admin/stats
 * @desc    Get system-wide statistics (schools, users by role)
 * @access  Super Admin
 */
router.get('/stats', getSystemStats);

/**
 * @route   POST /api/super-admin/schools
 * @desc    Register a new school with its admin account
 * @body    { schoolName, schoolCode, address, contactEmail, contactPhone, subscriptionExpiry?, adminName, adminEmail, adminPassword, adminPhone? }
 * @access  Super Admin
 */
router.post('/schools', registerSchool);

/**
 * @route   GET /api/super-admin/schools
 * @desc    Get all schools with pagination and filtering
 * @query   page, limit, search, status, sortBy, sortOrder
 * @access  Super Admin
 */
router.get('/schools', getAllSchools);

/**
 * @route   GET /api/super-admin/schools/:id
 * @desc    Get single school by ID with user statistics
 * @params  id (school ID - MongoDB ObjectId)
 * @access  Super Admin
 */
router.get(
  '/schools/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid school ID format')
  ],
  getSchoolById
);

/**
 * @route   PUT /api/super-admin/schools/:id
 * @desc    Update school information
 * @params  id (school ID - MongoDB ObjectId)
 * @body    Any school fields to update
 * @access  Super Admin
 */
router.put(
  '/schools/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid school ID format')
  ],
  updateSchool
);

/**
 * @route   PATCH /api/super-admin/schools/:id/status
 * @desc    Update school status (Active, Suspended, Trial)
 * @params  id (school ID - MongoDB ObjectId)
 * @body    { status: 'Active' | 'Suspended' | 'Trial' }
 * @access  Super Admin
 */
router.patch(
  '/schools/:id/status',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid school ID format')
  ],
  updateSchoolStatus
);

/**
 * @route   DELETE /api/super-admin/schools/:id
 * @desc    Delete a school and all associated users
 * @params  id (school ID - MongoDB ObjectId)
 * @access  Super Admin
 */
router.delete(
  '/schools/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid school ID format')
  ],
  deleteSchool
);

module.exports = router;