/**
 * Student Routes
 * Handles student-specific operations - viewing homework, marks, news, etc.
 * All routes require Student role
 */

const express = require('express');
const { param, query } = require('express-validator');
const studentController = require('../controllers/studentController');
const { protect, requireStudent } = require('../middleware/auth');

const router = express.Router();

// All routes require Student role
router.use(protect);
router.use(requireStudent);

// ============================================
// Dashboard Stats
// ============================================

/**
 * @route   GET /api/student/dashboard
 * @desc    Get student dashboard overview
 * @access  Student
 */
router.get('/dashboard', studentController.getDashboardStats);

// ============================================
// Homework Routes
// ============================================

/**
 * @route   GET /api/student/homework
 * @desc    Get all homework for student's class
 * @access  Student
 * @query   subject, isPublished
 */
router.get(
  '/homework',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
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
 * @desc    Get all marks for the student
 * @access  Student
 * @query   subject, examType
 */
router.get(
  '/marks',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
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
 * @desc    Get all news from student's school
 * @access  Student
 */
router.get('/news', studentController.getNews);

/**
 * @route   GET /api/student/news/:id
 * @desc    Get single news details
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
 * @desc    Get all circulars from student's school
 * @access  Student
 */
router.get('/circulars', studentController.getCirculars);

/**
 * @route   GET /api/student/circulars/:id
 * @desc    Get single circular details
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
 * @desc    Get all exam schedules for student's class
 * @access  Student
 */
router.get('/exam-schedules', studentController.getExamSchedules);

/**
 * @route   GET /api/student/exam-schedules/:id
 * @desc    Get single exam schedule details
 * @access  Student
 */
router.get(
  '/exam-schedules/:id',
  [param('id').isUUID().withMessage('Invalid exam schedule ID format')],
  studentController.getExamScheduleById
);

// ============================================
// Profile Routes
// ============================================

/**
 * @route   GET /api/student/profile
 * @desc    Get student profile with class info
 * @access  Student
 */
router.get('/profile', studentController.getProfile);

module.exports = router;