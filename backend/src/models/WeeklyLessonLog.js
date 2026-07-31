/**
 * WeeklyLessonLog Model
 * MongoDB schema for weekly lesson logs
 */

const mongoose = require('mongoose');

const WeeklyLessonLogSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  lessonDate: {
    type: Date,
    required: true
  },
  classworkText: {
    type: String,
    required: true
  },
  homeworkText: {
    type: String,
    trim: true
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for unique lesson per class per subject per date (Fixed subject: 1)
WeeklyLessonLogSchema.index({ tenantId: 1, classId: 1, subject: 1, lessonDate: 1 }, { unique: true });
WeeklyLessonLogSchema.index({ classId: 1, lessonDate: -1 });

// Virtual for class
WeeklyLessonLogSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Virtual for creator
WeeklyLessonLogSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Virtual for updater
WeeklyLessonLogSchema.virtual('updater', {
  ref: 'User',
  localField: 'updatedBy',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('WeeklyLessonLog', WeeklyLessonLogSchema);