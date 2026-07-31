/**
 * PhotoAlbum Model
 * MongoDB schema for photo albums
 */

const mongoose = require('mongoose');

const PhotoAlbumSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  coverImageUrl: {
    type: String
  },
  eventDate: {
    type: Date
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
PhotoAlbumSchema.index({ tenantId: 1, isPublished: 1, createdAt: -1 });

// Virtual for creator
PhotoAlbumSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Virtual for photos count
PhotoAlbumSchema.virtual('photosCount', {
  ref: 'Photo',
  localField: '_id',
  foreignField: 'albumId',
  count: true
});

module.exports = mongoose.model('PhotoAlbum', PhotoAlbumSchema);