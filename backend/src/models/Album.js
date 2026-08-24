/**
 * Album Model
 * MongoDB schema for video/link albums
 * Supports class-based visibility for targeted album distribution
 */

const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Album title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  // Array of video/links in this album
  links: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(value) {
          return /^https?:\/\/.+/i.test(value);
        },
        message: 'Please provide a valid URL'
      }
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Visibility settings
  visibility: {
    type: String,
    enum: {
      values: ['ALL', 'SPECIFIC_CLASSES'],
      message: 'Visibility must be either ALL or SPECIFIC_CLASSES'
    },
    default: 'ALL'
  },
  // Classes that can view this album (when visibility is SPECIFIC_CLASSES)
  targetClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: {
      values: [
        'Educational',
        'Events',
        'Sports',
        'Cultural',
        'Science',
        'Arts',
        'Music',
        'Dance',
        'Documentary',
        'Other'
      ],
      message: 'Category must be one of: Educational, Events, Sports, Cultural, Science, Arts, Music, Dance, Documentary, Other'
    },
    default: 'Educational'
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
AlbumSchema.index({ tenantId: 1, isPublished: 1, createdAt: -1 });
AlbumSchema.index({ tenantId: 1, visibility: 1, targetClasses: 1 });
AlbumSchema.index({ createdBy: 1 });

// Pre-find to only return published and active albums by default
AlbumSchema.pre(/^find/, function() {
  const bypassDefaultFilter = this.getOptions().bypassDefaultFilter;
  
  if (!bypassDefaultFilter && !this.getFilter()['isPublished'] && !this.getFilter()['isActive']) {
    this.where({ isPublished: true, isActive: true });
  }
});

// Static method to find albums visible to a specific class
AlbumSchema.statics.findByClassId = function(tenantId, classId, options = {}) {
  const { page = 1, limit = 20, category } = options;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  let filter = {
    tenantId,
    isPublished: true,
    isActive: true
  };
  
  if (category) {
    filter.category = category;
  }
  
  // Add visibility filter for class-specific albums
  filter.$or = [
    { visibility: 'ALL' },
    { visibility: 'SPECIFIC_CLASSES', targetClasses: classId }
  ];
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name')
    .populate('targetClasses', 'name section');
};

// Static method to find recent albums for a tenant
AlbumSchema.statics.findRecent = function(tenantId, limit = 10) {
  return this.find({ tenantId, isPublished: true, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name');
};

// Static method to find albums by category
AlbumSchema.statics.findByCategory = function(tenantId, category) {
  return this.find({ tenantId, category, isPublished: true, isActive: true })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name');
};

module.exports = mongoose.model('Album', AlbumSchema);