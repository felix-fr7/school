/**
 * Announcement Model
 * MongoDB schema for school announcements and notifications
 */

const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['ANNOUNCEMENT', 'NOTICE', 'EVENT', 'HOLIDAY', 'EMERGENCY'],
    default: 'ANNOUNCEMENT'
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetAudience: {
    type: [String],
    enum: ['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF'],
    default: ['ALL']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  expiryDate: {
    type: Date
  },
  imageUrl: {
    type: String
  },
  attachmentUrl: {
    type: String
  },
  attachmentName: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
AnnouncementSchema.index({ tenantId: 1, isPublished: 1, createdAt: -1 });
AnnouncementSchema.index({ type: 1, priority: 1 });
AnnouncementSchema.index({ isPinned: 1, createdAt: -1 });

// Virtual for author
AnnouncementSchema.virtual('author', {
  ref: 'User',
  localField: 'authorId',
  foreignField: '_id',
  justOne: true
});

// Virtual for school
AnnouncementSchema.virtual('school', {
  ref: 'School',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);