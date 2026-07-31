/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 * Uses MongoDB/Mongoose queries
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Class = require('../models/Class');
const Post = require('../models/Post');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate JWT token for user
 * Includes classId for teachers if they are assigned to a class
 * @param {Object} user - User object containing id, email, role
 * @returns {string} JWT token
 */
const generateToken = async (user) => {
  // For teachers, check if they are assigned to a class
  let classId = null;
  if (user.role === 'TEACHER') {
    const classDoc = await Class.findOne({ teacherId: user.id }).select('_id');
    classId = classDoc ? classDoc._id.toString() : null;
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      classId: classId, // Only set for teachers assigned to a class
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
        },
      });
    }

    // Create user (password will be hashed by pre-save hook in User model)
    const user = new User({
      email: email.toLowerCase(),
      password: password, // Will be hashed by pre-save hook
      name: name
    });

    await user.save();

    // Generate token
    const token = await generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null
    });

    // Remove password from response
    const userObject = user.toObject();
    delete userObject.password;

    res.status(201).json({
      success: true,
      data: {
        user: userObject,
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
        },
      });
    }
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 * Supports universal login: email OR username OR studentId (roll number)
 * Works for all user roles: SUPER_ADMIN, ADMIN, TEACHER, STUDENT
 */
const login = async (req, res, next) => {
  try {
    const { password, usernameOrEmailOrId } = req.body;

    // The login identifier from the request body
    let loginIdentifier = usernameOrEmailOrId;

    // Clean up: Ensure it's trimmed
    if (loginIdentifier) {
      loginIdentifier = loginIdentifier.trim();
    }

    if (!loginIdentifier) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email or Student ID is required',
        },
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password is required',
        },
      });
    }

    // Universal lookup: search by email or studentId using OR condition
    const normalizedIdentifier = loginIdentifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { studentId: normalizedIdentifier }
      ],
      isActive: true
    });

    if (!user) {
      console.log(`Login failed: No user found with identifier "${loginIdentifier}" (normalized: "${normalizedIdentifier}")`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    }

    // Verify password using bcrypt.compare (secure comparison)
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    }

    // Generate token
    const token = await generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null
    });

    // Remove password from response
    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({
      success: true,
      data: {
        user: userObject,
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 * Protected route - requires valid JWT
 */
const getMe = async (req, res, next) => {
  try {
    // User is attached to request by authenticate middleware
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    // Get user's posts
    const posts = await Post.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        posts: posts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/auth/me
 * Protected route - requires valid JWT
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: user.toObject(),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user password
 * PUT /api/auth/password
 * Protected route - requires valid JWT
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
        },
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
};