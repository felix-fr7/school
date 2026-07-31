/**
 * SchoolContact Model
 * MongoDB schema for school contacts
 */

const mongoose = require('mongoose');

const SchoolContactSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
SchoolContactSchema.index({ tenantId: 1, department: 1 });
SchoolContactSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('SchoolContact', SchoolContactSchema);