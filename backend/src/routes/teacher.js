/**
 * Teacher Routes
 * Handles teacher-specific operations for managing their assigned class
 * All routes require Teacher role
 */

const express = require('express');
const { query, body } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const { protect, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// All routes require Teacher role
router.use(protect);
router.use(requireTeacher);

// ============================================
// Class & Dashboard Routes
// ============================================

/**
 * @route   GET /api/teacher/my-class
 * @desc    Get teacher's assigned class with students, homework, and exams
 * @access  Teacher
 */
router.get('/my-class', teacherController.getMyClass);

// ============================================
// Student Routes
// ============================================

/**
 * @route   GET /api/teacher/students
 * @desc    Get all students in teacher's class
 * @access  Teacher
 * @query   search, page, limit
 */
router.get(
  '/students',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  teacherController.getMyStudents
);

// ============================================
// Homework Routes
// ============================================

/**
 * @route   GET /api/teacher/homework
 * @desc    Get all homework for teacher's class
 * @access  Teacher
 * @query   page, limit
 */
router.get(
  '/homework',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  teacherController.getHomework
);

/**
 * @route   POST /api/teacher/homework
 * @desc    Create homework for teacher's class
 * @access  Teacher
 * @body    { title, description, subject, dueDate? }
 */
router.post(
  '/homework',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Homework title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Homework description is required'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ],
  teacherController.createHomework
);

// ============================================
// Marks Routes
// ============================================

/**
 * @route   GET /api/teacher/marks
 * @desc    Get all marks for students in teacher's class
 * @access  Teacher
 * @query   studentId, examType, page, limit
 */
router.get(
  '/marks',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  teacherController.getMarks
);

/**
 * @route   POST /api/teacher/marks
 * @desc    Create marks for students in teacher's class (batch)
 * @access  Teacher
 * @body    { marksData: [{ studentId, subject, marksObtained, totalMarks, examType, examDate?, remarks? }] }
 */
router.post(
  '/marks',
  [
    body('marksData')
      .isArray({ min: 1 })
      .withMessage('Marks data must be a non-empty array'),
    body('marksData.*.studentId')
      .isUUID()
      .withMessage('Valid student ID is required'),
    body('marksData.*.subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('marksData.*.marksObtained')
      .isFloat({ min: 0 })
      .withMessage('Marks obtained must be a positive number'),
    body('marksData.*.totalMarks')
      .isFloat({ min: 1 })
      .withMessage('Total marks must be greater than 0'),
    body('marksData.*.examType')
      .trim()
      .notEmpty()
      .withMessage('Exam type is required'),
    body('marksData.*.examDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('marksData.*.remarks')
      .optional()
      .trim(),
  ],
  teacherController.createMarks
);

module.exports = router;