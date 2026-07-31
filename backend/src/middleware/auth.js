/**
 * Authentication Middleware
 * JWT token verification and role-based access control
 * Uses MongoDB/Mongoose queries
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT Token
 * Attaches user data to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from MongoDB database
    const user = await User.findOne({
      _id: decoded.userId,
      isActive: true
    }).select('-password'); // Exclude password from response

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.'
      });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ? user.tenantId.toString() : null,
      avatarUrl: user.avatarUrl || null,
      // Student specific
      studentId: user.studentId || null,
      classId: user.classId ? user.classId.toString() : null,
      rollNumber: user.rollNumber || null,
      // Teacher specific
      teacherId: user.teacherId ? user.teacherId.toString() : null
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    next(error);
  }
};

/**
 * Authorize specific roles
 * Usage: authorize('ADMIN'), authorize('ADMIN', 'TEACHER')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this action.'
      });
    }

    next();
  };
};

/**
 * Check if user is SUPER_ADMIN
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. SUPER_ADMIN role required.'
    });
  }
  
  next();
};

/**
 * Check if user is TENANT_ADMIN
 */
const isTenantAdmin = authorize('TENANT_ADMIN');

/**
 * Check if user is Admin
 */
const isAdmin = authorize('ADMIN');

/**
 * Check if user is Teacher
 */
const isTeacher = authorize('TEACHER');

/**
 * Check if user is Student
 */
const isStudent = authorize('STUDENT');

/**
 * Check if user is Admin or Teacher
 */
const isAdminOrTeacher = authorize('ADMIN', 'TEACHER');

/**
 * Check if user is any type of admin (SUPER_ADMIN, TENANT_ADMIN, or ADMIN)
 */
const isAnyAdmin = authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN');

/**
 * Generate JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Optional authentication - attaches user if token present, continues if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from MongoDB
      const user = await User.findOne({
        _id: decoded.userId,
        isActive: true
      }).select('-password');

      if (user) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId ? user.tenantId.toString() : null,
          avatarUrl: null,
          studentId: null,
          classId: null,
          teacherId: null
        };
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  isSuperAdmin,
  isTenantAdmin,
  isAdmin,
  isTeacher,
  isStudent,
  isAdminOrTeacher,
  isAnyAdmin,
  optionalAuth,
  generateToken,
  JWT_SECRET
};