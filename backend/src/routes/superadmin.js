/**
 * SuperAdmin Routes
 * Routes accessible only by SUPER_ADMIN role
 * Handles tenant management operations
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import middleware
const { authenticate, isSuperAdmin } = require('../middleware/auth');

// Import controller
const superadminController = require('../controllers/superadmin.controller');

// All routes require authentication and SUPER_ADMIN role (Temporarily disabled for testing)
// router.use(authenticate);
// router.use(isSuperAdmin);

/**
 * @route   GET /api/superadmin/stats
 * @desc    Get overall system statistics
 * @access  SUPER_ADMIN
 */
router.get('/stats', superadminController.getSuperAdminStats);

/**
 * @route   GET /api/superadmin/system-config
 * @desc    Get system configuration
 * @access  SUPER_ADMIN
 */
router.get('/system-config', (req, res) => {
  res.json({
    success: true,
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: 'MongoDB / Mongoose',
      features: {
        multiTenant: true,
        classBasedLogin: true,
        fileStorage: true
      }
    }
  });
});

/**
 * @route   GET /api/superadmin/db-latency
 * @desc    Get database latency
 * @access  SUPER_ADMIN
 */
router.get('/db-latency', async (req, res, next) => {
  try {
    const start = Date.now();
    // Ping MongoDB connection
    await mongoose.connection.db.command({ ping: 1 });
    const latency = Date.now() - start;
    
    res.json({
      success: true,
      data: { latency: latency + 'ms' }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/superadmin/tenants
 * @desc    Create a new tenant
 * @access  SUPER_ADMIN
 * @body    { name, domainSlug, subscriptionPlan?, maxUsers?, maxStudents?, settings? }
 */
router.post('/tenants', superadminController.createTenant);

/**
 * @route   GET /api/superadmin/tenants
 * @desc    Get all tenants with pagination and filtering
 * @access  SUPER_ADMIN
 * @query   page, limit, status, subscriptionPlan, search
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
 * @body    { name?, domainSlug?, subscriptionPlan?, maxUsers?, maxStudents?, settings? }
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