/**
 * Photo Model
 * MongoDB schema for photos in albums
 */

const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  albumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PhotoAlbum',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    trim: true
  },
  sortOrder: {
    type: Number,
    default: 0
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
PhotoSchema.index({ albumId: 1, sortOrder: 1 });

// Virtual for album
PhotoSchema.virtual('album', {
  ref: 'PhotoAlbum',
  localField: 'albumId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Photo', PhotoSchema);