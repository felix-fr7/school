/**
 * Gallery (Photo Albums) Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const PhotoAlbum = require('../models/PhotoAlbum');
const Photo = require('../models/Photo');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/gallery
 * @desc    Get all photo albums
 * @query   page, limit
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const albums = await PhotoAlbum.find({
      tenantId: req.user.tenantId,
      isPublished: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'name');
    
    const total = await PhotoAlbum.countDocuments({
      tenantId: req.user.tenantId,
      isPublished: true
    });
    
    res.status(200).json({
      success: true,
      data: albums,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/gallery/:id
 * @desc    Get single photo album with photos
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const album = await PhotoAlbum.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      isPublished: true
    }).populate('createdBy', 'name');
    
    if (!album) {
      return res.status(404).json({
        success: false,
        error: { message: 'Album not found' }
      });
    }
    
    // Get photos in this album
    const photos = await Photo.find({
      albumId: album._id,
      isActive: true
    }).sort({ uploadedAt: -1 });
    
    res.status(200).json({
      success: true,
      data: {
        ...album.toObject(),
        photos
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/gallery
 * @desc    Create photo album
 * @body    { title, description, coverImageUrl, eventDate }
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      description,
      coverImageUrl,
      eventDate
    } = req.body;
    
    const album = new PhotoAlbum({
      tenantId: req.user.tenantId,
      title,
      description,
      coverImageUrl,
      eventDate: eventDate ? new Date(eventDate) : null,
      createdBy: req.user.id,
      isPublished: true,
      isActive: true
    });
    
    await album.save();
    
    res.status(201).json({
      success: true,
      data: album,
      message: 'Photo album created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/gallery/:id
 * @desc    Update photo album
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      description,
      coverImageUrl,
      eventDate,
      isPublished,
      isActive
    } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (eventDate !== undefined) updates.eventDate = new Date(eventDate);
    if (isPublished !== undefined) updates.isPublished = isPublished;
    if (isActive !== undefined) updates.isActive = isActive;
    
    const album = await PhotoAlbum.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!album) {
      return res.status(404).json({
        success: false,
        error: { message: 'Album not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: album,
      message: 'Photo album updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/gallery/:id
 * @desc    Delete photo album
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const album = await PhotoAlbum.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!album) {
      return res.status(404).json({
        success: false,
        error: { message: 'Album not found' }
      });
    }
    
    // Delete all photos in the album
    await Photo.deleteMany({ albumId: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Photo album deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;