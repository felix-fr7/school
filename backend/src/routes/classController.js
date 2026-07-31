/**
 * Class Controller Routes
 * Routes for class-based login users (Class ID login - CLS-X)
 * All routes are protected and require class authentication
 * 
 * NOTE: These routes are temporarily disabled as protectClass middleware
 * is not available in the current auth middleware.
 */

const express = require('express');
const router = express.Router();

// Import authentication middleware
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// TEMPORARY PLACEHOLDER ROUTES
// Controllers may need MongoDB/Mongoose updates
// ============================================

const unavailableHandler = (req, res) => {
  res.status(501).json({
    success: false,
    error: { message: 'This endpoint is temporarily unavailable.' }
  });
};

// Dashboard
router.get('/dashboard', unavailableHandler);

// Students
router.get('/students/next-id', unavailableHandler);
router.get('/students', unavailableHandler);
router.post('/students', unavailableHandler);
router.put('/students/:id', unavailableHandler);
router.put('/students/:id/reset-password', unavailableHandler);
router.post('/students/:id/reset-password', unavailableHandler);
router.delete('/students/:id', unavailableHandler);

// Homework
router.get('/homework', unavailableHandler);
router.post('/homework', unavailableHandler);
router.put('/homework/:id', unavailableHandler);
router.delete('/homework/:id', unavailableHandler);

// Circulars
router.get('/circulars', unavailableHandler);

// Exams
router.get('/exams', unavailableHandler);
router.get('/exams/:id', unavailableHandler);

// Exam schedules
router.get('/exam-schedules', unavailableHandler);

module.exports = router;