/**
 * HomeworkSubmission Model
 * MongoDB schema for homework submissions
 */

const mongoose = require('mongoose');

const HomeworkSubmissionSchema = new mongoose.Schema({
  homeworkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homework',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  submissionText: {
    type: String,
    trim: true
  },
  attachmentUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'graded'],
    default: 'pending'
  },
  grade: {
    type: Number,
    min: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for unique submission per homework per student
HomeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
HomeworkSubmissionSchema.index({ studentId: 1, status: 1 });

// Virtual for homework
HomeworkSubmissionSchema.virtual('homework', {
  ref: 'Homework',
  localField: 'homeworkId',
  foreignField: '_id',
  justOne: true
});

// Virtual for student
HomeworkSubmissionSchema.virtual('student', {
  ref: 'User',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// Virtual for graded by user
HomeworkSubmissionSchema.virtual('gradedByUser', {
  ref: 'User',
  localField: 'gradedBy',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('HomeworkSubmission', HomeworkSubmissionSchema);