/**
 * News Model
 * MongoDB schema for news and announcements
 */

const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
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
    enum: ['NEWS', 'ANNOUNCEMENT', 'EVENT'],
    default: 'NEWS'
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  imageUrl: {
    type: String
  },
  attachmentUrl: {
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
  visibility: {
    type: String,
    enum: ['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES'],
    default: 'ALL'
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
NewsSchema.index({ tenantId: 1, isPublished: 1, createdAt: -1 });
NewsSchema.index({ type: 1, priority: 1 });

// Virtual for author
NewsSchema.virtual('author', {
  ref: 'User',
  localField: 'authorId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('News', NewsSchema);