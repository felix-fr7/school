/**
 * Authentication Middleware
 * JWT token verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

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

    // Get user from database
    const users = await query(
      `SELECT u.id, u.email, u.name, u.role, u.tenant_id, u.avatar_url, u.is_active,
              sp.student_id, sp.class_id, sp.roll_number,
              tp.teacher_id
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.id = ? AND u.is_active = TRUE`,
      [decoded.userId]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated.'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      avatarUrl: user.avatar_url,
      // Student specific
      studentId: user.student_id,
      classId: user.class_id,
      rollNumber: user.roll_number,
      // Teacher specific
      teacherId: user.teacher_id
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
const isSuperAdmin = authorize('SUPER_ADMIN');

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
      
      const users = await query(
        `SELECT u.id, u.email, u.name, u.role, u.tenant_id, u.avatar_url,
                sp.student_id, sp.class_id,
                tp.teacher_id
         FROM users u
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
         WHERE u.id = ? AND u.is_active = TRUE`,
        [decoded.userId]
      );

      if (users && users.length > 0) {
        const user = users[0];
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id,
          avatarUrl: user.avatar_url,
          studentId: user.student_id,
          classId: user.class_id,
          teacherId: user.teacher_id
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
