/**
 * Calendar Event Model
 * School events, holidays, exams, and important dates
 */

const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  endDate: {
    type: Date
  },
  eventType: {
    type: String,
    enum: ['Holiday', 'Exam', 'Event', 'Meeting', 'Deadline', 'Function', 'Trip', 'Other'],
    default: 'Event'
  },
  color: {
    type: String,
    default: '#4F46E5'
  },
  // Multi-tenant support
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  // Target audience
  visibility: {
    type: String,
    enum: ['school-wide', 'class-specific', 'grade-specific'],
    default: 'school-wide'
  },
  // For class-specific events
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  // For grade-specific events (e.g., all Class 10)
  className: {
    type: String
  },
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  // Recurring event support
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null
  },
  // Additional details
  location: {
    type: String,
    trim: true
  },
  startTime: {
    type: String  // Format: "HH:MM"
  },
  endTime: {
    type: String  // Format: "HH:MM"
  },
  // Attachments
  attachments: [{
    url: String,
    name: String,
    type: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
CalendarEventSchema.index({ schoolId: 1, date: 1 });
CalendarEventSchema.index({ schoolId: 1, isPublished: 1, date: 1 });
CalendarEventSchema.index({ classId: 1, date: 1 });

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);