/**
 * Class Module
 * Routes for class-based login users (Class ID login - CLS-X)
 * All routes are protected and require class authentication
 * Modular structure - Class module
 * 
 * Exports:
 * - routes: Express router with all Class Controller endpoints
 * - middleware: Role-specific middleware functions
 */

const express = require('express');
const router = express.Router();

// Import controllers
const classController = require('../../controllers/classController');
const contentController = require('../../controllers/contentController');
const adminController = require('../../controllers/adminController');

// Import authentication middleware (authenticate is the correct exported function)
const { authenticate } = require('../../middleware/auth');

// Import module-specific middleware
const classMiddleware = require('./class.middleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// Dashboard Routes
// ============================================
router.get('/dashboard', classController.getClassDashboard);

// ============================================
// Student Management Routes
// ============================================
router.get('/students/next-id', classController.getNextStudentId);
router.get('/students', classController.getClassStudents);
router.post('/students', classController.addClassStudent);
router.put('/students/:id', classController.updateStudent);
router.put('/students/:id/reset-password', classController.resetStudentPassword);
router.post('/students/:id/reset-password', classController.resetStudentPassword);
router.delete('/students/:id', classController.deleteStudent);

// ============================================
// Homework Routes
// ============================================
router.get('/homework', adminController.getAllHomework);
router.post('/homework', adminController.createHomework);
router.put('/homework/:id', adminController.updateHomework);
router.delete('/homework/:id', adminController.deleteHomework);

// ============================================
// Circulars Routes
// ============================================
router.get('/circulars', contentController.getCirculars);

// ============================================
// Exam Routes
// ============================================
router.get('/exams', classController.getExams);
router.get('/exams/:id', classController.getExamById);
router.get('/exam-schedules', contentController.getExamSchedules);

// Export the router as default and named exports
module.exports = router;
module.exports.routes = router;
module.exports.middleware = classMiddleware;