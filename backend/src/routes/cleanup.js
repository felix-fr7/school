/**
 * Cleanup Routes
 * Production-safe cleanup operations for multi-tenant data purging
 * 
 * All routes require SUPER_ADMIN role authentication
 * 
 * Endpoints:
 *   GET    /api/cleanup/stats    - Preview cleanup impact (dry-run analysis)
 *   POST   /api/cleanup/execute  - Execute cleanup (DESTRUCTIVE)
 *   GET    /api/cleanup/verify   - Verify system integrity
 */

const express = require('express');
const router = express.Router();

const { authenticate, isSuperAdmin } = require('../middleware/auth');
const {
  getCleanupStats,
  executeCleanup,
  verifySystemIntegrity,
} = require('../controllers/cleanupController');

// All cleanup routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(isSuperAdmin);

/**
 * @route   GET /api/cleanup/stats
 * @desc    Get preview of cleanup impact (dry-run analysis)
 * @access  SuperAdmin only
 * 
 * Returns:
 *   - Count of records that would be deleted per table
 *   - Total records affected
 *   - Safeguard verification (SuperAdmin exists, Platform tenant exists)
 *   - Ready status (can cleanup proceed safely)
 */
router.get('/stats', getCleanupStats);

/**
 * @route   POST /api/cleanup/execute
 * @desc    Execute cleanup of all non-superadmin data
 * @access  SuperAdmin only
 * 
 * WARNING: This is a DESTRUCTIVE operation that cannot be undone!
 * 
 * The cleanup will:
 *   1. Delete all non-superadmin users
 *   2. Delete all non-platform tenants
 *   3. Delete all classes, homework, marks, attendance, fees
 *   4. Delete all news, circulars, exam schedules, posts, weekly lesson logs
 *   5. Preserve SuperAdmin account and platform tenant
 * 
 * Returns:
 *   - Detailed deletion statistics
 *   - Verification results
 *   - Duration of operation
 */
router.post('/execute', executeCleanup);

/**
 * @route   GET /api/cleanup/verify
 * @desc    Verify SuperAdmin system integrity
 * @access  SuperAdmin only
 * 
 * Checks:
 *   - SuperAdmin user exists and is accessible
 *   - Platform tenant exists
 *   - No orphaned records remain
 *   - Row Level Security is enabled on all tables
 * 
 * Returns:
 *   - Detailed check results
 *   - Pass/fail status for each check
 *   - Overall system integrity status
 */
router.get('/verify', verifySystemIntegrity);

module.exports = router;