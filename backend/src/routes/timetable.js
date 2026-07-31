/**
 * Timetable Routes
 * Handles class timetable management CRUD operations
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const Timetable = require('../models/Timetable');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware'); // Correct Admin middleware import

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/timetable
 * @desc    Get class timetable (filtered by classId and optional dayOfWeek)
 * @query   classId, dayOfWeek
 * @access  Authenticated users
 */
router.get(
  '/',
  [
    query('classId').isMongoId().withMessage('Valid class ID is required'),
    query('dayOfWeek')
      .optional()
      .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Invalid day of the week')
  ],
  async (req, res, next) => {
    try {
      const { classId, dayOfWeek } = req.query;
      const tenantId = req.user.tenantId;

      const filter = { tenantId, classId };
      if (dayOfWeek) {
        filter.dayOfWeek = dayOfWeek;
      }

      const timetable = await Timetable.find(filter)
        .populate('subjectId', 'name code')
        .populate('teacherId', 'name email avatarUrl')
        .sort({ dayOfWeek: 1, startTime: 1 });

      res.status(200).json({
        success: true,
        data: timetable
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/timetable
 * @desc    Create a new timetable entry
 * @access  Admin / Tenant Admin
 */
router.post(
  '/',
  requireAdmin, // Using correct admin middleware
  [
    body('classId').isMongoId().withMessage('Valid class ID is required'),
    body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
    body('teacherId').isMongoId().withMessage('Valid teacher ID is required'),
    body('dayOfWeek')
      .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .withMessage('Valid day of the week is required'),
    body('startTime').notEmpty().withMessage('Start time is required (e.g., 09:00 AM)'),
    body('endTime').notEmpty().withMessage('End time is required (e.g., 10:00 AM)'),
    body('roomNumber').optional().trim()
  ],
  async (req, res, next) => {
    try {
      const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, roomNumber } = req.body;
      const tenantId = req.user.tenantId;

      const timetableEntry = new Timetable({
        tenantId,
        classId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        roomNumber: roomNumber || null
      });

      await timetableEntry.save();

      res.status(201).json({
        success: true,
        message: 'Timetable entry created successfully',
        data: timetableEntry
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/timetable/:id
 * @desc    Delete a timetable entry
 * @access  Admin / Tenant Admin
 */
router.delete(
  '/:id',
  requireAdmin, // Using correct admin middleware
  [
    param('id').isMongoId().withMessage('Invalid timetable entry ID format')
  ],
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      const deletedEntry = await Timetable.findOneAndDelete({ _id: req.params.id, tenantId });

      if (!deletedEntry) {
        return res.status(404).json({
          success: false,
          error: { message: 'Timetable entry not found' }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Timetable entry deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;