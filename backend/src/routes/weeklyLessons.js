/**
 * Weekly Lesson Routes
 * Handles Homework & Classwork management organized by date-based timetable
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

/**
 * @route   GET /api/teacher/weekly-lessons
 * @desc    Get weekly lesson grid for teacher's assigned class
 * @access  Teacher
 * @response  { classId, className, lessons: [{ id, subject, lessonDate, classworkText, homeworkText, ... }] }
 */
router.get('/teacher/weekly-lessons', protect, requireTeacher, weeklyLessonController.getWeeklyLessons);

/**
 * @route   POST /api/teacher/weekly-lessons
 * @desc    Create or update a weekly lesson entry (UPSERT)
 * @access  Teacher
 * @body    { lessonDate: 'YYYY-MM-DD', subject: string, classworkText?: string, homeworkText?: string }
 * @note    Uses ON CONFLICT to update existing entries for same class/subject/date
 */
router.post(
  '/teacher/weekly-lessons',
  [
    body('lessonDate')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Lesson date must be in YYYY-MM-DD format'),
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
  protect,
  requireTeacher,
  weeklyLessonController.upsertWeeklyLesson
);

/**
 * @route   DELETE /api/teacher/weekly-lessons/:id
 * @desc    Delete a weekly lesson entry and all its attachments
 * @access  Teacher
 * @param   id - Lesson UUID
 */
router.delete(
  '/teacher/weekly-lessons/:id',
  [
    param('id')
      .isUUID()
      .withMessage('Valid lesson ID is required'),
  ],
  protect,
  requireTeacher,
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
  '/teacher/weekly-lessons/:id/attachments',
  [
    param('id')
      .isUUID()
      .withMessage('Valid lesson ID is required'),
  ],
  protect,
  requireTeacher,
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
  '/teacher/weekly-lessons/:id/attachments/:attachmentIndex',
  [
    param('id')
      .isUUID()
      .withMessage('Valid lesson ID is required'),
    param('attachmentIndex')
      .isInt({ min: 0 })
      .withMessage('Attachment index must be a non-negative integer'),
  ],
  protect,
  requireTeacher,
  weeklyLessonController.deleteAttachment
);

// ============================================
// STUDENT ROUTES
// ============================================

/**
 * @route   GET /api/student/weekly-lessons
 * @desc    Get weekly lesson grid for student's assigned class (READ-ONLY)
 * @access  Student
 * @response  { classId, lessons: [{ id, subject, lessonDate, classworkText, homeworkText, ... }] }
 * @note    Students can only see lessons for their own class
 */
router.get('/student/weekly-lessons', protect, requireStudent, weeklyLessonController.getStudentLessons);

/**
 * @route   GET /api/student/weekly-lessons/by-date
 * @desc    Get lessons for a specific date (READ-ONLY)
 * @access  Student
 * @query   date - YYYY-MM-DD format
 * @note    Students can only see lessons for their own class
 */
router.get(
  '/student/weekly-lessons/by-date',
  [
    query('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format'),
  ],
  protect,
  requireStudent,
  weeklyLessonController.getLessonsByDate
);

module.exports = router;