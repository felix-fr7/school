/**
 * Class Controller Routes
 * Routes for class-based login users (Class ID login - CLS-X)
 * All routes are protected and require class authentication
 */

const express = require('express');
const router = express.Router();

// Import controllers
const classController = require('../controllers/classController');
const contentController = require('../controllers/contentController');

// Import authentication middleware for class users
// This middleware verifies the JWT token and extracts class info
const { protectClass } = require('../middleware/auth');

// Apply protectClass middleware to all routes
router.use(protectClass);

// ============================================
// Dashboard Routes
// ============================================

/**
 * GET /api/class-controller/dashboard
 * Get dashboard data for the logged-in class
 */
router.get('/dashboard', classController.getClassDashboard);

// ============================================
// Student Management Routes
// ============================================

/**
 * GET /api/class-controller/students/next-id
 * Get next available auto-generated student ID
 */
router.get('/students/next-id', classController.getNextStudentId);

/**
 * GET /api/class-controller/students
 * Get all students for the logged-in class
 * Query params: page, limit, search
 */
router.get('/students', classController.getClassStudents);

/**
 * POST /api/class-controller/students
 * Add a new student to the class (with auto-generated ID)
 * Body: name, email, studentId (optional), password (optional)
 */
router.post('/students', classController.addClassStudent);

/**
 * PUT /api/class-controller/students/:id
 * Update a student in the class
 * Body: name, email, studentId (any or all)
 */
router.put('/students/:id', classController.updateStudent);

/**
 * PUT /api/class-controller/students/:id/reset-password
 * Reset a student's password (with custom or default password)
 * Body: password (optional) - if not provided, defaults to 'Student@123'
 */
router.put('/students/:id/reset-password', classController.resetStudentPassword);

/**
 * POST /api/class-controller/students/:id/reset-password
 * Reset a student's password to temporary password (legacy - resets to default)
 */
router.post('/students/:id/reset-password', classController.resetStudentPassword);

/**
 * DELETE /api/class-controller/students/:id
 * Delete a student from the class
 */
router.delete('/students/:id', classController.deleteStudent);

// ============================================
// Homework Routes (placeholders for future)
// ============================================

// GET /api/class-controller/homework - List homework
// POST /api/class-controller/homework - Create homework
// PUT /api/class-controller/homework/:id - Update homework
// DELETE /api/class-controller/homework/:id - Delete homework

// ============================================
// Attendance Routes (placeholders for future)
// ============================================

// GET /api/class-controller/attendance - Get attendance
// POST /api/class-controller/attendance - Mark attendance

// ============================================
// Circulars Routes (using contentController)
// ============================================

/**
 * GET /api/class-controller/circulars
 * List circulars for the class
 * Query params: page, limit
 */
router.get('/circulars', contentController.getCirculars);

// POST /api/class-controller/circulars - Create circular (use adminContentController)
// DELETE /api/class-controller/circulars/:id - Delete circular (use adminContentController)

// ============================================
// Exam Schedule Routes (using contentController)
// ============================================

/**
 * GET /api/class-controller/exam-schedules
 * List exam schedules for the class
 * Query params: page, limit
 */
router.get('/exam-schedules', contentController.getExamSchedules);

// POST /api/class-controller/exam-schedules - Create exam schedule (use adminContentController)
// DELETE /api/class-controller/exam-schedules/:id - Delete exam schedule (use adminContentController)

module.exports = router;