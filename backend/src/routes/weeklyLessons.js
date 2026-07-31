/**
 * Weekly Lesson Routes
 * Handles Homework & Classwork management organized by date-based timetable
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const WeeklyLesson = require('../models/WeeklyLesson');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin, requireTeacher, requireStudent } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

// ============================================
// Teacher Routes
// ============================================

/**
 * @route   GET /api/weekly-lessons/teacher/weekly-lessons
 * @desc    Get weekly lessons created by teacher or for teacher's assigned class/subject
 * @query   classId, sectionId, startDate, endDate
 * @access  Teacher, Admin
 */
router.get(
  '/teacher/weekly-lessons',
  [
    query('classId').optional().isMongoId().withMessage('Valid class ID is required'),
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required')
  ],
  async (req, res, next) => {
    try {
      const { classId, startDate, endDate } = req.query;
      const tenantId = req.user.tenantId;

      let filter = { tenantId };

      // If teacher, optionally restrict to their ID unless admin
      if (req.user.role === 'TEACHER') {
        filter.teacherId = req.user.id;
      }

      if (classId) filter.classId = classId;

      if (startDate && endDate) {
        filter.lessonDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const lessons = await WeeklyLesson.find(filter)
        .populate('classId', 'name')
        .populate('subjectId', 'name code')
        .sort({ lessonDate: -1, createdAt: -1 });

      res.status(200).json({
        success: true,
        data: lessons
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/weekly-lessons/teacher/weekly-lessons
 * @desc    Create a new weekly lesson (homework/classwork)
 * @access  Teacher, Admin
 */
router.post(
  '/teacher/weekly-lessons',
  [
    body('classId').isMongoId().withMessage('Valid class ID is required'),
    body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
    body('title').trim().notEmpty().withMessage('Lesson title is required').isLength({ max: 200 }),
    body('description').optional().trim(),
    body('type').isIn(['HOMEWORK', 'CLASSWORK', 'ASSIGNMENT']).withMessage('Valid lesson type is required'),
    body('lessonDate').isISO8601().withMessage('Valid lesson date is required')
  ],
  async (req, res, next) => {
    try {
      const { classId, subjectId, title, description, type, lessonDate, attachments } = req.body;
      const tenantId = req.user.tenantId;
      const teacherId = req.user.id;

      const weeklyLesson = new WeeklyLesson({
        tenantId,
        classId,
        subjectId,
        teacherId,
        title,
        description,
        type,
        lessonDate,
        attachments: attachments || []
      });

      await weeklyLesson.save();

      res.status(201).json({
        success: true,
        message: 'Weekly lesson created successfully',
        data: weeklyLesson
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/weekly-lessons/teacher/weekly-lessons/:id
 * @desc    Delete a weekly lesson
 * @access  Teacher, Admin
 */
router.delete(
  '/teacher/weekly-lessons/:id',
  [
    param('id').isMongoId().withMessage('Invalid lesson ID format')
  ],
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      const filter = { _id: req.params.id, tenantId };

      // Teachers can only delete their own lessons, admins can delete any
      if (req.user.role === 'TEACHER') {
        filter.teacherId = req.user.id;
      }

      const deletedLesson = await WeeklyLesson.findOneAndDelete(filter);

      if (!deletedLesson) {
        return res.status(404).json({
          success: false,
          error: { message: 'Weekly lesson not found or unauthorized' }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Weekly lesson deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Student Routes
// ============================================

/**
 * @route   GET /api/weekly-lessons/student/weekly-lessons
 * @desc    Get weekly lessons/homework for student's class
 * @query   startDate, endDate, type
 * @access  Student
 */
router.get(
  '/student/weekly-lessons',
  [
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
    query('type').optional().isIn(['HOMEWORK', 'CLASSWORK', 'ASSIGNMENT'])
  ],
  async (req, res, next) => {
    try {
      const { startDate, endDate, type } = req.query;
      const tenantId = req.user.tenantId;
      const classId = req.user.classId; // Assuming student model includes assigned classId

      if (!classId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Student is not assigned to any class' }
        });
      }

      let filter = { tenantId, classId };
      if (type) filter.type = type;

      if (startDate && endDate) {
        filter.lessonDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const lessons = await WeeklyLesson.find(filter)
        .populate('subjectId', 'name code')
        .populate('teacherId', 'name email')
        .sort({ lessonDate: -1 });

      res.status(200).json({
        success: true,
        data: lessons
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/weekly-lessons/student/weekly-lessons/by-date
 * @desc    Get weekly lessons filtered precisely by a specific date
 * @query   date (YYYY-MM-DD)
 * @access  Student
 */
router.get(
  '/student/weekly-lessons/by-date',
  [
    query('date').isISO8601().withMessage('Valid date format is required (YYYY-MM-DD)')
  ],
  async (req, res, next) => {
    try {
      const { date } = req.query;
      const tenantId = req.user.tenantId;
      const classId = req.user.classId;

      if (!classId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Student is not assigned to any class' }
        });
      }

      // Match start and end of the specified day
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const lessons = await WeeklyLesson.find({
        tenantId,
        classId,
        lessonDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      })
        .populate('subjectId', 'name code')
        .populate('teacherId', 'name email');

      res.status(200).json({
        success: true,
        data: lessons
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;