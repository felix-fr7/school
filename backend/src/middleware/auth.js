/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens, attaches user to request, and enforces role-based access
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Protect routes - verify JWT token
 * Attach user data to request object
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route',
        },
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user from database to get role and tenant info
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { tenant: true, class: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    // Attach user to request (exclude password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
        },
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
        },
      });
    }

    next(error);
  }
};

/**
 * Optional authentication - attach user if token exists, but don't fail if no token
 * Useful for routes that have different content for logged in vs anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { tenant: true, class: true },
      });

      if (user) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      }
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Require Super Admin role
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
      },
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Super Admin privileges required.',
      },
    });
  }

  next();
};

/**
 * Require Admin role (School Admin)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
      },
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Admin privileges required.',
      },
    });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Admin not associated with any school',
      },
    });
  }

  next();
};

/**
 * Require Student role
 */
const requireStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
      },
    });
  }

  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Student privileges required.',
      },
    });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Student not associated with any school',
      },
    });
  }

  next();
};

/**
 * Require specific role (generic role checker)
 * @param {string|string[]} roles - Single role or array of roles
 */
const requireRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Check if user belongs to the same tenant (for tenant isolation)
 */
const checkTenantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
      },
    });
  }

  const { tenantId } = req.params;
  
  // Super Admin can access all tenants
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Admin and Student can only access their own tenant
  if (req.user.tenantId && req.user.tenantId === tenantId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      message: 'Access denied. Cannot access data from another school.',
    },
  });
};

module.exports = { 
  protect, 
  optionalAuth, 
  requireSuperAdmin, 
  requireAdmin, 
  requireStudent,
  requireRole,
  checkTenantAccess
};