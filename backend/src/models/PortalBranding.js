/**
 * Portal Branding Model
 * MongoDB schema for the STAFF LOGIN PAGE branding (logo + heading + sub heading)
 *
 * IMPORTANT: This is a SINGLETON collection (one document only, key = 'default').
 * The login page is a public page, so the branding is global (not per-school).
 * Only the Super Admin can edit it via /api/portal-branding.
 */

const mongoose = require('mongoose');

const PortalBrandingSchema = new mongoose.Schema({
  // Singleton key - always 'default'. Never changed after creation.
  key: {
    type: String,
    default: 'default',
    unique: true,
    immutable: true
  },

  // Uploaded logo path (e.g. /uploads/images/<uuid>.png)
  // Empty string means "use the built-in default logo shipped with the app"
  logoUrl: {
    type: String,
    trim: true,
    default: ''
  },

  // Toggle to hide the logo block completely on the login page
  showLogo: {
    type: Boolean,
    default: true
  },

  // Big heading (e.g. "STAFF PORTAL"). Empty string means "do not render"
  heading: {
    type: String,
    trim: true,
    default: 'STAFF PORTAL',
    maxlength: [120, 'Heading cannot exceed 120 characters']
  },

  // Sub heading (e.g. "Class, Admin and Super Admin login"). Empty = do not render
  subHeading: {
    type: String,
    trim: true,
    default: 'Class, Admin and Super Admin login',
    maxlength: [200, 'Sub heading cannot exceed 200 characters']
  },

  // ==========================================================
  // MOBILE (STUDENT) LOGIN PAGE - separate overrides
  // Empty string => the mobile page INHERITS the staff value above.
  // So by default both login pages look identical, and the Super Admin
  // can override / delete the mobile branding independently.
  // ==========================================================

  // Mobile logo path. Empty => inherit `logoUrl` (the staff logo)
  mobileLogoUrl: {
    type: String,
    trim: true,
    default: ''
  },

  // Mobile heading. Empty => inherit `heading`
  mobileHeading: {
    type: String,
    trim: true,
    default: '',
    maxlength: [120, 'Mobile heading cannot exceed 120 characters']
  },

  // Mobile sub heading. Empty => inherit `subHeading`
  mobileSubHeading: {
    type: String,
    trim: true,
    default: '',
    maxlength: [200, 'Mobile sub heading cannot exceed 200 characters']
  },

  // Toggle to hide the logo block on the MOBILE login page only
  showMobileLogo: {
    type: Boolean,
    default: true
  },

  // Who last changed it (Admin collection reference) - audit only
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Get the singleton branding document, creating it with schema defaults if missing.
 * Always returns a document (never null) so the login page always has data.
 *
 * NOTE: a plain findOne() is tried FIRST on purpose. Using findOneAndUpdate here
 * would bump the automatic `updatedAt` timestamp on every public GET request,
 * because Mongoose applies timestamps to findOneAndUpdate even for a no-op update.
 */
PortalBrandingSchema.statics.getSingleton = async function () {
  const existing = await this.findOne({ key: 'default' });
  if (existing) return existing;

  return this.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('PortalBranding', PortalBrandingSchema);
