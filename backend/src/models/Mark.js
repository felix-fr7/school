/**
 * Mark Model
 * MongoDB schema for student marks/grades
 */

const mongoose = require('mongoose');

const MarkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  marksObtained: {
    type: Number,
    required: true,
    min: 0
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1
  },
  percentage: {
    type: Number,
    required: true
  },
  grade: {
    type: String,
    required: true,
    trim: true
  },
  examType: {
    type: String,
    enum: ['UNIT_TEST', 'HALF_YEARLY', 'ANNUAL', 'QUIZ', 'OTHER'],
    required: true
  },
  examDate: {
    type: Date,
    required: true
  },
  remarks: {
    type: String,
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
MarkSchema.index({ studentId: 1, examDate: -1 });
MarkSchema.index({ tenantId: 1, isPublished: 1 });

// Virtual for student
MarkSchema.virtual('student', {
  ref: 'User',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// Virtual for subject
MarkSchema.virtual('subjectDoc', {
  ref: 'Subject',
  localField: 'subjectId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Mark', MarkSchema);