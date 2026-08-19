/**
 * ReportCard Model
 * MongoDB schema for digital marks and reports
 * Phase 3 Implementation
 */

const mongoose = require('mongoose');

// Sub-schema for subject marks
const SubjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  marksObtained: {
    type: Number,
    required: [true, 'Marks obtained is required'],
    min: [0, 'Marks obtained cannot be negative']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [1, 'Total marks must be at least 1']
  },
  grade: {
    type: String,
    required: [true, 'Grade is required'],
    trim: true
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  }
}, { _id: false });

// Calculate percentage for each subject
SubjectSchema.virtual('percentage').get(function() {
  if (this.totalMarks > 0) {
    return ((this.marksObtained / this.totalMarks) * 100).toFixed(2);
  }
  return 0;
});

const ReportCardSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false
  },
  className: {
    type: String,
    trim: true
  },
  classSection: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  term: {
    type: String,
    enum: {
      values: ['Term 1', 'Term 2', 'Term 3', 'Half Yearly', 'Annual', 'Unit Test 1', 'Unit Test 2', 'Unit Test 3'],
      message: 'Term must be a valid term name'
    },
    required: [true, 'Term is required']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)']
  },
  subjects: {
    type: [SubjectSchema],
    validate: {
      validator: function(subjects) {
        // Either has subjects OR has a file-based report card
        return !subjects || subjects.length === 0 ? !!this.reportCardFileUrl : true;
      },
      message: 'Either subjects or a report card file is required'
    }
  },
  totalPercentage: {
    type: Number,
    required: true,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  overallGrade: {
    type: String,
    required: [true, 'Overall grade is required'],
    trim: true
  },
  rank: {
    type: Number,
    min: [1, 'Rank must be at least 1'],
    default: null
  },
  totalStudents: {
    type: Number
  },
  attendance: {
    present: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  pdfReportUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (value) {
          return /^https?:\/\/.+/i.test(value);
        }
        return true;
      },
      message: 'PDF URL must be a valid URL'
    }
  },
  // File-based report card (image or PDF upload)
  reportCardFileUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        if (value) {
          return /^https?:\/\/.+/i.test(value);
        }
        return true;
      },
      message: 'Report card file URL must be a valid URL'
    }
  },
  reportCardFileType: {
    type: String,
    enum: ['pdf', 'image', null],
    default: null
  },
  teacherRemarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Teacher remarks cannot exceed 500 characters']
  },
  principalRemarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Principal remarks cannot exceed 500 characters']
  },
  parentAcknowledgment: {
    type: Boolean,
    default: false
  },
  parentSignature: {
    type: String,
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  issuedDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
ReportCardSchema.index({ student: 1, academicYear: 1, term: 1 });
ReportCardSchema.index({ schoolId: 1, academicYear: 1, term: 1 });
ReportCardSchema.index({ schoolId: 1, isPublished: 1 });
ReportCardSchema.index({ student: 1, isPublished: 1, issuedDate: -1 });

// Virtual for student reference
ReportCardSchema.virtual('studentDoc', {
  ref: 'User',
  localField: 'student',
  foreignField: '_id',
  justOne: true
});

// Virtual for school reference
ReportCardSchema.virtual('school', {
  ref: 'School',
  localField: 'schoolId',
  foreignField: '_id',
  justOne: true
});

// Note: Pre-save and pre-find hooks removed - all calculations are done in the controller
// The getReportCards function in controller bypasses any find hooks manually

// Static method to find report cards by student
ReportCardSchema.statics.findByStudent = function(studentId) {
  return this.find({ student: studentId }).sort({ academicYear: -1, term: 1 });
};

// Static method to find report cards by school and term
ReportCardSchema.statics.findBySchoolAndTerm = function(schoolId, academicYear, term) {
  return this.find({ schoolId, academicYear, term, isPublished: true });
};

// Static method to find latest report card for a student
ReportCardSchema.statics.findLatest = function(studentId) {
  return this.findOne({ student: studentId, isPublished: true })
    .sort({ academicYear: -1, term: 1, createdAt: -1 });
};

module.exports = mongoose.model('ReportCard', ReportCardSchema);