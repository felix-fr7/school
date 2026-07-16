/**
 * Admin Content Routes
 * Handles CRUD operations for News, Circulars, and Exams with visibility control
 * All routes require Admin role
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const adminContentController = require('../controllers/adminContentController');
const { protect, requireAdmin } = require('../middleware/auth');
const { uploadLesson, handleFileUploadError } = require('../middleware/fileUpload');
const storageService = require('../services/storageService');
const fs = require('fs');

const router = express.Router();

// All routes require authentication and Admin role
router.use(protect);
router.use(requireAdmin);

// ============================================
// News Management Routes (with Visibility)
// ============================================

/**
 * @route   GET /api/admin/content/news
 * @desc    Get all news for admin's school with visibility filtering
 * @access  Admin
 * @query   visibility ('ALL' | 'TEACHERS_ONLY'), isPublished, page, limit
 */
router.get(
  '/news',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('visibility').optional().isIn(['ALL', 'TEACHERS_ONLY']),
  ],
  adminContentController.getAllNews
);

/**
 * @route   POST /api/admin/content/news
 * @desc    Create new news with visibility, image, and PDF support
 * @access  Admin
 * @body    { title, content, imageUrl?, pdfUrl?, visibility: 'ALL' | 'TEACHERS_ONLY' }
 */
router.post(
  '/news',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('News title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('News content is required'),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Invalid image URL format'),
    body('pdfUrl')
      .optional()
      .isURL()
      .withMessage('Invalid PDF URL format'),
    body('visibility')
      .optional()
      .isIn(['ALL', 'TEACHERS_ONLY'])
      .withMessage('Visibility must be either "ALL" or "TEACHERS_ONLY"'),
  ],
  adminContentController.createNews
);

/**
 * @route   PUT /api/admin/content/news/:id
 * @desc    Update news with visibility support
 * @access  Admin
 */
router.put(
  '/news/:id',
  [
    param('id').isUUID().withMessage('Invalid news ID format'),
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
      .isURL()
      .withMessage('Invalid image URL format'),
    body('pdfUrl')
      .optional()
      .isURL()
      .withMessage('Invalid PDF URL format'),
    body('visibility')
      .optional()
      .isIn(['ALL', 'TEACHERS_ONLY'])
      .withMessage('Visibility must be either "ALL" or "TEACHERS_ONLY"'),
  ],
  adminContentController.updateNews
);

/**
 * @route   DELETE /api/admin/content/news/:id
 * @desc    Delete news
 * @access  Admin
 */
router.delete(
  '/news/:id',
  [param('id').isUUID().withMessage('Invalid news ID format')],
  adminContentController.deleteNews
);

// ============================================
// Circular Management Routes (with Visibility)
// ============================================

/**
 * @route   GET /api/admin/content/circulars
 * @desc    Get all circulars for admin's school with visibility filtering
 * @access  Admin
 * @query   visibility ('ALL' | 'TEACHERS_ONLY'), isPublished, page, limit
 */
router.get(
  '/circulars',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('visibility').optional().isIn(['ALL', 'TEACHERS_ONLY']),
  ],
  adminContentController.getAllCirculars
);

/**
 * @route   POST /api/admin/content/circulars
 * @desc    Create new circular with visibility and image support
 * @access  Admin
 * @body    { title, message/content, imageUrl?, visibility: 'ALL' | 'TEACHERS_ONLY' }
 */
router.post(
  '/circulars',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Circular title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('message')
      .optional()
      .trim(),
    body('content')
      .optional()
      .trim(),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Invalid image URL format'),
    body('visibility')
      .optional()
      .isIn(['ALL', 'TEACHERS_ONLY'])
      .withMessage('Visibility must be either "ALL" or "TEACHERS_ONLY"'),
  ],
  adminContentController.createCircular
);

/**
 * @route   PUT /api/admin/content/circulars/:id
 * @desc    Update circular with visibility support
 * @access  Admin
 */
router.put(
  '/circulars/:id',
  [
    param('id').isUUID().withMessage('Invalid circular ID format'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Circular title cannot be empty'),
    body('message')
      .optional()
      .trim(),
    body('content')
      .optional()
      .trim(),
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('Invalid image URL format'),
    body('visibility')
      .optional()
      .isIn(['ALL', 'TEACHERS_ONLY'])
      .withMessage('Visibility must be either "ALL" or "TEACHERS_ONLY"'),
  ],
  adminContentController.updateCircular
);

/**
 * @route   DELETE /api/admin/content/circulars/:id
 * @desc    Delete circular
 * @access  Admin
 */
router.delete(
  '/circulars/:id',
  [param('id').isUUID().withMessage('Invalid circular ID format')],
  adminContentController.deleteCircular
);

// ============================================
// File Upload Route (for Exams, News, etc.)
// ============================================

/**
 * @route   POST /api/admin/content/upload
 * @desc    Upload file (PDF/Image) to storage and return remote URL
 * @access  Admin
 */
router.post(
  '/upload',
  uploadLesson.single('file'),
  handleFileUploadError,
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
        fs.unlinkSync(req.file.path);

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

      // Upload to Supabase Storage
      const fileBuffer = fs.readFileSync(req.file.path);
      const uploadResult = await storageService.uploadFile(
        fileBuffer,
        req.file.originalname,
        tenantId,
        null, // classId is optional for admin uploads
        null, // lessonLogId is optional for admin uploads
        req.file.mimetype
      );

      // Clean up local temp file
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
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

// ============================================
// Exam Management Routes (New Table)
// ============================================

/**
 * @route   GET /api/admin/content/exams
 * @desc    Get all exams for admin's school
 * @access  Admin
 * @query   classId, page, limit
 */
router.get(
  '/exams',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('classId').optional().isUUID(),
  ],
  adminContentController.getAllExams
);

/**
 * @route   POST /api/admin/content/exams
 * @desc    Create new exam with PDF or Image timetable
 * @access  Admin
 * @body    { title, examName, classId?, fileUrl?, pdfUrl?, imageUrl?, dueDate? }
 */
router.post(
  '/exams',
  [
    body('title').optional().trim(),
    body('examName').optional().trim(),
    body('classId').optional().trim(),
    body('class_id').optional().trim(),
    body('fileUrl').optional().trim(),
    body('file_url').optional().trim(),
    body('pdfUrl').optional().trim(),
    body('imageUrl').optional().trim(),
    body('dueDate').optional().trim(),
    body('due_date').optional().trim(),
  ],
  adminContentController.createExam
);

/**
 * @route   PUT /api/admin/content/exams/:id
 * @desc    Update exam
 * @access  Admin
 */
router.put(
  '/exams/:id',
  [
    param('id').isUUID().withMessage('Invalid exam ID format'),
    body('title').optional().trim(),
    body('examName').optional().trim(),
    body('classId').optional().trim(),
    body('class_id').optional().trim(),
    body('fileUrl').optional().trim(),
    body('file_url').optional().trim(),
    body('pdfUrl').optional().trim(),
    body('imageUrl').optional().trim(),
    body('dueDate').optional().trim(),
    body('due_date').optional().trim(),
  ],
  adminContentController.updateExam
);

/**
 * @route   DELETE /api/admin/content/exams/:id
 * @desc    Delete exam
 * @access  Admin
 */
router.delete(
  '/exams/:id',
  [param('id').isUUID().withMessage('Invalid exam ID format')],
  adminContentController.deleteExam
);

module.exports = router;