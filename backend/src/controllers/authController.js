/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
    const classAssignment = await prisma.class.findFirst({
      where: { teacherId: user.id },
      select: { id: true },
    });
    classId = classAssignment?.id || null;
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      classId: classId, // Only set for teachers assigned to a class
    },
    process.env.JWT_SECRET,
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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
        },
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate token
    const token = await generateToken(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
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
    // DEBUG: Log the entire request body to see exactly what frontend is sending
    console.log("Login Input:", JSON.stringify(req.body, null, 2));

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
    // This ensures all user roles (Admin, Teacher, Student) can log in with any identifier
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { studentId: loginIdentifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    }

    // Check password with detailed debugging
    console.log(`Password verification for user ${user.email} (ID: ${user.id})`);
    console.log(`Password hash in DB starts with: ${user.password.substring(0, 20)}...`);
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(`Password match result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      // DEBUG: Log more details about the failure
      console.log(`Authentication failed for user: ${user.email}`);
      console.log(`Attempted password length: ${password ? password.length : 0}`);
      console.log(`Stored hash: ${user.password}`);
      
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    }

    // Generate token
    const token = await generateToken(user);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
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
    // User is attached to request by protect middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
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

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
        },
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

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