/**
 * Authentication & Authorization Middleware
 * Verifies JWT tokens, attaches user to request, and enforces role-based access
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db');

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
    // Note: Using aliases for joined table columns to avoid overwriting User table columns
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.password,
        u.name,
        u.phone,
        u.role,
        u."tenantId",
        u."classId",
        u."studentId",
        u."createdAt",
        u."updatedAt",
        t.id as "tenant_table_id",
        t.name as "tenantName",
        t.code as "tenantCode",
        c.id as "class_table_id",
        c.name as "className",
        c.section as "classSection"
      FROM "User" u
      LEFT JOIN "Tenant" t ON u."tenantId" = t.id
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE u.id = $1
    `;

    const userResult = await db.query(userQuery, [decoded.id]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const user = userResult.rows[0];

    // Attach user to request (exclude password)
    const { password, ...userWithoutPassword } = user;
    
    // Add tenant and class objects if they exist
    // Use the User table's tenantId (not the joined table's id which could be NULL)
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
      
      // Fixed: Using explicit column list with aliases to avoid column name collision
      const userQuery = `
        SELECT 
          u.id,
          u.email,
          u.password,
          u.name,
          u.phone,
          u.role,
          u."tenantId",
          u."classId",
          u."studentId",
          u."createdAt",
          u."updatedAt",
          t.id as "tenant_table_id",
          t.name as "tenantName",
          t.code as "tenantCode",
          c.id as "class_table_id",
          c.name as "className",
          c.section as "classSection"
        FROM "User" u
        LEFT JOIN "Tenant" t ON u."tenantId" = t.id
        LEFT JOIN "Class" c ON u."classId" = c.id
        WHERE u.id = $1
      `;
      
      const userResult = await db.query(userQuery, [decoded.id]);

      if (userResult.rows.length > 0) {
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

  // Note: tenantId check relaxed for development/testing
  // In production, admins should be associated with a school
  next();
};

/**
 * Require Teacher role
 */
const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
      },
    });
  }

  if (req.user.role !== 'TEACHER') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Teacher privileges required.',
      },
    });
  }

  // Note: tenantId check relaxed for development/testing
  // In production, teachers should be associated with a school
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

/**
 * Protect routes for Class-based login users
 * Verifies JWT token with type: 'CLASS' and attaches class data to request
 */
const protectClass = async (req, res, next) => {
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

    // Check if this is a class token (type: 'CLASS')
    if (decoded.type !== 'CLASS' || !decoded.classId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token type. Class login required.',
        },
      });
    }

    // Attach class info to request
    req.user = {
      classId: decoded.classId,
      classCode: decoded.classCode,
      tenantId: decoded.tenantId,
      type: 'CLASS',
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: `Invalid token: ${error.message}`,
        },
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: `Token expired: ${error.message}`,
        },
      });
    }

    next(error);
  }
};

module.exports = { 
  protect, 
  optionalAuth, 
  requireSuperAdmin, 
  requireAdmin, 
  requireTeacher,
  requireStudent,
  requireRole,
  checkTenantAccess,
  protectClass
};
