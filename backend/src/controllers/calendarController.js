/**
 * Calendar Events Controller
 * Handles CRUD operations for school calendar events
 */

const CalendarEvent = require('../models/CalendarEvent');
const Class = require('../models/Class');

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all calendar events for admin view
 * GET /api/admin/calendar-events
 */
exports.getCalendarEvents = async (req, res, next) => {
  try {
    const { month, year, classId, eventType, isPublished } = req.query;
    const tenantId = req.user.tenantId;

    let query = { schoolId: tenantId };

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Filter by class
    if (classId) {
      query.$or = [
        { visibility: 'school-wide' },
        { classId: classId }
      ];
    }

    // Filter by event type
    if (eventType) {
      query.eventType = eventType;
    }

    // Filter by published status
    if (isPublished !== undefined) {
      query.isPublished = isPublished === 'true';
    }

    const events = await CalendarEvent.find(query)
      .populate('classId', 'name section')
      .populate('createdBy', 'name')
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new calendar event
 * POST /api/admin/calendar-events
 */
exports.createCalendarEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      endDate,
      eventType,
      color,
      visibility,
      classId,
      className,
      location,
      startTime,
      endTime,
      isRecurring,
      recurringPattern,
      isPublished
    } = req.body;

    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Validate required fields
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title and date are required' }
      });
    }

    const eventData = {
      title,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      eventType: eventType || 'Event',
      color: color || '#4F46E5',
      visibility: visibility || 'school-wide',
      schoolId: tenantId,
      createdBy: userId,
      location,
      startTime,
      endTime,
      isRecurring: isRecurring || false,
      recurringPattern: isRecurring ? (recurringPattern || null) : null,
      isPublished: isPublished !== undefined ? isPublished : true
    };

    // Add class-specific fields
    if (visibility === 'class-specific' && classId) {
      eventData.classId = classId;
    }
    if (visibility === 'grade-specific' && className) {
      eventData.className = className;
    }

    const event = new CalendarEvent(eventData);
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a calendar event
 * PUT /api/admin/calendar-events/:id
 */
exports.updateCalendarEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const updateData = req.body;

    const event = await CalendarEvent.findOne({
      _id: id,
      schoolId: tenantId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found' }
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'date', 'endDate', 'eventType',
      'color', 'visibility', 'classId', 'className', 'location',
      'startTime', 'endTime', 'isRecurring', 'recurringPattern',
      'isPublished'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        // Handle empty strings for ObjectId fields - treat them as null/undefined
        if (field === 'classId' && (updateData[field] === '' || !updateData[field])) {
          event.classId = undefined;
          return;
        }
        if (field === 'date' || field === 'endDate') {
          event[field] = new Date(updateData[field]);
        } else {
          event[field] = updateData[field];
        }
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Calendar event updated successfully',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a calendar event
 * DELETE /api/admin/calendar-events/:id
 */
exports.deleteCalendarEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const event = await CalendarEvent.findOneAndDelete({
      _id: id,
      schoolId: tenantId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found' }
      });
    }

    res.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// STUDENT ENDPOINTS
// ============================================

/**
 * Get calendar events for students
 * GET /api/student/calendar-events
 * Students see school-wide events + their class-specific events
 */
exports.getStudentCalendarEvents = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const tenantId = req.user.tenantId;
    const userClassId = req.user.classId;

    console.log('[Calendar Controller] Student request - tenantId:', tenantId, 'classId:', userClassId, 'month:', month, 'year:', year);

    let query = {
      schoolId: tenantId,
      isPublished: true
    };

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Students see school-wide events + their class-specific events
    if (userClassId) {
      query.$or = [
        { visibility: 'school-wide' },
        { visibility: 'class-specific', classId: userClassId }
      ];
    } else {
      query.visibility = 'school-wide';
    }

    console.log('[Calendar Controller] Query:', JSON.stringify(query));

    const events = await CalendarEvent.find(query)
      .populate('classId', 'name section')
      .sort({ date: 1, startTime: 1 });

    console.log('[Calendar Controller] Found', events.length, 'events');

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('[Calendar Controller] Error:', error);
    next(error);
  }
};

// ============================================
// CLASS CONTROLLER ENDPOINTS
// ============================================

/**
 * Get calendar events for class controller
 * GET /api/class-controller/calendar-events
 */
exports.getClassControllerCalendarEvents = async (req, res, next) => {
  try {
    const { month, year, classId } = req.query;
    const tenantId = req.user.tenantId;

    let query = { schoolId: tenantId, isPublished: true };

    // Filter by month and year
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // If classId provided, show school-wide + that class events
    if (classId) {
      query.$or = [
        { visibility: 'school-wide' },
        { visibility: 'class-specific', classId: classId }
      ];
    } else {
      query.visibility = 'school-wide';
    }

    const events = await CalendarEvent.find(query)
      .populate('classId', 'name section')
      .sort({ date: 1, startTime: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    next(error);
  }
};