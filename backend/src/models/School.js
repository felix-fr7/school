/**
 * School Model
 * MongoDB schema for schools/tenants in the multi-tenant system
 * Phase 2 Implementation
 */

const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    minlength: [2, 'School name must be at least 2 characters long'],
    maxlength: [200, 'School name cannot exceed 200 characters']
  },
  schoolCode: {
    type: String,
    required: [true, 'School code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [2, 'School code must be at least 2 characters long'],
    maxlength: [50, 'School code cannot exceed 50 characters']
  },
  address: {
    type: String,
    required: [true, 'School address is required'],
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  contactEmail: {
    type: String,
    required: [true, 'Contact email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    trim: true,
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
  },
  status: {
    type: String,
    enum: {
      values: ['Active', 'Suspended', 'Trial'],
      message: 'Status must be either Active, Suspended, or Trial'
    },
    default: 'Active'
  },
  subscriptionExpiry: {
    type: Date
  },
  settings: {
    academicYear: String,
    timezone: String,
    language: String,
    currency: String,
    dateFormat: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
// Note: schoolCode already has unique index via schema option
SchoolSchema.index({ status: 1 });
SchoolSchema.index({ contactEmail: 1 });

// Virtual for user count
SchoolSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'schoolId',
  count: true
});

// Note: schoolCode is automatically uppercased via schema option `uppercase: true`

// Method to check if subscription is active
SchoolSchema.methods.isSubscriptionActive = function() {
  if (this.status === 'Suspended') {
    return false;
  }
  if (this.subscriptionExpiry) {
    return new Date() <= this.subscriptionExpiry;
  }
  return true; // No expiry date means active
};

// Static method to find active schools
SchoolSchema.statics.findActive = function() {
  return this.find({ status: 'Active' });
};

// Static method to find schools with expiring subscriptions
SchoolSchema.statics.findExpiringSoon = function(days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return this.find({
    status: 'Active',
    subscriptionExpiry: {
      $lte: expiryDate,
      $gte: new Date()
    }
  });
};

module.exports = mongoose.model('School', SchoolSchema);