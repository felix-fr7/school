/**
 * Academic Calendar Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const AcademicCalendar = require('../models/AcademicCalendar');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/calendar
 * @desc    Get calendar events with filtering
 * @query   month, year, eventType
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const { month, year, eventType } = req.query;
    
    // Build query
    let query = { tenantId: req.user.tenantId, isActive: true };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.startDate = { $gte: startDate, $lte: endDate };
    }
    
    if (eventType) {
      query.eventType = eventType;
    }
    
    const events = await AcademicCalendar.find(query)
      .sort({ startDate: -1 })
      .populate('tenantId', 'name');
    
    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/calendar/:id
 * @desc    Get single calendar event
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const event = await AcademicCalendar.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('tenantId', 'name');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/calendar
 * @desc    Create calendar event
 * @body    { title, description, eventType, startDate, endDate, isRecurring, recurringPattern, targetAudience, color }
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      isRecurring,
      recurringPattern,
      targetAudience,
      color
    } = req.body;
    
    const event = new AcademicCalendar({
      tenantId: req.user.tenantId,
      title,
      description,
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isRecurring: isRecurring || false,
      recurringPattern,
      targetAudience: targetAudience || 'ALL',
      color: color || '#007AFF',
      isActive: true
    });
    
    await event.save();
    
    res.status(201).json({
      success: true,
      data: event,
      message: 'Calendar event created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/calendar/:id
 * @desc    Update calendar event
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType,
      startDate,
      endDate,
      isRecurring,
      recurringPattern,
      targetAudience,
      color,
      isActive
    } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (eventType !== undefined) updates.eventType = eventType;
    if (startDate !== undefined) updates.startDate = new Date(startDate);
    if (endDate !== undefined) updates.endDate = new Date(endDate);
    if (isRecurring !== undefined) updates.isRecurring = isRecurring;
    if (recurringPattern !== undefined) updates.recurringPattern = recurringPattern;
    if (targetAudience !== undefined) updates.targetAudience = targetAudience;
    if (color !== undefined) updates.color = color;
    if (isActive !== undefined) updates.isActive = isActive;
    
    const event = await AcademicCalendar.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: event,
      message: 'Calendar event updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/calendar/:id
 * @desc    Delete calendar event
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const event = await AcademicCalendar.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;