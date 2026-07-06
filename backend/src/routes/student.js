/**
 * Student Routes
 * Handles student-specific read-only operations
 * All routes require Student role
 */

const express = require('express');
const { query, body, param } = require('express-validator');
const studentController = require('../controllers/studentController');
const studentDashboardController = require('../controllers/studentDashboardController');
const attendanceController = require('../controllers/attendanceController');
const feeController = require('../controllers/feeController');
const { protect, requireStudent } = require('../middleware/auth');

const router = express.Router();

// All routes require Student role
router.use(protect);
router.use(requireStudent);

// ============================================
// Dashboard Routes
// ============================================

/**
 * @route   GET /api/student/dashboard
 * @desc    Get student dashboard with stats, recent homework, news, and upcoming exams
 * @access  Student
 */
router.get('/dashboard', studentController.getDashboardStats);

/**
 * @route   GET /api/student/dashboard-extended
 * @desc    Extended dashboard with attendance percentage and fee status
 * @access  Student
 */
router.get('/dashboard-extended', studentController.getDashboardExtended);

// ============================================
// Homework Routes
// ============================================

/**
 * @route   GET /api/student/homework
 * @desc    Get all homework for student's class
 * @access  Student
 * @query   page, limit, subject
 */
router.get(
  '/homework',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('subject').optional().trim(),
  ],
  studentController.getHomework
);

/**
 * @route   GET /api/student/homework/:id
 * @desc    Get single homework details
 * @access  Student
 */
router.get(
  '/homework/:id',
  [param('id').isUUID().withMessage('Invalid homework ID format')],
  studentController.getHomeworkById
);

// ============================================
// Marks Routes
// ============================================

/**
 * @route   GET /api/student/marks
 * @desc    Get student's own marks with statistics
 * @access  Student
 * @query   page, limit, subject, examType
 */
router.get(
  '/marks',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('subject').optional().trim(),
    query('examType').optional().trim(),
  ],
  studentController.getMarks
);

/**
 * @route   GET /api/student/marks/:id
 * @desc    Get single mark details
 * @access  Student
 */
router.get(
  '/marks/:id',
  [param('id').isUUID().withMessage('Invalid mark ID format')],
  studentController.getMarkById
);

// ============================================
// News Routes
// ============================================

/**
 * @route   GET /api/student/news
 * @desc    Get all published news for student's school
 * @access  Student
 * @query   page, limit, category
 */
router.get(
  '/news',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().trim(),
  ],
  studentController.getNews
);

/**
 * @route   GET /api/student/news/:id
 * @desc    Get single news article
 * @access  Student
 */
router.get(
  '/news/:id',
  [param('id').isUUID().withMessage('Invalid news ID format')],
  studentController.getNewsById
);

// ============================================
// Circular Routes
// ============================================

/**
 * @route   GET /api/student/circulars
 * @desc    Get all published circulars for student's school
 * @access  Student
 * @query   page, limit
 */
router.get(
  '/circulars',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  studentController.getCirculars
);

/**
 * @route   GET /api/student/circulars/:id
 * @desc    Get single circular
 * @access  Student
 */
router.get(
  '/circulars/:id',
  [param('id').isUUID().withMessage('Invalid circular ID format')],
  studentController.getCircularById
);

// ============================================
// Exam Schedule Routes
// ============================================

/**
 * @route   GET /api/student/exam-schedules
 * @desc    Get upcoming exam schedules for student's class
 * @access  Student
 * @query   page, limit
 */
router.get(
  '/exam-schedules',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  studentController.getExamSchedules
);

/**
 * @route   GET /api/student/exam-schedules/:id
 * @desc    Get single exam schedule
 * @access  Student
 */
router.get(
  '/exam-schedules/:id',
  [param('id').isUUID().withMessage('Invalid exam schedule ID format')],
  studentController.getExamScheduleById
);

// ============================================
// Attendance Routes
// ============================================

/**
 * @route   GET /api/student/attendance/stats
 * @desc    Get student's own attendance statistics
 * @access  Student
 */
router.get('/attendance/stats', attendanceController.getStudentAttendanceStats);

// ============================================
// Fee Routes
// ============================================

/**
 * @route   GET /api/student/fees
 * @desc    Get student's own fee ledger
 * @access  Student
 */
router.get('/fees', feeController.getStudentFees);

// ============================================
// Dashboard Profile Route (New UI)
// ============================================

/**
 * @route   GET /api/student/dashboard-profile
 * @desc    Get student dashboard profile with school branding
 * @access  Student
 */
router.get('/dashboard-profile', studentDashboardController.getDashboardProfile);

// ============================================
// Profile Routes
// ============================================

/**
 * @route   GET /api/student/profile
 * @desc    Get student's own profile
 * @access  Student
 */
router.get('/profile', studentController.getProfile);

/**
 * @route   PUT /api/student/profile
 * @desc    Update student's own profile
 * @access  Student
 * @body    { name?, phone? }
 */
router.put(
  '/profile',
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ max: 100 }),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 }),
  ],
  studentController.updateProfile
);

module.exports = router;