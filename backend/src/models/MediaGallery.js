/**
 * MediaGallery Model
 * MongoDB schema for storing photos and videos
 * Phase 3 Implementation
 */

const mongoose = require('mongoose');

const MediaGallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Media title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  category: {
    type: String,
    enum: {
      values: ['Event Photos', 'Sports Day', 'Annual Day', 'Classroom Video', 'Learning Video', 'Home Video'],
      message: 'Category must be one of: Event Photos, Sports Day, Annual Day, Classroom Video, Learning Video, Home Video'
    },
    required: [true, 'Media category is required']
  },
  mediaType: {
    type: String,
    enum: {
      values: ['Image', 'Video'],
      message: 'Media type must be either Image or Video'
    },
    required: [true, 'Media type is required']
  },
  url: {
    type: String,
    required: [true, 'Media URL is required'],
    trim: true,
    validate: {
      validator: function(value) {
        // Validate URL format
        return /^https?:\/\/.+/i.test(value);
      },
      message: 'Please provide a valid URL'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  eventDate: {
    type: Date
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  fileSize: {
    type: Number // in bytes
  },
  duration: {
    type: Number // in seconds (for videos)
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
MediaGallerySchema.index({ schoolId: 1, category: 1 });
MediaGallerySchema.index({ schoolId: 1, mediaType: 1 });
MediaGallerySchema.index({ schoolId: 1, isPublished: 1, eventDate: -1 });
MediaGallerySchema.index({ schoolId: 1, createdAt: -1 });

// Virtual for school reference
MediaGallerySchema.virtual('school', {
  ref: 'School',
  localField: 'schoolId',
  foreignField: '_id',
  justOne: true
});

// Virtual for uploader
MediaGallerySchema.virtual('uploader', {
  ref: 'User',
  localField: 'uploadedBy',
  foreignField: '_id',
  justOne: true
});

// Pre-find to only return published media by default
MediaGallerySchema.pre(/^find/, function() {
  // Only filter if not explicitly requested
  if (!this.getFilter()['isPublished']) {
    this.where({ isPublished: true });
  }
});

// Static method to find media by category
MediaGallerySchema.statics.findByCategory = function(schoolId, category) {
  return this.find({ schoolId, category, isPublished: true });
};

// Static method to find recent media for a school
MediaGallerySchema.statics.findRecent = function(schoolId, limit = 10) {
  return this.find({ schoolId, isPublished: true })
    .sort({ eventDate: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to find media by date range
MediaGallerySchema.statics.findByDateRange = function(schoolId, startDate, endDate) {
  return this.find({
    schoolId,
    eventDate: { $gte: startDate, $lte: endDate },
    isPublished: true
  }).sort({ eventDate: -1 });
};

module.exports = mongoose.model('MediaGallery', MediaGallerySchema);