/**
 * Weekly Lesson Routes
 * Handles Homework & Classwork management organized by weekly timetable
 * All routes require authentication and appropriate role-based access
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const weeklyLessonController = require('../controllers/weeklyLessonController');
const { protect, requireTeacher, requireStudent } = require('../middleware/auth');
const { uploadLesson, handleFileUploadError } = require('../middleware/fileUpload');

const router = express.Router();

// ============================================
// TEACHER ROUTES
// ============================================

// All teacher routes require authentication and Teacher role
router.use('/teacher', protect, requireTeacher);

/**
 * @route   GET /api/teacher/weekly-lessons
 * @desc    Get weekly lesson grid for teacher's assigned class
 * @access  Teacher
 * @response  { classId, className, grid: { 1: { name: 'Monday', lessons: [...] }, ... } }
 */
router.get('/weekly-lessons', weeklyLessonController.getWeeklyLessons);

/**
 * @route   POST /api/teacher/weekly-lessons
 * @desc    Create or update a weekly lesson entry (UPSERT)
 * @access  Teacher
 * @body    { weekday: 1-6, subject: string, classworkText?: string, homeworkText?: string }
 * @note    Uses ON CONFLICT to update existing entries for same class/subject/weekday
 */
router.post(
  '/weekly-lessons',
  [
    body('weekday')
      .isInt({ min: 1, max: 6 })
      .withMessage('Weekday must be an integer between 1 and 6 (Monday-Saturday)'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required')
      .isLength({ max: 100 })
      .withMessage('Subject must be less than 100 characters'),
    body('classworkText')
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Classwork text must be less than 10000 characters'),
    body('homeworkText')
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Homework text must be less than 10000 characters'),
  ],
  weeklyLessonController.upsertWeeklyLesson
);

/**
 * @route   DELETE /api/teacher/weekly-lessons/:id
 * @desc    Delete a weekly lesson entry and all its attachments
 * @access  Teacher
 * @param   id - Lesson UUID
 */
router.delete(
  '/weekly-lessons/:id',
  [
    param('id')
      .isUUID()
      .withMessage('Valid lesson ID is required'),
  ],
  weeklyLessonController.deleteWeeklyLesson
);

/**
 * @route   POST /api/teacher/weekly-lessons/:id/attachments
 * @desc    Upload an attachment to a lesson entry
 * @access  Teacher
 * @param   id - Lesson UUID
 * @body    multipart/form-data with 'file' field
 * @note    Allowed file types: PDF, Images (JPG, PNG, GIF, WebP), Documents (DOC, DOCX, XLS, XLSX)
 * @note    Max file size: 10MB
 */
router.post(
  '/weekly-lessons/:id/attachments',
  [
    param('id')
      .isUUID()
      .withMessage('Valid lesson ID is required'),
  ],
  uploadLesson.single('file'),
  handleFileUploadError,
  weeklyLessonController.uploadAttachment
);

/**
 * @route   DELETE /api/teacher/weekly-lessons/:id/attachments/:attachmentIndex
 * @desc    Delete an attachment from a lesson entry
 * @access  Teacher
 * @param   id - Lesson UUID
 * @param   attachmentIndex - Index of attachment in the array
 */
router.delete(
  '/weekly-lessons/:id/attachments/:attachmentIndex',
  [
    param('id')
      .isUUID()
      .withMessage('Valid lesson ID is required'),
    param('attachmentIndex')
      .isInt({ min: 0 })
      .withMessage('Attachment index must be a non-negative integer'),
  ],
  weeklyLessonController.deleteAttachment
);

// ============================================
// STUDENT ROUTES
// ============================================

// All student routes require authentication and Student role
router.use('/student', protect, requireStudent);

/**
 * @route   GET /api/student/weekly-lessons
 * @desc    Get weekly lesson grid for student's assigned class (READ-ONLY)
 * @access  Student
 * @response  { classId, grid: { 1: { name: 'Monday', lessons: [...] }, ... } }
 * @note    Students can only see lessons for their own class
 */
router.get('/weekly-lessons', weeklyLessonController.getStudentLessons);

/**
 * @route   GET /api/student/weekly-lessons/:weekday
 * @desc    Get lessons for a specific weekday (READ-ONLY)
 * @access  Student
 * @param   weekday - 1-6 (Monday-Saturday)
 * @note    Students can only see lessons for their own class
 */
router.get(
  '/weekly-lessons/:weekday',
  [
    param('weekday')
      .isInt({ min: 1, max: 6 })
      .withMessage('Weekday must be an integer between 1 and 6 (Monday-Saturday)'),
  ],
  weeklyLessonController.getLessonsByWeekday
);

module.exports = router;