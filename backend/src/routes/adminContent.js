/**
 * Admin Content Routes
 * Handles CRUD operations for News with visibility control
 * All routes require Admin role
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const adminContentController = require('../controllers/adminContentController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadSingle, uploadFields, uploadExamSingle } = require('../middleware/fileUpload');
const storageService = require('../services/storageService');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// All routes require authentication and Admin role
router.use(authenticate);
router.use(isAdmin);

// ============================================
// News Management Routes (with Visibility)
// ============================================

/**
 * @route   GET /api/admin-content/news
 * @desc    Get all news for admin's school with visibility filtering
 * @access  Admin
 * @query   visibility ('ALL' | 'TEACHERS_ONLY' | 'SPECIFIC_CLASSES'), isPublished, page, limit
 */
router.get(
  '/news',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('visibility').optional().isIn(['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES']),
  ],
  adminContentController.getAllNews
);

/**
 * @route   PUT /api/admin-content/news/:id
 * @desc    Update news with visibility support
 * @access  Admin
 */
router.put(
  '/news/:id',
  [
    param('id').isMongoId().withMessage('Invalid news ID format'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('News title cannot be empty'),
    body('content')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('News content cannot be empty'),
    body('imageUrl')
      .optional()
      .isString()
      .withMessage('Image URL must be a string'),
    body('pdfUrl')
      .optional()
      .isString()
      .withMessage('PDF URL must be a string'),
    body('visibility')
      .optional()
      .isIn(['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES'])
      .withMessage('Visibility must be either "ALL", "TEACHERS_ONLY", or "SPECIFIC_CLASSES"'),
  ],
  adminContentController.updateNews
);

/**
 * @route   DELETE /api/admin-content/news/:id
 * @desc    Delete news
 * @access  Admin
 */
router.delete(
  '/news/:id',
  [param('id').isMongoId().withMessage('Invalid news ID format')],
  adminContentController.deleteNews
);

// ============================================
// File Upload Route (for News attachments)
// ============================================

/**
 * @route   POST /api/admin-content/upload
 * @desc    Upload file (PDF/Image) to storage and return remote URL
 * @access  Admin
 */
router.post(
  '/upload',
  uploadSingle('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file provided. Please upload a file.' },
        });
      }

      const tenantId = req.user.tenantId || 'global';

      // Fallback if storage service isn't configured
      if (!storageService.isConfigured()) {
        console.warn('[Upload] Storage service not configured, returning mock URL.');

        const isPdf = req.file.mimetype === 'application/pdf';
        const mockUrl = isPdf
          ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf-test.pdf'
          : 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1000';

        return res.status(200).json({
          success: true,
          data: {
            url: mockUrl,
            name: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
          },
          message: 'Storage not configured. Returned fallback mock URL.',
        });
      }

      // Read file from disk (since multer uses diskStorage) and upload to storage
      const fileBuffer = fs.readFileSync(req.file.path);
      const uploadResult = await storageService.uploadFile(
        fileBuffer,
        req.file.originalname,
        tenantId,
        null,
        null,
        req.file.mimetype
      );
      
      // Delete the temporary file created by multer
      fs.unlinkSync(req.file.path);

      res.status(200).json({
        success: true,
        data: {
          url: uploadResult.url,
          name: uploadResult.name,
          type: uploadResult.type,
          size: uploadResult.size,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/admin-content/upload-exam
 * @desc    Upload exam timetable file (PDF/Image) to uploads/exam/ folder
 * @access  Admin
 */
router.post(
  '/upload-exam',
  uploadExamSingle('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file provided. Please upload a file.' },
        });
      }

      // Save to uploads/exam/ folder and return local URL
      const fileUrl = `/uploads/exam/${req.file.filename}`;

      res.status(200).json({
        success: true,
        data: {
          url: fileUrl,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
        },
        message: 'Exam timetable file uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/admin-content/news
 * @desc    Create news with file upload support
 * @access  Admin
 * Note: This route handles multipart/form-data for file uploads
 */
router.post(
  '/news',
  uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const { title, content, visibility, classId } = req.body;
      const authorId = req.user.id;
      
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
          error: { message: 'News title is required' },
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'News content is required' },
        });
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Tenant ID is required. Please ensure your admin account is properly configured.' },
        });
      }

      // Validate visibility
      const validVisibility = ['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES'];
      const newsVisibility = visibility || 'ALL';
      if (!validVisibility.includes(newsVisibility)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Visibility must be either "ALL", "TEACHERS_ONLY", or "SPECIFIC_CLASSES"' },
        });
      }

      // Handle file uploads
      let imageUrl = null;
      let pdfUrl = null;

      // Ensure uploads/news directory exists
      const uploadDir = path.join(__dirname, '../../uploads/news');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Process image file
      if (req.files && req.files.image && req.files.image.length > 0) {
        const imageFile = req.files.image[0];
        const fileName = `${Date.now()}-${imageFile.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Move file to uploads/news directory
        fs.renameSync(imageFile.path, filePath);
        imageUrl = `/uploads/news/${fileName}`;
      }

      // Process PDF file
      if (req.files && req.files.pdf && req.files.pdf.length > 0) {
        const pdfFile = req.files.pdf[0];
        const fileName = `${Date.now()}-${pdfFile.originalname}`;
        const filePath = path.join(uploadDir, fileName);
        
        // Move file to uploads/news directory
        fs.renameSync(pdfFile.path, filePath);
        pdfUrl = `/uploads/news/${fileName}`;
      }

      // Validate classId if SPECIFIC_CLASSES visibility is selected
      if (newsVisibility === 'SPECIFIC_CLASSES' && classId) {
        const Class = require('../models/Class');
        const classExists = await Class.findOne({ _id: classId, tenantId });
        if (!classExists) {
          return res.status(404).json({
            success: false,
            error: { message: 'Class not found in your school' },
          });
        }
      }

      // Create news document
      const newsData = {
        title: title.trim(),
        content: content.trim(),
        tenantId,
        authorId,
        imageUrl,
        attachmentUrl: pdfUrl,
        visibility: newsVisibility,
        classId: classId || null,
        isPublished: true,
        publishedAt: new Date(),
        type: 'NEWS'
      };

      const News = require('../models/News');
      const news = new News(newsData);
      await news.save();

      res.status(201).json({
        success: true,
        data: {
          id: news._id,
          title: news.title,
          content: news.content,
          imageUrl: news.imageUrl,
          pdfUrl: news.attachmentUrl,
          visibility: news.visibility,
          classId: news.classId,
          isPublished: news.isPublished,
          createdAt: news.createdAt,
          updatedAt: news.updatedAt
        },
        message: 'News created successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;