/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 * Also handles class-based login system
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const classAuthController = require('../controllers/classAuthController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, name }
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
  ],
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email OR student ID (roll number)
 * @access  Public
 * @body    { usernameOrEmailOrId, password }
 */
router.post(
  '/login',
  [
    body('usernameOrEmailOrId')
      .trim()
      .notEmpty()
      .withMessage('Email or Student ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   PUT /api/auth/me
 * @desc    Update user profile
 * @access  Private
 * @body    { name }
 */
router.put(
  '/me',
  [
    protect,
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
  ],
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/password
 * @desc    Update user password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.put(
  '/password',
  [
    protect,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('New password must contain at least one number'),
  ],
  authController.updatePassword
);

/**
 * @route   POST /api/auth/class-login
 * @desc    Login using class code and password (for Class-based dashboard access)
 * @access  Public
 * @body    { classCode, password }
 */
router.post(
  '/class-login',
  [
    body('classCode')
      .trim()
      .notEmpty()
      .withMessage('Class code is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  classAuthController.classLogin
);

/**
 * @route   GET /api/auth/class/dashboard
 * @desc    Get dashboard data for logged-in class
 * @access  Private (Class token required)
 */
router.get(
  '/class/dashboard',
  protect,
  classAuthController.getClassDashboard
);

module.exports = router;
