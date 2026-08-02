/**
 * Exam Model
 * MongoDB schema for exams and exam schedules
 */

const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['UNIT_TEST', 'HALF_YEARLY', 'ANNUAL', 'QUIZ', 'OTHER'],
    default: 'OTHER'
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false,
    default: null,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  academicYear: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
ExamSchema.index({ classId: 1, startDate: -1 });
ExamSchema.index({ tenantId: 1, isPublished: 1 });

// Virtual for class
ExamSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Virtual for exam schedules
ExamSchema.virtual('schedules', {
  ref: 'ExamSchedule',
  localField: '_id',
  foreignField: 'examId'
});

module.exports = mongoose.model('Exam', ExamSchema);