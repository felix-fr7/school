/**
 * Homework Model
 * MongoDB schema for assignments and submissions
 * Phase 3 Implementation
 */

const mongoose = require('mongoose');

// Sub-schema for submissions
const SubmissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  submissionFile: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (value) {
          return /^https?:\/\/.+/i.test(value);
        }
        return true;
      },
      message: 'Submission file must be a valid URL'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['Submitted', 'Pending', 'Checked'],
      message: 'Status must be Submitted, Pending, or Checked'
    },
    default: 'Pending'
  },
  submittedAt: {
    type: Date
  },
  checkedAt: {
    type: Date
  },
  marks: {
    type: Number,
    min: [0, 'Marks cannot be negative']
  },
  maxMarks: {
    type: Number,
    min: [1, 'Max marks must be at least 1']
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [500, 'Feedback cannot exceed 500 characters']
  }
}, { _id: false });

// Pre-save for submission: Set submittedAt when status changes to Submitted
SubmissionSchema.pre('save', function() {
  if (this.status === 'Submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  if (this.status === 'Checked' && !this.checkedAt) {
    this.checkedAt = new Date();
  }
});

const HomeworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Homework title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  classGrade: {
    type: String,
    required: [true, 'Class/Grade is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  givenDate: {
    type: Date,
    required: [true, 'Given date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  attachments: [{
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        // Accept both full URLs (http/https) and relative paths (/uploads/...)
        return /^https?:\/\/.+/i.test(value) || /^\/uploads\/.+/i.test(value);
      },
      message: 'Attachment must be a valid URL or file path'
    }
  }],
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher reference is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  submissions: {
    type: [SubmissionSchema],
    default: []
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  maxMarks: {
    type: Number,
    default: 100,
    min: [1, 'Max marks must be at least 1']
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
HomeworkSchema.index({ schoolId: 1, classId: 1 });
HomeworkSchema.index({ schoolId: 1, teacher: 1 });
HomeworkSchema.index({ schoolId: 1, dueDate: -1 });
HomeworkSchema.index({ schoolId: 1, isPublished: 1, dueDate: -1 });

// Virtual for teacher reference
HomeworkSchema.virtual('teacherDoc', {
  ref: 'User',
  localField: 'teacher',
  foreignField: '_id',
  justOne: true
});

// Virtual for school reference
HomeworkSchema.virtual('school', {
  ref: 'School',
  localField: 'schoolId',
  foreignField: '_id',
  justOne: true
});

// Virtual for class reference
HomeworkSchema.virtual('class', {
  ref: 'Class',
  localField: 'classId',
  foreignField: '_id',
  justOne: true
});

// Virtual for submission count
HomeworkSchema.virtual('submissionCount').get(function() {
  return this.submissions ? this.submissions.length : 0;
});

// Virtual for submitted count
HomeworkSchema.virtual('submittedCount').get(function() {
  if (!this.submissions) return 0;
  return this.submissions.filter(s => s.status === 'Submitted' || s.status === 'Checked').length;
});

// Virtual for checked count
HomeworkSchema.virtual('checkedCount').get(function() {
  if (!this.submissions) return 0;
  return this.submissions.filter(s => s.status === 'Checked').length;
});

// Pre-find to only return published homework by default
HomeworkSchema.pre(/^find/, function() {
  // Only filter if not explicitly requested
  if (!this.getFilter()['isPublished']) {
    this.where({ isPublished: true });
  }
});

// Method to add a submission
HomeworkSchema.methods.addSubmission = async function(studentId, submissionFile) {
  // Check if student already has a submission
  const existingSubmission = this.submissions.find(s => s.student.toString() === studentId);
  
  if (existingSubmission) {
    // Update existing submission
    existingSubmission.submissionFile = submissionFile;
    existingSubmission.status = 'Submitted';
    existingSubmission.submittedAt = new Date();
  } else {
    // Add new submission
    this.submissions.push({
      student: studentId,
      submissionFile: submissionFile,
      status: 'Submitted',
      submittedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to check a submission
HomeworkSchema.methods.checkSubmission = async function(studentId, marks, maxMarks, feedback) {
  const submission = this.submissions.find(s => s.student.toString() === studentId);
  
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  submission.status = 'Checked';
  submission.marks = marks;
  submission.maxMarks = maxMarks;
  submission.feedback = feedback;
  submission.checkedAt = new Date();
  
  return this.save();
};

// Static method to find homework by class
HomeworkSchema.statics.findByClass = function(schoolId, classId) {
  return this.find({ schoolId, classId, isPublished: true }).sort({ dueDate: -1 });
};

// Static method to find homework by teacher
HomeworkSchema.statics.findByTeacher = function(schoolId, teacherId) {
  return this.find({ schoolId, teacher: teacherId }).sort({ createdAt: -1 });
};

// Static method to find homework by student
HomeworkSchema.statics.findByStudent = async function(schoolId, studentId) {
  // Find homework where student has submissions
  const homeworks = await this.find({
    schoolId,
    isPublished: true,
    'submissions.student': studentId
  }).sort({ dueDate: -1 });
  
  // Add submission status to each homework
  return homeworks.map(hw => {
    const submission = hw.submissions.find(s => s.student.toString() === studentId);
    return {
      ...hw.toObject(),
      submissionStatus: submission ? submission.status : 'Pending',
      submission: submission || null
    };
  });
};

// Static method to find upcoming homework
HomeworkSchema.statics.findUpcoming = function(schoolId, classId, days = 7) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days);
  
  return this.find({
    schoolId,
    classId,
    isPublished: true,
    dueDate: { $gte: new Date(), $lte: dueDate }
  }).sort({ dueDate: 1 });
};

// Static method to find overdue homework
HomeworkSchema.statics.findOverdue = function(schoolId, classId) {
  return this.find({
    schoolId,
    classId,
    isPublished: true,
    dueDate: { $lt: new Date() }
  }).sort({ dueDate: -1 });
};

module.exports = mongoose.model('Homework', HomeworkSchema);