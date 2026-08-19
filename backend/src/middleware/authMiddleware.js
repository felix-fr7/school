/**
 * Authentication Middleware
 * JWT token verification and user payload extraction
 * Phase 4 Implementation
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * JWT Token Verification Middleware
 * Extracts token from Authorization header, verifies it, and attaches user to request
 * 
 * Expected header format: Authorization: Bearer <token>
 * 
 * Supports both regular user tokens (userId) and class tokens (classId)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.split(' ')[1];

    if (!token || token === '') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token format.',
          code: 'INVALID_TOKEN_FORMAT'
        }
      });
    }

    // Verify token using JWT_SECRET
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
          error: {
            message: 'Invalid token or class not found.',
            code: 'INVALID_TOKEN'
          }
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
        error: {
          message: 'Invalid token or user not found.',
          code: 'INVALID_TOKEN'
        }
      });
    }

    // Attach user information to request object
    // Note: tenantId is derived from schoolId since User model uses schoolId to reference the tenant/school
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId.toString() : null,
      tenantId: user.schoolId ? user.schoolId.toString() : null, // Use schoolId as tenantId for multi-tenant queries
      // Additional fields for specific roles (User collection specific)
      studentId: user.studentId || null,
      classId: user.classId ? user.classId.toString() : null,
      rollNumber: user.rollNumber || null,
      // Teacher specific
      teacherId: user.teacherId ? user.teacherId.toString() : null,
      avatarUrl: user.avatarUrl || null,
      isClass: false
    };

    // Move to next middleware
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token.',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    // Handle other errors
    console.error('Authentication Error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during authentication.',
        code: 'AUTH_ERROR'
      }
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is present, but doesn't fail if invalid
 * Useful for endpoints that have different content for authenticated vs unauthenticated users
 * 
 * Supports both regular user tokens (userId) and class tokens (classId)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if this is a class token (has classId instead of userId)
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
          // Regular user token - find user in Admin or User collection
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
            // Note: tenantId is derived from schoolId since User model uses schoolId to reference the tenant/school
            req.user = {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
              schoolId: user.schoolId ? user.schoolId.toString() : null,
              tenantId: user.schoolId ? user.schoolId.toString() : null, // Use schoolId as tenantId for multi-tenant queries
              studentId: user.studentId || null,
              classId: user.classId ? user.classId.toString() : null,
              rollNumber: user.rollNumber || null,
              teacherId: user.teacherId ? user.teacherId.toString() : null,
              avatarUrl: user.avatarUrl || null,
              isClass: false
            };
          }
        }
      } catch (tokenError) {
        // Token is invalid, but we continue without user
        // This is intentional for optional auth
      }
    }
    
    next();
  } catch (error) {
    // Continue without user even if there's an error
    next();
  }
};

/**
 * Generate JWT Token
 * Creates a signed JWT token for a user
 * 
 * @param {Object} user - User object containing id, email, role, and schoolId
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

/**
 * Refresh Token
 * Generates a new token for an authenticated user
 * 
 * @param {Object} req - Express request object (must have req.user)
 * @returns {string} New JWT token
 */
const refreshToken = (req) => {
  if (!req.user) {
    throw new Error('No user found in request');
  }

  return jwt.sign(
    {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      schoolId: req.user.schoolId
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
  refreshToken,
  JWT_SECRET
};