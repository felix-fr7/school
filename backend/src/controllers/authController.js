/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 * Uses MongoDB/Mongoose queries
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Class = require('../models/Class');
const Post = require('../models/Post');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate JWT token for user
 * Includes classId for teachers if they are assigned to a class
 * @param {Object} user - User object containing id, email, role, schoolId
 * @returns {string} JWT token
 */
const generateToken = async (user) => {
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
      schoolId: user.schoolId,
      classId: classId,
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

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
        },
      });
    }

    const user = new User({
      email: email.toLowerCase(),
      password: password,
      name: name
    });

    await user.save();

    const token = await generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId.toString() : null
    });

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
    const { password, usernameOrEmailOrId, email } = req.body;
    let loginIdentifier = usernameOrEmailOrId || email;

    if (loginIdentifier) {
      loginIdentifier = loginIdentifier.trim();
    }

    if (!loginIdentifier || !password) {
      console.log('[DEBUG] Missing identifier or password');
      return res.status(400).json({
        success: false,
        error: { message: 'Email/Username and password are required' },
      });
    }

    const normalizedIdentifier = loginIdentifier.toLowerCase();
    console.log(`[DEBUG] Attempting login for normalized identifier: "${normalizedIdentifier}"`);
    
    let user = null;
    let isAdminLogin = false;
    
    // Fallback/Direct check across both collections simultaneously or check User if Admin fails
    // If you logged in with macvel@school.com but it's stored in User instead of Admin, this catches it!
    user = await Admin.findOne({
      email: { $regex: new RegExp(`^${normalizedIdentifier}$`, 'i') }
    }).select('+password');
    
    if (user) {
      isAdminLogin = true;
      console.log(`[LOGIN SUCCESS] Found admin in Admin collection: ${user.email}`);
    } else {
      console.log(`[DEBUG] Not found in Admin collection, checking User collection...`);
      user = await User.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${normalizedIdentifier}$`, 'i') } },
          { rollNumber: { $regex: new RegExp(`^${normalizedIdentifier}$`, 'i') } },
          { studentId: { $regex: new RegExp(`^${normalizedIdentifier}$`, 'i') } },
          { username: normalizedIdentifier }
        ]
      }).select('+password');

      if (user) {
        console.log(`[LOGIN SUCCESS] Found user in User collection: ${user.email || user.username || user.studentId}`);
      }
    }

    if (!user) {
      console.log(`[LOGIN ERROR] Login query result: Not found for identifier "${loginIdentifier}"`);
      return res.status(401).json({
        success: false,
        error: { message: 'Login query result: Not found' },
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    console.log(`[DEBUG] Password validation result for ${normalizedIdentifier}: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`[LOGIN ERROR] Invalid password for identifier "${loginIdentifier}"`);
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid credentials' },
      });
    }

    if (isAdminLogin && user._id) {
      await Admin.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {});
    }

    const token = await generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId.toString() : null
    });

    const userObject = user.toObject();
    delete userObject.password;

    res.status(200).json({
      success: true,
      data: { user: userObject, token },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('[CRITICAL LOGIN ERROR]:', error);
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    let user = await Admin.findById(req.user.id).select('-password');

    if (!user) {
      user = await User.findById(req.user.id).select('-password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    let posts = [];
    if (user.constructor.modelName === 'User') {
      posts = await Post.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(10);
    }

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
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    let user = await Admin.findByIdAndUpdate(
      req.user.id,
      { name: name },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      user = await User.findByIdAndUpdate(
        req.user.id,
        { name: name },
        { new: true, runValidators: true }
      ).select('-password');
    }

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
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let user = await Admin.findById(req.user.id).select('+password');

    if (!user) {
      user = await User.findById(req.user.id).select('+password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
        },
      });
    }

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