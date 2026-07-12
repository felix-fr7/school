/**
 * Content Routes (Public for Students, Teachers, and Class Controllers)
 * Handles read-only access to News, Circulars, and Exams
 * Students, Teachers, and Class Controllers (CLS-X login) can access these endpoints
 */

const express = require('express');
const { query, param } = require('express-validator');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const contentController = require('../controllers/contentController');
const { protect, protectClass } = require('../middleware/auth');

const router = express.Router();

// Custom middleware that accepts both regular user tokens and class tokens
const protectContent = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized to access this route' },
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'No token provided' },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a class token (type: 'CLASS')
    if (decoded.type === 'CLASS' && decoded.classId) {
      // Class-based login - attach class info to req.user
      req.user = {
        classId: decoded.classId,
        classCode: decoded.classCode,
        tenantId: decoded.tenantId,
        role: 'CLASS_CONTROLLER', // Special role for class-based login
        type: 'CLASS',
      };
      return next();
    }

    // Regular user token - fetch user from database
    const userQuery = `
      SELECT 
        u.id, u.email, u.name, u.role, u."tenantId", u."classId", u."studentId",
        t.id as "tenant_table_id", t.name as "tenantName", t.code as "tenantCode",
        c.id as "class_table_id", c.name as "className", c.section as "classSection"
      FROM "User" u
      LEFT JOIN "Tenant" t ON u."tenantId" = t.id
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE u.id = $1
    `;
    const userResult = await db.query(userQuery, [decoded.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found' },
      });
    }

    const user = userResult.rows[0];
    const { password, ...userWithoutPassword } = user;

    if (user.tenantId) {
      userWithoutPassword.tenant = {
        id: user.tenantId,
        name: user.tenantName,
        code: user.tenantCode,
      };
    }
    if (user.classId) {
      userWithoutPassword.class = {
        id: user.classId,
        name: user.className,
        section: user.classSection,
      };
    }

    req.user = userWithoutPassword;
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

// All routes require authentication (student, teacher, admin, or class controller)
router.use(protectContent);

// ============================================
// News Routes
// ============================================

/**
 * @route   GET /api/content/news
 * @desc    Get all published news (visibility filtered by role)
 * @access  Student, Teacher, Admin
 * @query   page, limit, category
 */
router.get(
  '/news',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().trim(),
  ],
  contentController.getNews
);

/**
 * @route   GET /api/content/news/:id
 * @desc    Get single news article
 * @access  Student, Teacher, Admin
 */
router.get(
  '/news/:id',
  [param('id').isUUID().withMessage('Invalid news ID format')],
  contentController.getNewsById
);

// ============================================
// Circular Routes
// ============================================

/**
 * @route   GET /api/content/circulars
 * @desc    Get all published circulars (visibility filtered by role)
 * @access  Student, Teacher, Admin
 * @query   page, limit
 */
router.get(
  '/circulars',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  contentController.getCirculars
);

/**
 * @route   GET /api/content/circulars/:id
 * @desc    Get single circular
 * @access  Student, Teacher, Admin
 */
router.get(
  '/circulars/:id',
  [param('id').isUUID().withMessage('Invalid circular ID format')],
  contentController.getCircularById
);

// ============================================
// Exam Routes (New Exam Table)
// ============================================

/**
 * @route   GET /api/content/exams
 * @desc    Get all published exam timetables (public to all roles)
 * @access  Student, Teacher, Admin
 * @query   page, limit, classId
 */
router.get(
  '/exams',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('classId').optional().isUUID(),
  ],
  contentController.getExams
);

/**
 * @route   GET /api/content/exams/:id
 * @desc    Get single exam timetable
 * @access  Student, Teacher, Admin
 */
router.get(
  '/exams/:id',
  [param('id').isUUID().withMessage('Invalid exam ID format')],
  contentController.getExamById
);

// ============================================
// Exam Schedule Routes (Legacy ExamSchedule Table)
// ============================================

/**
 * @route   GET /api/content/exam-schedules
 * @desc    Get upcoming exam schedules
 * @access  Student, Teacher, Admin
 * @query   page, limit
 */
router.get(
  '/exam-schedules',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  contentController.getExamSchedules
);

/**
 * @route   GET /api/content/exam-schedules/:id
 * @desc    Get single exam schedule
 * @access  Student, Teacher, Admin
 */
router.get(
  '/exam-schedules/:id',
  [param('id').isUUID().withMessage('Invalid exam schedule ID format')],
  contentController.getExamScheduleById
);

module.exports = router;