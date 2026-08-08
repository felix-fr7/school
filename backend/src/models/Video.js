/**
 * Video Model
 * MongoDB schema for storing video links (URLs only, no file uploads)
 * Supports class-based visibility for targeted video distribution
 */

const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required'],
    trim: true,
    validate: {
      validator: function(value) {
        // Validate URL format
        return /^https?:\/\/.+/i.test(value);
      },
      message: 'Please provide a valid URL'
    }
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: {
      values: [
        'Event Photos', 
        'Sports Day', 
        'Annual Day', 
        'Cultural Program',
        'Recorded Lesson', 
        'Learning Video', 
        'Home Video',
        'Other'
      ],
      message: 'Category must be one of: Event Photos, Sports Day, Annual Day, Cultural Program, Recorded Lesson, Learning Video, Home Video, Other'
    },
    required: [true, 'Video category is required']
  },
  duration: {
    type: Number, // in seconds
    min: 0
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: [true, 'Tenant ID is required'],
    index: true
  },
  uploadedBy: {
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
  // Classes that can view this video (when visibility is SPECIFIC_CLASSES)
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
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  eventDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
VideoSchema.index({ tenantId: 1, category: 1 });
VideoSchema.index({ tenantId: 1, isPublished: 1, createdAt: -1 });
VideoSchema.index({ tenantId: 1, visibility: 1, targetClasses: 1 });
VideoSchema.index({ uploadedBy: 1 });

// Pre-find to only return published and active videos by default
// Unless explicitly requested otherwise (e.g., for admin endpoints)
VideoSchema.pre(/^find/, function(next) {
  // Check if this query is explicitly marked to bypass the default filter
  // This is done by checking for a custom flag in the query context
  const bypassDefaultFilter = this.getOptions().bypassDefaultFilter;
  
  // Only apply default filter if not bypassed and not explicitly set
  if (!bypassDefaultFilter && !this.getFilter()['isPublished'] && !this.getFilter()['isActive']) {
    this.where({ isPublished: true, isActive: true });
  }
  next();
});

// Static method to find videos visible to a specific class
VideoSchema.statics.findByClassId = function(tenantId, classId, options = {}) {
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
  
  // Add visibility filter for class-specific videos
  filter.$or = [
    { visibility: 'ALL' },
    { visibility: 'SPECIFIC_CLASSES', targetClasses: classId }
  ];
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('uploadedBy', 'name')
    .populate('targetClasses', 'name section');
};

// Static method to find recent videos for a tenant
VideoSchema.statics.findRecent = function(tenantId, limit = 10) {
  return this.find({ tenantId, isPublished: true, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'name');
};

// Static method to find videos by category
VideoSchema.statics.findByCategory = function(tenantId, category) {
  return this.find({ tenantId, category, isPublished: true, isActive: true })
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'name');
};

module.exports = mongoose.model('Video', VideoSchema);