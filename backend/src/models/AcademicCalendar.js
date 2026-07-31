/**
 * AcademicCalendar Model
 * MongoDB schema for academic calendar events
 */

const mongoose = require('mongoose');

const AcademicCalendarSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  eventType: {
    type: String,
    enum: ['holiday', 'exam', 'event', 'vacation', 'meeting', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null]
  },
  targetAudience: {
    type: String,
    enum: ['ALL', 'STUDENTS', 'TEACHERS', 'STAFF', 'PARENTS'],
    default: 'ALL'
  },
  color: {
    type: String,
    default: '#007AFF'
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
AcademicCalendarSchema.index({ tenantId: 1, startDate: 1 });
AcademicCalendarSchema.index({ tenantId: 1, isActive: 1, startDate: -1 });

module.exports = mongoose.model('AcademicCalendar', AcademicCalendarSchema);