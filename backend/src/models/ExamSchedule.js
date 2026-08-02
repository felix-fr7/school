/**
 * ExamSchedule Model
 * MongoDB schema for exam schedules
 */

const mongoose = require('mongoose');

const ExamScheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 60 // minutes
  },
  roomNo: {
    type: String,
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
ExamScheduleSchema.index({ classId: 1, date: 1 });
ExamScheduleSchema.index({ tenantId: 1, isPublished: 1, date: 1 });

// Virtual for class
ExamScheduleSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Virtual for exam
ExamScheduleSchema.virtual('exam', {
  ref: 'Exam',
  localField: 'examId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('ExamSchedule', ExamScheduleSchema);