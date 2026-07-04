/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [user.id]);
    classId = classResult.rows.length > 0 ? classResult.rows[0].id : null;
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
    const existingQuery = 'SELECT id FROM "User" WHERE email = $1';
    const existingResult = await db.query(existingQuery, [email]);

    if (existingResult.rows.length > 0) {
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
    const createQuery = `
      INSERT INTO "User" (email, password, name, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, email, name, role, "tenantId", "createdAt"
    `;
    const createResult = await db.query(createQuery, [email, hashedPassword, name]);
    const user = createResult.rows[0];

    // Generate token
    const token = await generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user,
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
    // IMPORTANT: Lowercase the email for case-insensitive matching
    // This ensures login works regardless of email case used during registration
    const normalizedIdentifier = loginIdentifier.toLowerCase();
    const userQuery = `
      SELECT * FROM "User"
      WHERE LOWER(email) = $1 OR "studentId" = $1
      LIMIT 1
    `;
    const userResult = await db.query(userQuery, [normalizedIdentifier]);

    if (userResult.rows.length === 0) {
      console.log(`Login failed: No user found with identifier "${loginIdentifier}" (normalized: "${normalizedIdentifier}")`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    }

    const user = userResult.rows[0];

    // Check password with detailed debugging
    console.log(`Password verification for user ${user.email} (ID: ${user.id})`);
    console.log(`Password hash in DB starts with: ${user.password.substring(0, 20)}...`);
    console.log(`Full stored hash: ${user.password}`);
    console.log(`Incoming password: "${password}"`);
    console.log(`Incoming password length: ${password ? password.length : 0}`);
    console.log(`Incoming password type: ${typeof password}`);
    console.log(`Stored hash type: ${typeof user.password}`);
    console.log(`Stored hash length: ${user.password.length}`);
    
    // Generate a test hash to verify bcrypt is working
    const testHash = await bcrypt.hash(password, 10);
    console.log(`Test hash of incoming password: ${testHash}`);
    console.log(`Does test hash start same as stored? ${testHash.startsWith(user.password.substring(0, 7))}`);
    
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
    const { password: userPassword, ...userWithoutPassword } = user;

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
    const userQuery = `
      SELECT * FROM "User" WHERE id = $1
    `;
    const userResult = await db.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const user = userResult.rows[0];

    // Get user's posts
    const postsQuery = `
      SELECT * FROM "Post"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;
    const postsResult = await db.query(postsQuery, [req.user.id]);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: {
        ...userWithoutPassword,
        posts: postsResult.rows,
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

    const updateQuery = `
      UPDATE "User"
      SET name = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING id, email, name, role, "tenantId", "createdAt", "updatedAt"
    `;
    const updateResult = await db.query(updateQuery, [name, req.user.id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const user = updateResult.rows[0];

    res.status(200).json({
      success: true,
      data: user,
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
    const userQuery = 'SELECT password FROM "User" WHERE id = $1';
    const userResult = await db.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
        },
      });
    }

    const user = userResult.rows[0];

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
    const updateQuery = `
      UPDATE "User"
      SET password = $1, "updatedAt" = NOW()
      WHERE id = $2
    `;
    await db.query(updateQuery, [hashedPassword, req.user.id]);

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