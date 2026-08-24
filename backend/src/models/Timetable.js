/**
 * Timetable Model
 * Weekly subject x day grid (Classwork + Homework) like school diary sheet
 * Created by Class login; visible only to that class students when published
 * Admin can edit/delete any class timetable
 */
const mongoose = require('mongoose');

const dayCellSchema = new mongoose.Schema({
  classwork: { type: String, trim: true, default: '' },
  homework: { type: String, trim: true, default: '' }
}, { _id: false });

const subjectRowSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true, maxlength: 80 },
  Monday: { type: dayCellSchema, default: () => ({}) },
  Tuesday: { type: dayCellSchema, default: () => ({}) },
  Wednesday: { type: dayCellSchema, default: () => ({}) },
  Thursday: { type: dayCellSchema, default: () => ({}) },
  Friday: { type: dayCellSchema, default: () => ({}) },
  Saturday: { type: dayCellSchema, default: () => ({}) }
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  weekLabel: {
    type: String,
    trim: true,
    default: '',
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    default: '',
    maxlength: 1000
  },
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
  createdBy: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  createdByRole: {
    type: String,
    enum: ['ADMIN', 'CLASS', 'TEACHER', 'OTHER'],
    default: 'CLASS'
  },
  // Grid rows: subject + Mon-Sat classwork/homework
  rows: {
    type: [subjectRowSchema],
    default: []
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'timetables'
});

timetableSchema.index({ tenantId: 1, classId: 1, isPublished: 1 });
timetableSchema.index({ tenantId: 1, updatedAt: -1 });

module.exports = mongoose.model('Timetable', timetableSchema);
