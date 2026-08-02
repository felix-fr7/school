/**
 * Circulars Routes
 * Using MongoDB/Mongoose
 * Supports text and image circulars with visibility control
 */

const express = require('express');
const router = express.Router();
const Circular = require('../models/Circular');
const Class = require('../models/Class');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');
const { uploadFields } = require('../middleware/fileUpload');
const path = require('path');
const fs = require('fs');

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
    
    // Get tenantId - check multiple sources
    const queryTenantId = req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;
    
    console.log('[Circulars GET] Using tenantId:', queryTenantId);
    
    const circulars = await Circular.find({
      tenantId: queryTenantId,
      isPublished: true
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('authorId', 'name email');
    
    const total = await Circular.countDocuments({
      tenantId: queryTenantId,
      isPublished: true
    });
    console.log('[Circulars GET] Total circulars found:', total);
    console.log('[Circulars GET] Circulars returned:', circulars.length);
    
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
 * @desc    Create circular with file upload support
 * @body    { title, content, visibility, classId, expiryDate }
 * @form    image (optional), pdf (optional)
 * @access  Admin only
 */
router.post('/', 
  uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  authenticate, 
  requireAdmin, 
  async (req, res, next) => {
  try {
    const {
      title,
      content,
      visibility,
      classId,
      expiryDate
    } = req.body;
    
    // Get tenantId from various sources, ensuring it's a valid string
    let tenantId = null;
    if (req.headers['x-tenant-id'] && req.headers['x-tenant-id'] !== 'null' && req.headers['x-tenant-id'] !== 'undefined') {
      tenantId = req.headers['x-tenant-id'];
    } else if (req.user.tenantId && req.user.tenantId !== 'null' && req.user.tenantId !== 'undefined') {
      tenantId = req.user.tenantId;
    } else if (req.user.schoolId && req.user.schoolId !== 'null' && req.user.schoolId !== 'undefined') {
      tenantId = req.user.schoolId;
    }
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Circular title is required' }
      });
    }
    
    // Content is required for text circulars, optional for image circulars
    // If no content provided but image is uploaded, use title as content
    const finalContent = (content && content.trim()) ? content.trim() : (req.files && req.files.image ? title.trim() : null);
    
    if (!finalContent) {
      return res.status(400).json({
        success: false,
        error: { message: 'Circular content is required (or upload an image)' }
      });
    }
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tenant ID is required' }
      });
    }
    
    // Handle file uploads
    let imageUrl = null;
    let pdfUrl = null;
    
    // Ensure uploads/circulars directory exists
    const uploadDir = path.join(__dirname, '../../uploads/circulars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Process image file
    if (req.files && req.files.image && req.files.image.length > 0) {
      const imageFile = req.files.image[0];
      const fileName = `${Date.now()}-${imageFile.originalname}`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.renameSync(imageFile.path, filePath);
      imageUrl = `/uploads/circulars/${fileName}`;
    }
    
    // Process PDF file
    if (req.files && req.files.pdf && req.files.pdf.length > 0) {
      const pdfFile = req.files.pdf[0];
      const fileName = `${Date.now()}-${pdfFile.originalname}`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.renameSync(pdfFile.path, filePath);
      pdfUrl = `/uploads/circulars/${fileName}`;
    }
    
    // Validate classId if SPECIFIC_CLASSES visibility is selected
    const newsVisibility = visibility || 'ALL';
    if (newsVisibility === 'SPECIFIC_CLASSES' && classId) {
      const classExists = await Class.findOne({ _id: classId, tenantId });
      if (!classExists) {
        return res.status(404).json({
          success: false,
          error: { message: 'Class not found in your school' }
        });
      }
    }
    
    const circular = new Circular({
      tenantId,
      authorId: req.user.id,
      title: title.trim(),
      content: finalContent,
      imageUrl,
      attachmentUrl: pdfUrl,
      visibility: newsVisibility,
      classId: classId || null,
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