/**
 * Portal Branding Controller
 * Handles the staff login page branding: logo, heading and sub heading.
 *
 * Endpoints:
 *   GET    /api/portal-branding          -> Public (login page reads this)
 *   PUT    /api/portal-branding          -> Super Admin: update heading / subHeading / showLogo
 *   PUT    /api/portal-branding/logo     -> Super Admin: upload or replace the logo
 *   DELETE /api/portal-branding/logo     -> Super Admin: delete the uploaded logo
 *   POST   /api/portal-branding/reset    -> Super Admin: restore factory defaults
 *
 * Vera logic mathala - existing school branding flow-ve untouched.
 */

const PortalBranding = require('../models/PortalBranding');
const { deleteFile, resolveFileUrl } = require('../middleware/fileUpload');

// Factory defaults (single source of truth = the schema defaults)
const getDefaults = () => ({
  logoUrl: PortalBranding.schema.path('logoUrl').defaultValue || '',
  showLogo: PortalBranding.schema.path('showLogo').defaultValue !== false,
  heading: PortalBranding.schema.path('heading').defaultValue || '',
  subHeading: PortalBranding.schema.path('subHeading').defaultValue || '',
  mobileLogoUrl: '',
  mobileHeading: '',
  mobileSubHeading: '',
  showMobileLogo: PortalBranding.schema.path('showMobileLogo').defaultValue !== false,
});

/**
 * Shape a branding document for the API response.
 * Empty strings are converted to null so the frontend can hide the element.
 */
const toPublic = (doc) => ({
  logoUrl: doc?.logoUrl || null,
  showLogo: doc?.showLogo !== false,
  heading: doc?.heading || null,
  subHeading: doc?.subHeading || null,
  // Mobile overrides (null = inherit the staff value)
  mobileLogoUrl: doc?.mobileLogoUrl || null,
  mobileHeading: doc?.mobileHeading || null,
  mobileSubHeading: doc?.mobileSubHeading || null,
  showMobileLogo: doc?.showMobileLogo !== false,
  updatedAt: doc?.updatedAt || null,
});

/** Best-effort delete of an uploaded file (never blocks the DB operation). */
const removeUploadedFile = async (fileUrl) => {
  if (!fileUrl) return false;
  try {
    await deleteFile(fileUrl);
    console.log(`[Portal Branding] Deleted uploaded logo: ${fileUrl}`);
    return true;
  } catch (error) {
    console.error('[Portal Branding] Failed to delete uploaded logo:', error.message);
    return false;
  }
};

/**
 * Get the login page branding (PUBLIC - no authentication required)
 * GET /api/portal-branding
 */
const getPortalBranding = async (req, res, next) => {
  try {
    const branding = await PortalBranding.getSingleton();
    res.status(200).json({
      success: true,
      data: toPublic(branding),
    });
  } catch (error) {
    console.error('[Portal Branding] Get Error:', error.message);
    next(error);
  }
};


/**
 * Update heading / sub heading / logo visibility
 * PUT /api/portal-branding
 */
const updatePortalBranding = async (req, res, next) => {
  try {
    const {
      heading,
      subHeading,
      showLogo,
      mobileHeading,
      mobileSubHeading,
      showMobileLogo,
    } = req.body || {};

    const nothingToDo =
      heading === undefined &&
      subHeading === undefined &&
      showLogo === undefined &&
      mobileHeading === undefined &&
      mobileSubHeading === undefined &&
      showMobileLogo === undefined;

    if (nothingToDo) {
      return res.status(400).json({
        success: false,
        error: { message: 'Nothing to update. Provide heading, subHeading or showLogo.' },
      });
    }

    // Ensure the singleton exists
    const current = await PortalBranding.getSingleton();

    const update = {};

    // Text field with a shared validator
    const applyText = (raw, field, max, label) => {
      const value = String(raw).trim();
      if (value.length > max) {
        return { error: `${label} cannot exceed ${max} characters` };
      }
      update[field] = value;
      return null;
    };

    if (heading !== undefined) {
      const err = applyText(heading, 'heading', 120, 'Heading');
      if (err) return res.status(400).json({ success: false, error: { message: err.error } });
    }

    if (subHeading !== undefined) {
      const err = applyText(subHeading, 'subHeading', 200, 'Sub heading');
      if (err) return res.status(400).json({ success: false, error: { message: err.error } });
    }

    if (showLogo !== undefined) {
      update.showLogo = showLogo === true || showLogo === 'true';
    }

    // ---- Mobile (student) login page overrides ----
    // Empty string here means "inherit the staff value".
    if (mobileHeading !== undefined) {
      const err = applyText(mobileHeading, 'mobileHeading', 120, 'Mobile heading');
      if (err) return res.status(400).json({ success: false, error: { message: err.error } });
    }

    if (mobileSubHeading !== undefined) {
      const err = applyText(mobileSubHeading, 'mobileSubHeading', 200, 'Mobile sub heading');
      if (err) return res.status(400).json({ success: false, error: { message: err.error } });
    }

    if (showMobileLogo !== undefined) {
      update.showMobileLogo = showMobileLogo === true || showMobileLogo === 'true';
    }

    update.updatedBy = req.user?.id || current.updatedBy;

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      { $set: update },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: toPublic(branding),
      message: 'Login page branding updated successfully',
    });
  } catch (error) {
    console.error('[Portal Branding] Update Error:', error.message);
    next(error);
  }
};

/**
 * Upload / replace the login page logo
 * PUT /api/portal-branding/logo  (multipart/form-data, field: "logo")
 */
const uploadPortalLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please select a logo image file to upload.' },
      });
    }

    const current = await PortalBranding.getSingleton();
    const oldLogoUrl = current.logoUrl;

    const logoUrl = resolveFileUrl(req.file, 'images');

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      { $set: { logoUrl, showLogo: true, updatedBy: req.user?.id || current.updatedBy } },
      { new: true }
    );

    // Remove the previous uploaded file (best effort)
    if (oldLogoUrl) {
      await removeUploadedFile(oldLogoUrl);
    }

    res.status(200).json({
      success: true,
      data: toPublic(branding),
      message: 'Login page logo uploaded successfully',
    });
  } catch (error) {
    console.error('[Portal Branding] Upload Logo Error:', error.message);
    next(error);
  }
};


/**
 * Delete the uploaded login page logo (falls back to the built-in default logo)
 * DELETE /api/portal-branding/logo
 */
const deletePortalLogo = async (req, res, next) => {
  try {
    const current = await PortalBranding.getSingleton();
    const oldLogoUrl = current.logoUrl;

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      { $set: { logoUrl: '', updatedBy: req.user?.id || current.updatedBy } },
      { new: true }
    );

    let fileDeleted = false;
    if (oldLogoUrl) {
      fileDeleted = await removeUploadedFile(oldLogoUrl);
    }

    res.status(200).json({
      success: true,
      data: { ...toPublic(branding), fileDeleted },
      message: 'Login page logo deleted successfully',
    });
  } catch (error) {
    console.error('[Portal Branding] Delete Logo Error:', error.message);
    next(error);
  }
};

/**
 * Upload / replace the MOBILE (student) login page logo
 * PUT /api/portal-branding/mobile-logo  (multipart/form-data, field: "logo")
 */
const uploadMobilePortalLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please select a logo image file to upload.' },
      });
    }

    const current = await PortalBranding.getSingleton();
    const oldLogoUrl = current.mobileLogoUrl;

    const logoUrl = resolveFileUrl(req.file, 'images');

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          mobileLogoUrl: logoUrl,
          showMobileLogo: true,
          updatedBy: req.user?.id || current.updatedBy,
        },
      },
      { new: true }
    );

    if (oldLogoUrl) {
      await removeUploadedFile(oldLogoUrl);
    }

    res.status(200).json({
      success: true,
      data: toPublic(branding),
      message: 'Mobile login page logo uploaded successfully',
    });
  } catch (error) {
    console.error('[Portal Branding] Upload Mobile Logo Error:', error.message);
    next(error);
  }
};

/**
 * Delete the MOBILE login page logo
 * (the mobile page then falls back to the staff logo)
 * DELETE /api/portal-branding/mobile-logo
 */
const deleteMobilePortalLogo = async (req, res, next) => {
  try {
    const current = await PortalBranding.getSingleton();
    const oldLogoUrl = current.mobileLogoUrl;

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      { $set: { mobileLogoUrl: '', updatedBy: req.user?.id || current.updatedBy } },
      { new: true }
    );

    let fileDeleted = false;
    if (oldLogoUrl) {
      fileDeleted = await removeUploadedFile(oldLogoUrl);
    }

    res.status(200).json({
      success: true,
      data: { ...toPublic(branding), fileDeleted },
      message: 'Mobile login page logo deleted successfully',
    });
  } catch (error) {
    console.error('[Portal Branding] Delete Mobile Logo Error:', error.message);
    next(error);
  }
};

/**
 * DELETE all mobile-specific branding (logo + heading + sub heading + toggle).
 * The mobile login page then falls back to the staff branding.
 * DELETE /api/portal-branding/mobile
 */
const deleteMobilePortalBranding = async (req, res, next) => {
  try {
    const current = await PortalBranding.getSingleton();
    const oldLogoUrl = current.mobileLogoUrl;

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          mobileLogoUrl: '',
          mobileHeading: '',
          mobileSubHeading: '',
          showMobileLogo: true,
          updatedBy: req.user?.id || current.updatedBy,
        },
      },
      { new: true }
    );

    let fileDeleted = false;
    if (oldLogoUrl) {
      fileDeleted = await removeUploadedFile(oldLogoUrl);
    }

    res.status(200).json({
      success: true,
      data: { ...toPublic(branding), fileDeleted },
      message:
        'Mobile login page branding deleted. The mobile page now uses the staff branding.',
    });
  } catch (error) {
    console.error('[Portal Branding] Delete Mobile Branding Error:', error.message);
    next(error);
  }
};

/**
 * Restore factory defaults for the login page branding
 * POST /api/portal-branding/reset
 */
const resetPortalBranding = async (req, res, next) => {
  try {
    const current = await PortalBranding.getSingleton();
    const oldLogoUrl = current.logoUrl;
    const oldMobileLogoUrl = current.mobileLogoUrl;

    const branding = await PortalBranding.findOneAndUpdate(
      { key: 'default' },
      { $set: { ...getDefaults(), updatedBy: req.user?.id || current.updatedBy } },
      { new: true }
    );

    if (oldLogoUrl) {
      await removeUploadedFile(oldLogoUrl);
    }
    // The mobile logo is a separate file, clear it too (unless both point to the same one)
    if (oldMobileLogoUrl && oldMobileLogoUrl !== oldLogoUrl) {
      await removeUploadedFile(oldMobileLogoUrl);
    }

    res.status(200).json({
      success: true,
      data: toPublic(branding),
      message: 'Login page branding restored to default values',
    });
  } catch (error) {
    console.error('[Portal Branding] Reset Error:', error.message);
    next(error);
  }
};

module.exports = {
  getPortalBranding,
  updatePortalBranding,
  uploadPortalLogo,
  deletePortalLogo,
  uploadMobilePortalLogo,
  deleteMobilePortalLogo,
  deleteMobilePortalBranding,
  resetPortalBranding,
};
