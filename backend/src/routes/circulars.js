/**
 * Circulars Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const Circular = require('../models/Circular');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/circulars
 * @desc    Get all circulars
 * @query   page, limit
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const circulars = await Circular.find({
      tenantId: req.user.tenantId,
      isPublished: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('authorId', 'name email');
    
    const total = await Circular.countDocuments({
      tenantId: req.user.tenantId,
      isPublished: true
    });
    
    res.status(200).json({
      success: true,
      data: circulars,
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
 * @route   GET /api/circulars/:id
 * @desc    Get single circular
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const circular = await Circular.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('authorId', 'name email');
    
    if (!circular) {
      return res.status(404).json({
        success: false,
        error: { message: 'Circular not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: circular
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/circulars
 * @desc    Create circular
 * @body    { title, content, attachmentUrl, expiryDate }
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      attachmentUrl,
      expiryDate
    } = req.body;
    
    const circular = new Circular({
      tenantId: req.user.tenantId,
      authorId: req.user.id,
      title,
      content,
      attachmentUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isPublished: true,
      publishedAt: new Date()
    });
    
    await circular.save();
    
    res.status(201).json({
      success: true,
      data: circular,
      message: 'Circular created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/circulars/:id
 * @desc    Update circular
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      content,
      attachmentUrl,
      expiryDate,
      isPublished
    } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl;
    if (expiryDate !== undefined) updates.expiryDate = new Date(expiryDate);
    if (isPublished !== undefined) updates.isPublished = isPublished;
    
    const circular = await Circular.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!circular) {
      return res.status(404).json({
        success: false,
        error: { message: 'Circular not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: circular,
      message: 'Circular updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/circulars/:id
 * @desc    Delete circular
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const circular = await Circular.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!circular) {
      return res.status(404).json({
        success: false,
        error: { message: 'Circular not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Circular deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;