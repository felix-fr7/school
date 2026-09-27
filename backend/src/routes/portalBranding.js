/**
 * Portal Branding Routes
 * Staff login page branding (logo + heading + sub heading).
 *
 * IMPORTANT:
 *  - GET /api/portal-branding is PUBLIC so the login page can read it before login.
 *  - Every other endpoint requires an authenticated SUPER_ADMIN.
 *
 * Vera logic mathala - existing routes-ve add pannathu mattum.
 */

const express = require('express');
const router = express.Router();

const { authenticate, isSuperAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');
const {
  getPortalBranding,
  updatePortalBranding,
  uploadPortalLogo,
  deletePortalLogo,
  uploadMobilePortalLogo,
  deleteMobilePortalLogo,
  deleteMobilePortalBranding,
  resetPortalBranding,
} = require('../controllers/portalBrandingController');

/**
 * @route   GET /api/portal-branding
 * @desc    Get the login page branding (logo, heading, sub heading)
 * @access  Public (no authentication - the login page needs it before login)
 */
router.get('/', getPortalBranding);

// Everything below this line requires an authenticated Super Admin
router.use(authenticate);
router.use(isSuperAdmin);

/**
 * @route   PUT /api/portal-branding
 * @desc    Update heading / sub heading / logo visibility
 * @access  Super Admin
 * @body    { heading?: string, subHeading?: string, showLogo?: boolean }
 */
router.put('/', updatePortalBranding);

/**
 * @route   PUT /api/portal-branding/logo
 * @desc    Upload or replace the login page logo
 * @access  Super Admin
 * @body    multipart/form-data with field "logo"
 */
router.put('/logo', uploadSingle('logo'), uploadPortalLogo);

/**
 * @route   DELETE /api/portal-branding/logo
 * @desc    Delete the uploaded login page logo
 * @access  Super Admin
 */
router.delete('/logo', deletePortalLogo);

/**
 * @route   POST /api/portal-branding/reset
 * @desc    Restore factory default branding
 * @access  Super Admin
 */
router.post('/reset', resetPortalBranding);

/**
 * @route   PUT /api/portal-branding/mobile-logo
 * @desc    Upload or replace the MOBILE (student) login page logo
 * @access  Super Admin
 * @body    multipart/form-data with field "logo"
 */
router.put('/mobile-logo', uploadSingle('logo'), uploadMobilePortalLogo);

/**
 * @route   DELETE /api/portal-branding/mobile-logo
 * @desc    Delete the mobile login page logo (falls back to the staff logo)
 * @access  Super Admin
 */
router.delete('/mobile-logo', deleteMobilePortalLogo);

/**
 * @route   DELETE /api/portal-branding/mobile
 * @desc    Delete ALL mobile branding (logo + heading + sub heading + toggle).
 *          The mobile login page then falls back to the staff branding.
 * @access  Super Admin
 */
router.delete('/mobile', deleteMobilePortalBranding);

module.exports = router;
