/**
 * Videos Routes
 * Handles video media gallery CRUD operations
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const MediaGallery = require('../models/MediaGallery');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/videos
 * @desc    Get all videos
 * @query   category, page, limit
 * @access  Authenticated users
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().trim()
  ],
  async (req, res, next) => {
    try {
      const { category, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      let filter = {
        tenantId: req.user.tenantId,
        mediaType: 'video',
        isActive: true
      };
      
      if (category) {
        filter.category = category;
      }
      
      const videos = await MediaGallery.find(filter)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'name');
      
      const total = await MediaGallery.countDocuments(filter);
      
      res.status(200).json({
        success: true,
        data: videos,
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
  }
);

/**
 * @route   GET /api/videos/:id
 * @desc    Get single video by ID and increment views
 * @access  Authenticated users
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid video ID format')
  ],
  async (req, res, next) => {
    try {
      const video = await MediaGallery.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId,
        mediaType: 'video',
        isActive: true
      }).populate('uploadedBy', 'name');
      
      if (!video) {
        return res.status(404).json({
          success: false,
          error: { message: 'Video not found' }
        });
      }
      
      // Increment view count
      video.views = (video.views || 0) + 1;
      await video.save();
      
      res.status(200).json({
        success: true,
        data: video
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/videos
 * @desc    Upload a new video
 * @body    { title, description, category, videoUrl }
 * @access  Admin only
 */
router.post(
  '/',
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Video title is required').isLength({ max: 200 }).withMessage('Title must be under 200 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('category').optional().trim(),
    body('videoUrl').trim().notEmpty().withMessage('Video URL is required').isURL().withMessage('Valid video URL is required')
  ],
  async (req, res, next) => {
    try {
      const { title, description, category, videoUrl } = req.body;
      
      const video = new MediaGallery({
        tenantId: req.user.tenantId,
        mediaType: 'video',
        title,
        description,
        mediaUrl: videoUrl,
        category: category || 'educational',
        uploadedBy: req.user.id,
        isActive: true,
        isPublished: true
      });
      
      await video.save();
      
      res.status(201).json({
        success: true,
        data: video,
        message: 'Video uploaded successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/videos/:id
 * @desc    Update video details
 * @access  Admin only
 */
router.put(
  '/:id',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid video ID format'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('category').optional().trim(),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
  ],
  async (req, res, next) => {
    try {
      const { title, description, category, isPublished, isActive } = req.body;
      
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (isPublished !== undefined) updates.isPublished = isPublished;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const video = await MediaGallery.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.user.tenantId, mediaType: 'video' },
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      if (!video) {
        return res.status(404).json({
          success: false,
          error: { message: 'Video not found' }
        });
      }
      
      res.status(200).json({
        success: true,
        data: video,
        message: 'Video updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/videos/:id
 * @desc    Delete a video entry
 * @access  Admin only
 */
router.delete(
  '/:id',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid video ID format')
  ],
  async (req, res, next) => {
    try {
      const video = await MediaGallery.findOneAndDelete({
        _id: req.params.id,
        tenantId: req.user.tenantId,
        mediaType: 'video'
      });
      
      if (!video) {
        return res.status(404).json({
          success: false,
          error: { message: 'Video not found' }
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Video deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;