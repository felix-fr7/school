/**
 * Tenant Model
 * MongoDB schema for tenants (schools/organizations)
 */

const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domainSlug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  schoolLogoUrl: {
    type: String
  },
  subscriptionPlan: {
    type: String,
    enum: ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'],
    default: 'FREE'
  },
  maxUsers: {
    type: Number,
    default: 100
  },
  maxStudents: {
    type: Number,
    default: 1000
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'INACTIVE'],
    default: 'ACTIVE'
  },
  settings: {
    academicYear: String,
    timezone: String,
    language: String,
    currency: String,
    dateFormat: String,
    features: {
      multiTenant: { type: Boolean, default: true },
      classBasedLogin: { type: Boolean, default: true },
      fileStorage: { type: Boolean, default: true }
    }
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
TenantSchema.index({ domainSlug: 1, deletedAt: 1 });
TenantSchema.index({ status: 1 });

// Virtual for users count
TenantSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Virtual for classes count
TenantSchema.virtual('classCount', {
  ref: 'Class',
  localField: '_id',
  foreignField: 'tenantId',
  count: true
});

// Soft delete methods
TenantSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status = 'INACTIVE';
  return this.save();
};

TenantSchema.methods.restore = function() {
  this.deletedAt = undefined;
  this.status = 'ACTIVE';
  return this.save();
};

// Pre-find to exclude deleted tenants by default
TenantSchema.pre(/^find/, function() {
  this.where({ deletedAt: null });
});

module.exports = mongoose.model('Tenant', TenantSchema);