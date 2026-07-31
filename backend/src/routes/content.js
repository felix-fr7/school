/**
 * Content Routes (Public for Students, Teachers, and Class Controllers)
 * Handles read-only access to News, Circulars, and Exams using Mongoose
 */

const express = require('express');
const { query, param } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Class = require('../models/Class');
const contentController = require('../controllers/contentController');

const router = express.Router();

// Custom middleware that accepts both regular user tokens and class tokens via Mongoose
const protectContent = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized to access this route' },
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a class token (type: 'CLASS')
    if (decoded.type === 'CLASS' && decoded.classId) {
      req.user = {
        classId: decoded.classId,
        classCode: decoded.classCode,
        tenantId: decoded.tenantId,
        role: 'CLASS_CONTROLLER',
        type: 'CLASS',
      };
      return next();
    }

    // Regular user token - fetch user using Mongoose and populate relations
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('schoolId', 'schoolName schoolCode address')
      .populate('classId', 'className section');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    // Attach structured user object to req.user matching the app's expectations
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.schoolId ? user.schoolId._id : null,
      classId: user.classId ? user.classId._id : null,
      studentId: user.studentId,
      tenant: user.schoolId ? {
        id: user.schoolId._id,
        name: user.schoolId.schoolName,
        code: user.schoolId.schoolCode,
      } : null,
      class: user.classId ? {
        id: user.classId._id,
        name: user.classId.className,
        section: user.classId.section,
      } : null,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token' },
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired' },
      });
    }
    next(error);
  }
};

// All routes require authentication
router.use(protectContent);

// ============================================
// News Routes
// ============================================
router.get(
  '/news',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().trim(),
  ],
  contentController.getNews
);

router.get(
  '/news/:id',
  [param('id').isMongoId().withMessage('Invalid news ID format')],
  contentController.getNewsById
);

// ============================================
// Circular Routes
// ============================================
router.get(
  '/circulars',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  contentController.getCirculars
);

router.get(
  '/circulars/:id',
  [param('id').isMongoId().withMessage('Invalid circular ID format')],
  contentController.getCircularById
);

// ============================================
// Exam Routes
// ============================================
router.get(
  '/exams',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('classId').optional().isMongoId(),
  ],
  contentController.getExams
);

router.get(
  '/exams/:id',
  [param('id').isMongoId().withMessage('Invalid exam ID format')],
  contentController.getExamById
);

// ============================================
// Exam Schedule Routes
// ============================================
router.get(
  '/exam-schedules',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  contentController.getExamSchedules
);

router.get(
  '/exam-schedules/:id',
  [param('id').isMongoId().withMessage('Invalid exam schedule ID format')],
  contentController.getExamScheduleById
);

module.exports = router;