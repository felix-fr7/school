/**
 * Authentication Routes
 * Login, register, password reset
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { authenticate, generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * User login with email and password
 */
router.post('/login', async (req, res, next) => {
  try {
    console.log('Login attempt - Body:', JSON.stringify(req.body));
    // Accept both 'email' and 'usernameOrEmailOrId' for flexibility
    const { email, usernameOrEmailOrId, password } = req.body;
    const identifier = email || usernameOrEmailOrId;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username and password are required.',
        details: { identifier: !!identifier, password: !!password }
      });
    }

    // Find user by email or student ID (PostgreSQL with Supabase schema)
    // Note: Supabase schema uses quoted identifiers with camelCase
    const users = await query(
      `SELECT u.id, u.email, u.password, u.name, u.role, u."tenantId", u.phone,
              u."studentId", u."classId",
              c."class_code"
       FROM "User" u
       LEFT JOIN "Class" c ON u."classId" = c.id
       WHERE (u.email = $1 OR u."studentId" = $1)`,
      [identifier]
    );

    console.log('Login query result:', users);

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Get tenant info
    const tenants = await query(
      `SELECT id, name, code, address, phone, email FROM "Tenant" WHERE id = $1`,
      [user["tenantId"]]
    );

    const tenant = tenants && tenants.length > 0 ? tenants[0] : null;

    // Return user data (excluding password)
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          // Student specific
          studentId: user["studentId"],
          classId: user["classId"],
          classCode: user["class_code"]
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email
        } : null
      }
    });
  } catch (error) {
    console.error('Login DB Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/register
 * Register a new user (Admin only - for adding staff/students)
 */
router.post('/register', authenticate, async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      role,
      phone,
      // Student profile fields
      classId,
      rollNumber,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      city,
      state,
      fatherName,
      fatherPhone,
      motherName,
      motherPhone,
      // Teacher profile fields
      qualification,
      experienceYears,
      specialization,
      subjects
    } = req.body;

    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can register new users.'
      });
    }

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and role are required.'
      });
    }

    const validRoles = ['ADMIN', 'TEACHER', 'STUDENT'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be ADMIN, TEACHER, or STUDENT.'
      });
    }

    // Check if email already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();

    await query(
      `INSERT INTO users (id, tenant_id, email, phone, password, name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [userId, req.user.tenantId, email, phone || null, hashedPassword, name, role]
    );

    let profileData = null;

    // Create profile based on role
    if (role === 'STUDENT') {
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'Class ID is required for students.'
        });
      }

      // Generate student ID
      const studentCount = await query(
        `SELECT COUNT(*) as count FROM student_profiles WHERE tenant_id = ?`,
        [req.user.tenantId]
      );
      const nextStudentId = `STU-${String((studentCount[0]?.count || 0) + 1).padStart(4, '0')}`;

      await query(
        `INSERT INTO student_profiles 
         (id, user_id, class_id, tenant_id, student_id, roll_number, date_of_birth, gender, 
          blood_group, address, city, state, father_name, father_phone, mother_name, mother_phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [uuidv4(), userId, classId, req.user.tenantId, nextStudentId, rollNumber || null,
         dateOfBirth || null, gender || null, bloodGroup || null, address || null,
         city || null, state || null, fatherName || null, fatherPhone || null,
         motherName || null, motherPhone || null]
      );

      profileData = { studentId: nextStudentId };
    } else if (role === 'TEACHER') {
      // Generate teacher ID
      const teacherCount = await query(
        `SELECT COUNT(*) as count FROM teacher_profiles WHERE tenant_id = ?`,
        [req.user.tenantId]
      );
      const nextTeacherId = `TCH-${String((teacherCount[0]?.count || 0) + 1).padStart(4, '0')}`;

      await query(
        `INSERT INTO teacher_profiles 
         (id, user_id, tenant_id, teacher_id, qualification, experience_years, specialization, 
          subjects, date_of_birth, gender, address, city, state, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [uuidv4(), userId, req.user.tenantId, nextTeacherId, qualification || null,
         experienceYears || null, specialization || null, subjects ? JSON.stringify(subjects) : null,
         dateOfBirth || null, gender || null, address || null, city || null, state || null]
      );

      profileData = { teacherId: nextTeacherId };
    }

    res.status(201).json({
      success: true,
      message: `${role} registered successfully.`,
      data: {
        userId,
        email,
        name,
        role,
        ...profileData
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user details
    const users = await query(
      `SELECT u.id, u.email, u.name, u.role, u.tenant_id, u.avatar_url, u.phone, u.is_active,
              u.createdAt, u.updatedAt,
              sp.student_id, sp.roll_number, sp.class_id, sp.date_of_birth, sp.gender,
              sp.blood_group, sp.address, sp.city, sp.state, sp.father_name, sp.father_phone,
              sp.mother_name, sp.mother_phone,
              tp.teacher_id, tp.qualification, tp.experience_years, tp.specialization, tp.subjects
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Student specific
        studentId: user.student_id,
        rollNumber: user.roll_number,
        classId: user.class_id,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        bloodGroup: user.blood_group,
        address: user.address,
        city: user.city,
        state: user.state,
        fatherName: user.father_name,
        fatherPhone: user.father_phone,
        motherName: user.mother_name,
        motherPhone: user.mother_phone,
        // Teacher specific
        teacherId: user.teacher_id,
        qualification: user.qualification,
        experienceYears: user.experience_years,
        specialization: user.specialization,
        subjects: user.subjects ? JSON.parse(user.subjects) : null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Get current user
    const users = await query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (for token blacklisting if implemented)
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;