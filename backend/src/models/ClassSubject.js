const mongoose = require('mongoose');

const classSubjectSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure a unique subject per class
classSubjectSchema.index({ classId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('ClassSubject', classSubjectSchema);