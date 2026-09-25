/**
 * Albums Routes
 * Handles album CRUD operations with class-based visibility
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const Album = require('../models/Album');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/albums/admin/all
 * @desc    Get all albums (for admin - shows all albums including unpublished)
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
      
      if (isPublished !== undefined && isPublished !== '') {
        filter.isPublished = isPublished === 'true';
      }
      
      const albums = await Album.find(filter, {}, { bypassDefaultFilter: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name')
        .populate('targetClasses', 'name section');
      
      const total = await Album.countDocuments(filter);
      
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
  }
);

/**
 * @route   GET /api/albums/admin/:id
 * @desc    Get single album by ID for admin (includes drafts/unpublished albums)
 * @access  Admin only
 */
router.get(
  '/admin/:id',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid album ID format')
  ],
  async (req, res, next) => {
    try {
      const album = await Album.findOne(
        {
          _id: req.params.id,
          tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId
        },
        {},
        { bypassDefaultFilter: true }
      )
        .populate('createdBy', 'name')
        .populate('targetClasses', 'name section');

      if (!album) {
        return res.status(404).json({
          success: false,
          error: { message: 'Album not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: album
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/albums
 * @desc    Get all published albums visible to the user (students & class controllers)
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

      // Student or class-controller login both set classId on req.user
      const userClassId = req.user.classId;
      const isClassUser = req.user.isClass === true || req.user.role === 'CLASS';

      let albums;
      let total;

      // Only admin-published, active albums
      const baseFilter = {
        tenantId: queryTenantId,
        isPublished: true,
        isActive: true
      };

      if (category) {
        baseFilter.category = category;
      }

      if (userClassId) {
        // Student / Class login — ALL + this class's SPECIFIC_CLASSES albums only
        const classFilter = {
          ...baseFilter,
          $or: [
            { visibility: 'ALL' },
            { visibility: 'SPECIFIC_CLASSES', targetClasses: userClassId }
          ]
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        albums = await Album.find(classFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('createdBy', 'name')
          .populate('targetClasses', 'name section');

        total = await Album.countDocuments(classFilter);
      } else {
        // Admin/Teacher without class - show all published albums for tenant
        const skip = (parseInt(page) - 1) * parseInt(limit);
        albums = await Album.find(baseFilter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('createdBy', 'name')
          .populate('targetClasses', 'name section');

        total = await Album.countDocuments(baseFilter);
      }

      res.status(200).json({
        success: true,
        data: albums,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)) || 0
        },
        meta: {
          filteredByClass: !!userClassId,
          isClassUser: !!isClassUser
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/albums/:id
 * @desc    Get single album by ID
 * @access  Authenticated users
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid album ID format')
  ],
  async (req, res, next) => {
    try {
      const album = await Album.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId || req.user.schoolId,
        isPublished: true,
        isActive: true
      }).populate('createdBy', 'name')
        .populate('targetClasses', 'name section');
      
      if (!album) {
        return res.status(404).json({
          success: false,
          error: { message: 'Album not found' }
        });
      }
      
      // Check visibility permissions
      if (album.visibility === 'SPECIFIC_CLASSES') {
        const userClassId = req.user.classId;
        if (!userClassId || !album.targetClasses.some(cls => cls._id.toString() === userClassId.toString())) {
          return res.status(403).json({
            success: false,
            error: { message: 'You do not have permission to view this album' }
          });
        }
      }
      
      res.status(200).json({
        success: true,
        data: album
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/albums
 * @desc    Create a new album
 * @body    { title, description, category, links, visibility, targetClasses, isPublished, tags }
 * @access  Admin only
 */
router.post(
  '/',
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Album title is required').isLength({ max: 200 }).withMessage('Title must be under 200 characters'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('category').optional().isIn([
      'Educational', 'Events', 'Sports', 'Cultural', 'Science', 'Arts', 'Music', 'Dance', 'Documentary', 'Other'
    ]).withMessage('Invalid category'),
    body('links').optional().isArray().withMessage('Links must be an array'),
    body('links.*.title').trim().notEmpty().withMessage('Link title is required'),
    body('links.*.url').trim().notEmpty().withMessage('Link URL is required').isURL().withMessage('Valid URL is required'),
    body('links.*.thumbnailUrl').optional().trim().isURL().withMessage('Valid thumbnail URL is required'),
    body('visibility').optional().isIn(['ALL', 'SPECIFIC_CLASSES']).withMessage('Invalid visibility type'),
    body('targetClasses').optional().isArray().withMessage('Target classes must be an array'),
    body('targetClasses.*').optional().isMongoId().withMessage('Invalid class ID format'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        category = 'Educational',
        links = [],
        visibility = 'ALL',
        targetClasses = [],
        isPublished = false,
        tags = []
      } = req.body;
      
      // Validate that targetClasses is provided when visibility is SPECIFIC_CLASSES
      if (visibility === 'SPECIFIC_CLASSES' && targetClasses.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'At least one target class must be selected when visibility is set to Specific Classes' }
        });
      }
      
      // Format links with addedAt timestamp
      const formattedLinks = links.map(link => ({
        title: link.title,
        url: link.url,
        thumbnailUrl: link.thumbnailUrl || '',
        addedAt: new Date()
      }));
      
      const album = new Album({
        tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId,
        title,
        description,
        category,
        links: formattedLinks,
        visibility,
        targetClasses: visibility === 'SPECIFIC_CLASSES' ? targetClasses : [],
        createdBy: req.user.id,
        isPublished,
        isActive: true,
        tags
      });
      
      await album.save();
      
      // Populate the response
      await album.populate('createdBy', 'name');
      await album.populate('targetClasses', 'name section');
      
      res.status(201).json({
        success: true,
        data: album,
        message: 'Album created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/albums/:id
 * @desc    Update album details
 * @access  Admin only
 */
router.put(
  '/:id',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid album ID format'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('category').optional().isIn([
      'Educational', 'Events', 'Sports', 'Cultural', 'Science', 'Arts', 'Music', 'Dance', 'Documentary', 'Other'
    ]).withMessage('Invalid category'),
    body('links').optional().isArray().withMessage('Links must be an array'),
    body('links.*.title').trim().notEmpty().withMessage('Link title is required'),
    body('links.*.url').trim().notEmpty().withMessage('Link URL is required').isURL().withMessage('Valid URL is required'),
    body('links.*.thumbnailUrl').optional().trim().isURL().withMessage('Valid thumbnail URL is required'),
    body('visibility').optional().isIn(['ALL', 'SPECIFIC_CLASSES']).withMessage('Invalid visibility type'),
    body('targetClasses').optional().isArray().withMessage('Target classes must be an array'),
    body('targetClasses.*').optional().isMongoId().withMessage('Invalid class ID format'),
    body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        category,
        links,
        visibility,
        targetClasses,
        isPublished,
        isActive,
        tags
      } = req.body;
      
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (isPublished !== undefined) updates.isPublished = isPublished;
      if (isActive !== undefined) updates.isActive = isActive;
      if (tags !== undefined) updates.tags = tags;
      
      // Handle links update
      if (links !== undefined) {
        updates.links = links.map(link => ({
          title: link.title,
          url: link.url,
          thumbnailUrl: link.thumbnailUrl || '',
          addedAt: link.addedAt || new Date()
        }));
      }
      
      // Handle targetClasses update
      if (visibility !== undefined) {
        if (visibility === 'SPECIFIC_CLASSES' && targetClasses && targetClasses.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: 'At least one target class must be selected when visibility is set to Specific Classes' }
          });
        }
        updates.visibility = visibility;
        updates.targetClasses = visibility === 'SPECIFIC_CLASSES' ? (targetClasses || []) : [];
      }
      
      const album = await Album.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId },
        { $set: updates },
        { new: true, runValidators: true, bypassDefaultFilter: true }
      ).populate('createdBy', 'name')
        .populate('targetClasses', 'name section');
      
      if (!album) {
        return res.status(404).json({
          success: false,
          error: { message: 'Album not found' }
        });
      }
      
      res.status(200).json({
        success: true,
        data: album,
        message: 'Album updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/albums/:id/links
 * @desc    Add a link to an existing album
 * @access  Admin only
 */
router.post(
  '/:id/links',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid album ID format'),
    body('title').trim().notEmpty().withMessage('Link title is required'),
    body('url').trim().notEmpty().withMessage('Link URL is required').isURL().withMessage('Valid URL is required'),
    body('thumbnailUrl').optional().trim().isURL().withMessage('Valid thumbnail URL is required')
  ],
  async (req, res, next) => {
    try {
      const { title, url, thumbnailUrl } = req.body;
      
      const album = await Album.findOne(
        { _id: req.params.id, tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId },
        {},
        { bypassDefaultFilter: true }
      );
      
      if (!album) {
        return res.status(404).json({
          success: false,
          error: { message: 'Album not found' }
        });
      }
      
      if (!Array.isArray(album.links)) {
        album.links = [];
      }
      
      album.links.push({
        title,
        url,
        thumbnailUrl: thumbnailUrl || '',
        addedAt: new Date()
      });
      
      await album.save();
      await album.populate('createdBy', 'name');
      await album.populate('targetClasses', 'name section');
      
      res.status(200).json({
        success: true,
        data: album,
        message: 'Link added successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/albums/:id/links/:linkIndex
 * @desc    Remove a link from an album
 * @access  Admin only
 */
router.delete(
  '/:id/links/:linkIndex',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid album ID format'),
    param('linkIndex').isInt({ min: 0 }).withMessage('Link index must be a positive integer')
  ],
  async (req, res, next) => {
    try {
      const album = await Album.findOne(
        { _id: req.params.id, tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId },
        {},
        { bypassDefaultFilter: true }
      );
      
      if (!album) {
        return res.status(404).json({
          success: false,
          error: { message: 'Album not found' }
        });
      }
      
      const linkIndex = parseInt(req.params.linkIndex);
      if (!Array.isArray(album.links) || linkIndex >= album.links.length) {
        return res.status(404).json({
          success: false,
          error: { message: 'Link not found in album' }
        });
      }
      
      album.links.splice(linkIndex, 1);
      await album.save();
      await album.populate('createdBy', 'name');
      await album.populate('targetClasses', 'name section');
      
      res.status(200).json({
        success: true,
        data: album,
        message: 'Link removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/albums/:id
 * @desc    Delete an album
 * @access  Admin only
 */
router.delete(
  '/:id',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Invalid album ID format')
  ],
  async (req, res, next) => {
    try {
      const album = await Album.findOneAndDelete(
        {
          _id: req.params.id,
          tenantId: req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId
        },
        { bypassDefaultFilter: true }
      );
      
      if (!album) {
        return res.status(404).json({
          success: false,
          error: { message: 'Album not found' }
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Album deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/albums/categories/list
 * @desc    Get list of all available album categories
 * @access  Authenticated users
 */
router.get(
  '/categories/list',
  async (req, res, next) => {
    try {
      const categories = [
        { value: 'Educational', label: 'Educational' },
        { value: 'Events', label: 'Events' },
        { value: 'Sports', label: 'Sports' },
        { value: 'Cultural', label: 'Cultural' },
        { value: 'Science', label: 'Science' },
        { value: 'Arts', label: 'Arts' },
        { value: 'Music', label: 'Music' },
        { value: 'Dance', label: 'Dance' },
        { value: 'Documentary', label: 'Documentary' },
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