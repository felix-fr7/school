/**
 * News & Announcements Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/news
 * @desc    Get all news and announcements
 * @query   type, page, limit
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let query = { 
      tenantId: req.user.tenantId, 
      isPublished: true 
    };
    
    if (type) {
      query.type = type;
    }
    
    const news = await News.find(query)
      .sort({ priority: -1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('authorId', 'name avatarUrl');
    
    const total = await News.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: news,
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
 * @route   GET /api/news/:id
 * @desc    Get single news item
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const news = await News.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('authorId', 'name avatarUrl');
    
    if (!news) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/news
 * @desc    Create news/announcement
 * @body    { title, content, type, publishDate, expiryDate, priority, tags }
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      type,
      publishDate,
      expiryDate,
      priority,
      tags
    } = req.body;
    
    const news = new News({
      tenantId: req.user.tenantId,
      authorId: req.user.id,
      title,
      content,
      type: type || 'NEWS',
      priority: priority || 'NORMAL',
      isPublished: true,
      publishedAt: publishDate ? new Date(publishDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      tags: tags || []
    });
    
    await news.save();
    
    res.status(201).json({
      success: true,
      data: news,
      message: 'News created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/news/:id
 * @desc    Update news item
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      type,
      isPublished,
      publishDate,
      expiryDate,
      priority,
      tags
    } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    if (publishDate !== undefined) updates.publishedAt = new Date(publishDate);
    if (expiryDate !== undefined) updates.expiryDate = new Date(expiryDate);
    if (priority !== undefined) updates.priority = priority;
    if (tags !== undefined) updates.tags = tags;
    
    const news = await News.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!news) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: news,
      message: 'News updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/news/:id
 * @desc    Delete news item
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const news = await News.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!news) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'News deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;