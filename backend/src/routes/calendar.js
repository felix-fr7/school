/**
 * Calendar Events Routes
 * Handles school calendar events management
 */

const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

// ============================================
// ADMIN ROUTES
// ============================================

// GET /api/admin/calendar-events - Get all calendar events
router.get('/admin/calendar-events', requireAdmin, calendarController.getCalendarEvents);

// POST /api/admin/calendar-events - Create new calendar event
router.post('/admin/calendar-events', requireAdmin, calendarController.createCalendarEvent);

// PUT /api/admin/calendar-events/:id - Update calendar event
router.put('/admin/calendar-events/:id', requireAdmin, calendarController.updateCalendarEvent);

// DELETE /api/admin/calendar-events/:id - Delete calendar event
router.delete('/admin/calendar-events/:id', requireAdmin, calendarController.deleteCalendarEvent);

// ============================================
// STUDENT ROUTES
// ============================================

// GET /api/student/calendar-events - Get student's calendar events
router.get('/student/calendar-events', calendarController.getStudentCalendarEvents);

// ============================================
// CLASS CONTROLLER ROUTES
// ============================================

// GET /api/class-controller/calendar-events - Get class calendar events
router.get('/class-controller/calendar-events', calendarController.getClassControllerCalendarEvents);

module.exports = router;
