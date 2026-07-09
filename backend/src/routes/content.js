/**
 * Content Routes (Public for Students and Teachers)
 * Handles read-only access to News, Circulars, and Exams
 * Both Students and Teachers can access these endpoints
 */

const express = require('express');
const { query, param } = require('express-validator');
const contentController = require('../controllers/contentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication (any role: student, teacher, admin)
router.use(protect);

// ============================================
// News Routes
// ============================================

/**
 * @route   GET /api/content/news
 * @desc    Get all published news (visibility filtered by role)
 * @access  Student, Teacher, Admin
 * @query   page, limit, category
 */
router.get(
  '/news',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().trim(),
  ],
  contentController.getNews
);

/**
 * @route   GET /api/content/news/:id
 * @desc    Get single news article
 * @access  Student, Teacher, Admin
 */
router.get(
  '/news/:id',
  [param('id').isUUID().withMessage('Invalid news ID format')],
  contentController.getNewsById
);

// ============================================
// Circular Routes
// ============================================

/**
 * @route   GET /api/content/circulars
 * @desc    Get all published circulars (visibility filtered by role)
 * @access  Student, Teacher, Admin
 * @query   page, limit
 */
router.get(
  '/circulars',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  contentController.getCirculars
);

/**
 * @route   GET /api/content/circulars/:id
 * @desc    Get single circular
 * @access  Student, Teacher, Admin
 */
router.get(
  '/circulars/:id',
  [param('id').isUUID().withMessage('Invalid circular ID format')],
  contentController.getCircularById
);

// ============================================
// Exam Routes (New Exam Table)
// ============================================

/**
 * @route   GET /api/content/exams
 * @desc    Get all published exam timetables (public to all roles)
 * @access  Student, Teacher, Admin
 * @query   page, limit, classId
 */
router.get(
  '/exams',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('classId').optional().isUUID(),
  ],
  contentController.getExams
);

/**
 * @route   GET /api/content/exams/:id
 * @desc    Get single exam timetable
 * @access  Student, Teacher, Admin
 */
router.get(
  '/exams/:id',
  [param('id').isUUID().withMessage('Invalid exam ID format')],
  contentController.getExamById
);

// ============================================
// Exam Schedule Routes (Legacy ExamSchedule Table)
// ============================================

/**
 * @route   GET /api/content/exam-schedules
 * @desc    Get upcoming exam schedules
 * @access  Student, Teacher, Admin
 * @query   page, limit
 */
router.get(
  '/exam-schedules',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  contentController.getExamSchedules
);

/**
 * @route   GET /api/content/exam-schedules/:id
 * @desc    Get single exam schedule
 * @access  Student, Teacher, Admin
 */
router.get(
  '/exam-schedules/:id',
  [param('id').isUUID().withMessage('Invalid exam schedule ID format')],
  contentController.getExamScheduleById
);

module.exports = router;