/**
 * Authentication Middleware
 * JWT token verification and role-based access control
 * Uses MongoDB/Mongoose queries
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT Token
 * Attaches user data to req.user
 * Supports both regular user tokens (userId) and class tokens (classId)
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

    // Check if this is a class token (has classId instead of userId)
    if (decoded.type === 'CLASS' && decoded.classId) {
      // This is a class login token - handle class authentication
      const Class = require('../models/Class');
      
      const classData = await Class.findOne({
        _id: decoded.classId,
        isActive: true
      });

      if (!classData) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token or class not found.'
        });
      }

      // Attach class data to request
      req.user = {
        id: classData._id.toString(),
        classId: classData._id.toString(),
        classCode: classData.classCode,
        name: classData.name,
        section: classData.section,
        role: 'CLASS',
        tenantId: classData.tenantId ? classData.tenantId.toString() : null,
        email: null,
        avatarUrl: null,
        studentId: null,
        rollNumber: null,
        teacherId: null,
        schoolId: null,
        isClass: true
      };

      return next();
    }

    // Regular user token - find user in Admin or User collection
    // First, try to find admin in Admin collection (for Super Admin and School Admin)
    let user = await Admin.findOne({
      _id: decoded.userId,
      isActive: true
    }).select('-password'); // Exclude password from response

    // If not found in Admin collection, try User collection (for students, teachers, parents)
    if (!user) {
      user = await User.findOne({
        _id: decoded.userId,
        isActive: true
      }).select('-password'); // Exclude password from response
    }

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
      schoolId: user.schoolId ? user.schoolId.toString() : null,
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
 * Handles both 'SUPER_ADMIN'/'Super Admin' style role formats
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Normalize user role and allowed roles to handle both formats
    const userRole = req.user.role || '';
    const normalizedUserRole = userRole.replace(/_/g, ' ').toUpperCase();
    const normalizedAllowedRoles = roles.map(r => r.replace(/_/g, ' ').toUpperCase());

    // Check if user role matches any allowed role (both exact and normalized)
    const isAllowed = roles.includes(userRole) || normalizedAllowedRoles.includes(normalizedUserRole);

    if (!isAllowed) {
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
 * Handles both 'SUPER_ADMIN' and 'Super Admin' role formats
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }
  
  // Normalize role to handle both 'SUPER_ADMIN' and 'Super Admin' formats
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  
  if (normalizedRole !== 'SUPER ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. SUPER_ADMIN role required.'
    });
  }
  
  next();
};

/**
 * Check if user is TENANT_ADMIN
 * Handles both 'TENANT_ADMIN' and 'Tenant Admin' formats
 */
const isTenantAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  if (normalizedRole !== 'TENANT ADMIN') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

/**
 * Check if user is Admin (School Admin)
 * Handles both 'ADMIN' and 'School Admin' formats
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  if (normalizedRole !== 'ADMIN' && normalizedRole !== 'SCHOOL ADMIN') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

/**
 * Check if user is Teacher
 * Handles both 'TEACHER' and 'Teacher' formats
 */
const isTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  if (normalizedRole !== 'TEACHER') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

/**
 * Check if user is Student
 * Handles both 'STUDENT' and 'Student' formats
 */
const isStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  if (normalizedRole !== 'STUDENT') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

/**
 * Check if user is Admin or Teacher
 * Handles both formats
 */
const isAdminOrTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  if (normalizedRole !== 'ADMIN' && normalizedRole !== 'SCHOOL ADMIN' && normalizedRole !== 'TEACHER') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

/**
 * Check if user is any type of admin (SUPER_ADMIN, TENANT_ADMIN, or ADMIN/School Admin)
 * Handles both formats
 */
const isAnyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  const userRole = req.user.role || '';
  const normalizedRole = userRole.replace(/_/g, ' ').toUpperCase();
  if (normalizedRole !== 'SUPER ADMIN' && normalizedRole !== 'TENANT ADMIN' && normalizedRole !== 'ADMIN' && normalizedRole !== 'SCHOOL ADMIN') {
    return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
  }
  next();
};

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
 * Supports both regular user tokens (userId) and class tokens (classId)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if this is a class token
      if (decoded.type === 'CLASS' && decoded.classId) {
        const Class = require('../models/Class');
        
        const classData = await Class.findOne({
          _id: decoded.classId,
          isActive: true
        });

        if (classData) {
          req.user = {
            id: classData._id.toString(),
            classId: classData._id.toString(),
            classCode: classData.classCode,
            name: classData.name,
            section: classData.section,
            role: 'CLASS',
            tenantId: classData.tenantId ? classData.tenantId.toString() : null,
            email: null,
            avatarUrl: null,
            studentId: null,
            rollNumber: null,
            teacherId: null,
            schoolId: null,
            isClass: true
          };
        }
      } else {
        // Regular user token
        // First, try to find admin in Admin collection
        let user = await Admin.findOne({
          _id: decoded.userId,
          isActive: true
        }).select('-password');

        // If not found in Admin collection, try User collection
        if (!user) {
          user = await User.findOne({
            _id: decoded.userId,
            isActive: true
          }).select('-password');
        }

        if (user) {
          req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId ? user.tenantId.toString() : null,
            schoolId: user.schoolId ? user.schoolId.toString() : null,
            avatarUrl: null,
            studentId: null,
            classId: null,
            teacherId: null
          };
        }
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