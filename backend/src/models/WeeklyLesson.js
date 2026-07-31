const mongoose = require('mongoose');

const weeklyLessonSchema = new mongoose.Schema({
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
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  objectives: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved'],
    default: 'Draft'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WeeklyLesson', weeklyLessonSchema);