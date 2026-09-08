/**
 * Videos Routes
 * Handles video media gallery CRUD operations with class-based visibility
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const Video = require('../models/Video');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/videos
 * @desc    Get all videos (for admin - shows all videos including unpublished)
 * @query   category, page, limit, isPublished
 * @access  Admin only
 */
router.get(
  '/admin/all',
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().trim(),
    query('isPublished').optional().isBoolean()
  ],
  async (req, res, next) => {
    try {
      const { category, isPublished, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get tenantId - check multiple sources
      const queryTenantId = req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;
      
      let filter = {
        tenantId: queryTenantId
      };
      
      if (category) {
        filter.category = category;
      }
      
      if (isPublished !== undefined) {
        filter.isPublished = isPublished === 'true';
      }
      
      const videos = await Video.find(filter, {}, { bypassDefaultFilter: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'name')
        .populate('targetClasses', 'name section');
      
      const total = await Video.countDocuments(filter);
      
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
 * @route   GET /api/videos
 * @desc    Get all published videos visible to the user
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
      // Get tenantId - check multiple sources
      const queryTenantId = req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;
      
      // Check if user is a student with a class
      const userClassId = req.user.classId;
      
      let videos;
      
      if (userClassId) {
        // Student - filter by class visibility
        videos = await Video.findByClassId(queryTenantId, userClassId, {
          page,
          limit,
          category
        });
      } else {
        // Admin/Teacher without class - show all published videos
        const skip = (parseInt(page) - 1) * parseInt(limit);
        let filter = {
          tenantId: queryTenantId,
          isPublished: true,
          isActive: true
        };
        
        if (category) {
          filter.category = category;
        }
        
        videos = await Video.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('uploadedBy', 'name')
          .populate('targetClasses', 'name section');
      }
      
      // Get total count for pagination
      let totalFilter = { tenantId: queryTenantId, isPublished: true, isActive: true };
      if (category) {
        totalFilter.category = category;
      }
      
      let total;
      if (userClassId) {
        totalFilter.$or = [
          { visibility: 'ALL' },
          { visibility: 'SPECIFIC_CLASSES', targetClasses: userClassId }
        ];
        total = await Video.countDocuments(totalFilter);
      } else {
        total = await Video.countDocuments(totalFilter);
      }
      
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
      const video = await Video.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId,
        isPublished: true,
        isActive: true
      }).populate('uploadedBy', 'name')
        .populate('targetClasses', 'name section');
      
      if (!video) {
        return res.status(404).json({
          success: false,
          error: { message: 'Video not found' }
        });
      }
      
      // Check visibility permissions
      if (video.visibility === 'SPECIFIC_CLASSES') {
        const userClassId = req.user.classId;
        if (!userClassId || !video.targetClasses.some(cls => cls._id.toString() === userClassId.toString())) {
          return res.status(403).json({
            success: false,
            error: { message: 'You do not have permission to view this video' }
          });
        }
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
 * @desc    Create a new video entry (URL only, no file upload)
 * @body    { title, description, category, videoUrl, thumbnailUrl, duration, visibility, targetClasses, isPublished, tags, eventDate }
 * @access  Admin only
 */
router.post(
  '/',
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Video title is required').isLength({ max: 200 }).withMessage('Title must be under 200 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('category').notEmpty().withMessage('Video category is required').isIn([
      'Event Photos', 'Sports Day', 'Annual Day', 'Cultural Program',
      'Recorded Lesson', 'Learning Video', 'Home Video', 'Other'
    ]).withMessage('Invalid category'),
    body('videoUrl').trim().notEmpty().withMessage('Video URL is required').isURL().withMessage('Valid video URL is required'),
    body('thumbnailUrl').optional().trim().isURL().withMessage('Valid thumbnail URL is required'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive number'),
    body('visibility').optional().isIn(['ALL', 'SPECIFIC_CLASSES']).withMessage('Invalid visibility type'),
    body('targetClasses').optional().isArray().withMessage('Target classes must be an array'),
    body('targetClasses.*').optional().isMongoId().withMessage('Invalid class ID format'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('eventDate').optional().isISO8601().withMessage('Invalid date format')
  ],
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        category,
        videoUrl,
        thumbnailUrl,
        duration,
        visibility = 'ALL',
        targetClasses = [],
        isPublished = false,
        tags = [],
        eventDate
      } = req.body;
      
      // Validate that targetClasses is provided when visibility is SPECIFIC_CLASSES
      if (visibility === 'SPECIFIC_CLASSES' && targetClasses.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'At least one target class must be selected when visibility is set to Specific Classes' }
        });
      }
      
      const video = new Video({
        tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId,
        title,
        description,
        category,
        videoUrl,
        thumbnailUrl,
        duration,
        visibility,
        targetClasses: visibility === 'SPECIFIC_CLASSES' ? targetClasses : [],
        uploadedBy: req.user.id,
        isPublished,
        isActive: true,
        tags,
        eventDate
      });
      
      await video.save();
      
      // Populate the response
      await video.populate('uploadedBy', 'name');
      await video.populate('targetClasses', 'name section');
      
      res.status(201).json({
        success: true,
        data: video,
        message: 'Video created successfully'
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
    body('category').optional().isIn([
      'Event Photos', 'Sports Day', 'Annual Day', 'Cultural Program',
      'Recorded Lesson', 'Learning Video', 'Home Video', 'Other'
    ]).withMessage('Invalid category'),
    body('videoUrl').optional().trim().isURL().withMessage('Valid video URL is required'),
    body('thumbnailUrl').optional().trim().isURL().withMessage('Valid thumbnail URL is required'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive number'),
    body('visibility').optional().isIn(['ALL', 'SPECIFIC_CLASSES']).withMessage('Invalid visibility type'),
    body('targetClasses').optional().isArray().withMessage('Target classes must be an array'),
    body('targetClasses.*').optional().isMongoId().withMessage('Invalid class ID format'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('eventDate').optional().isISO8601().withMessage('Invalid date format')
  ],
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        category,
        videoUrl,
        thumbnailUrl,
        duration,
        visibility,
        targetClasses,
        isPublished,
        isActive,
        tags,
        eventDate
      } = req.body;
      
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (videoUrl !== undefined) updates.videoUrl = videoUrl;
      if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
      if (duration !== undefined) updates.duration = duration;
      if (visibility !== undefined) updates.visibility = visibility;
      if (isPublished !== undefined) updates.isPublished = isPublished;
      if (isActive !== undefined) updates.isActive = isActive;
      if (tags !== undefined) updates.tags = tags;
      if (eventDate !== undefined) updates.eventDate = eventDate;
      
      // Handle targetClasses update
      if (targetClasses !== undefined) {
        if (visibility === 'SPECIFIC_CLASSES' && targetClasses.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: 'At least one target class must be selected when visibility is set to Specific Classes' }
          });
        }
        updates.targetClasses = visibility === 'SPECIFIC_CLASSES' ? targetClasses : [];
      }
      
      const video = await Video.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId },
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('uploadedBy', 'name')
        .populate('targetClasses', 'name section');
      
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
      const video = await Video.findOneAndDelete(
        {
          _id: req.params.id,
          tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId
        },
        { bypassDefaultFilter: true }
      );
      
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

/**
 * @route   GET /api/videos/categories/list
 * @desc    Get list of all available video categories
 * @access  Authenticated users
 */
router.get(
  '/categories/list',
  async (req, res, next) => {
    try {
      const categories = [
        { value: 'Event Photos', label: 'Event Photos' },
        { value: 'Sports Day', label: 'Sports Day' },
        { value: 'Annual Day', label: 'Annual Day' },
        { value: 'Cultural Program', label: 'Cultural Program' },
        { value: 'Recorded Lesson', label: 'Recorded Lesson' },
        { value: 'Learning Video', label: 'Learning Video' },
        { value: 'Home Video', label: 'Home Video' },
        { value: 'Other', label: 'Other' }
      ];
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;