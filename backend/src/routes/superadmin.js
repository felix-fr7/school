/**
 * Super Admin Routes
 * Handles super admin specific operations including telemetry and system configuration
 */

const express = require('express');
const { body } = require('express-validator');
const telemetryController = require('../controllers/telemetryController');
const { protect, requireSuperAdmin } = require('../middleware/auth');
const { maintenanceGuard, rateLimiter } = require('../middleware/maintenanceGuard');

const router = express.Router();

// Apply rate limiting to all superadmin routes
router.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 200 }));

// All routes require Super Admin role
router.use(protect);
router.use(requireSuperAdmin);

// Apply maintenance guard (allows super admins through even during maintenance)
router.use(maintenanceGuard);

/**
 * @route   GET /api/superadmin/db-latency
 * @desc    Get real-time database pool latency
 * @access  Super Admin
 * @returns {Object} { success, data: { latency, status, timestamp, thresholds } }
 */
router.get('/db-latency', telemetryController.getDbLatency);

/**
 * @route   GET /api/superadmin/system-health
 * @desc    Get comprehensive system health overview
 * @access  Super Admin
 * @returns {Object} { success, data: { overallHealth, database, server, config, timestamp } }
 */
router.get('/system-health', telemetryController.getSystemHealth);

/**
 * @route   GET /api/superadmin/system-config
 * @desc    Get current system configuration state
 * @access  Super Admin
 * @returns {Object} { success, data: { config, lastUpdated } }
 */
router.get('/system-config', telemetryController.getSystemConfig);

/**
 * @route   POST /api/superadmin/toggle-config
 * @desc    Update a system configuration toggle
 * @access  Super Admin
 * @body    { toggleName: string, value: boolean }
 * @returns {Object} { success, data: { toggleName, previousValue, newValue, config, timestamp }, message }
 */
router.post(
  '/toggle-config',
  [
    body('toggleName')
      .trim()
      .notEmpty()
      .withMessage('Toggle name is required')
      .isIn(['rateLimiting', 'autoBackup', 'auditLogs'])
      .withMessage('Invalid toggle name. Valid toggles: rateLimiting, autoBackup, auditLogs'),
    body('value')
      .isBoolean()
      .withMessage('Value must be a boolean (true/false)'),
  ],
  telemetryController.toggleSystemConfig
);

module.exports = router;