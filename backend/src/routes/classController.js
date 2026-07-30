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
const adminController = require('../controllers/adminController');

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
// Homework Routes
// ============================================

/**
 * GET /api/class-controller/homework
 * List homework for the class
 * Query params: page, limit
 */
router.get('/homework', adminController.getAllHomework);

/**
 * POST /api/class-controller/homework
 * Create homework for the class
 * Body: { title, description, subject, dueDate? }
 */
router.post('/homework', adminController.createHomework);

/**
 * PUT /api/class-controller/homework/:id
 * Update homework
 * Body: { title?, description?, subject?, dueDate?, isPublished? }
 */
router.put('/homework/:id', adminController.updateHomework);

/**
 * DELETE /api/class-controller/homework/:id
 * Delete homework
 */
router.delete('/homework/:id', adminController.deleteHomework);

// ============================================
// Circulars Routes (using contentController)
// ============================================

/**
 * GET /api/class-controller/circulars
 * List circulars for the class
 * Query params: page, limit
 */
router.get('/circulars', contentController.getCirculars);

// ============================================
// Exam Schedule Routes (New Exam table - PDF/Image based)
// ============================================

/**
 * GET /api/class-controller/exams
 * List all published exams (including school-wide) for the class
 * Query params: page, limit
 */
router.get('/exams', classController.getExams);

/**
 * GET /api/class-controller/exams/:id
 * Get single exam details
 */
router.get('/exams/:id', classController.getExamById);

// ============================================
// Exam Schedule Routes (Legacy - using contentController)
// ============================================

/**
 * GET /api/class-controller/exam-schedules
 * List exam schedules for the class
 * Query params: page, limit
 */
router.get('/exam-schedules', contentController.getExamSchedules);

module.exports = router;
