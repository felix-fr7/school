/**
 * Authentication Routes
 * Login, register, password reset
 * Using MongoDB/Mongoose models
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Tenant = require('../models/Tenant');
const Class = require('../models/Class');
const { authenticate, generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/class-login
 * Class login with class code and password
 */
router.post('/class-login', async (req, res, next) => {
  try {
    const { classCode, password } = req.body;

    // DEBUG: Log incoming request
    console.log('[CLASS-LOGIN] === Incoming Request ===');
    console.log('[CLASS-LOGIN] Request body:', JSON.stringify({ classCode, password }));

    // Validation
    if (!classCode || !password) {
      console.log('[CLASS-LOGIN] FAIL: Missing classCode or password');
      return res.status(400).json({
        success: false,
        error: {
          message: 'Class code and password are required',
        },
      });
    }

    // Find class by classCode (MongoDB) - with flexible lookup
    // Trim whitespace and convert to uppercase
    let normalizedCode = classCode.trim().toUpperCase();
    
    // Handle variations like "CLS-3" vs "CLS-003" by padding numbers
    // Pattern: XXX-NNN where XXX is letters and NNN is 1-3 digit number
    const codeMatch = normalizedCode.match(/^([A-Z]+)-(\d+)$/);
    if (codeMatch) {
      const prefix = codeMatch[1];
      const number = codeMatch[2];
      // Pad the number to 3 digits (e.g., "3" becomes "003")
      normalizedCode = `${prefix}-${number.padStart(3, '0')}`;
    }
    
    console.log('[CLASS-LOGIN] Normalized classCode:', normalizedCode, '(original:', classCode, ')');
    
    // Try exact match first, then try flexible lookup if not found
    let classData = await Class.findOne({ 
      classCode: normalizedCode 
    }).select('+password');
    
    // If not found and the normalized code is different from what we computed, try alternative formats
    if (!classData) {
      // Try without padding (e.g., CLS-3)
      if (codeMatch) {
        const altCode = `${codeMatch[1]}-${codeMatch[2]}`;
        console.log('[CLASS-LOGIN] Trying alternative format:', altCode);
        classData = await Class.findOne({ 
          classCode: altCode 
        }).select('+password');
      }
    }

    if (!classData) {
      console.log('[CLASS-LOGIN] FAIL: Class not found in database');
      console.log('[CLASS-LOGIN] Searched for:', { classCode: normalizedCode });
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class code or password',
        },
      });
    }

    console.log('[CLASS-LOGIN] Class found:', {
      _id: classData._id,
      name: classData.name,
      section: classData.section,
      classCode: classData.classCode,
      hasPassword: !!classData.password,
      passwordHash: classData.password ? classData.password.substring(0, 30) + '...' : null,
      tenantId: classData.tenantId
    });

    // Check if password is set
    if (!classData.password) {
      console.log('[CLASS-LOGIN] FAIL: Class exists but password is not set');
      return res.status(401).json({
        success: false,
        error: {
          message: 'Class password not set. Please contact your administrator.',
        },
      });
    }

    // Verify password using the model's comparePassword method
    console.log('[CLASS-LOGIN] Comparing password...');
    const isPasswordValid = await classData.comparePassword(password);
    console.log('[CLASS-LOGIN] Password comparison result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[CLASS-LOGIN] FAIL: Password does not match');
      console.log('[CLASS-LOGIN] Entered password:', password);
      console.log('[CLASS-LOGIN] Stored hash:', classData.password);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class code or password',
        },
      });
    }

    console.log('[CLASS-LOGIN] SUCCESS: Login successful for class', classData.classCode);

    // Create JWT token with class context
    const token = jwt.sign(
      {
        classId: classData._id,
        classCode: classData.classCode,
        tenantId: classData.tenantId,
        type: 'CLASS',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Get teacher info if assigned
    let teacher = null;
    if (classData.teacherId) {
      const teacherDoc = await User.findOne({ 
        _id: classData.teacherId, 
        role: 'TEACHER' 
      }).select('name email');
      
      if (teacherDoc) {
        teacher = {
          name: teacherDoc.name,
          email: teacherDoc.email,
        };
      }
    }

    // Return class data
    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData._id,
          classCode: classData.classCode,
          name: classData.name,
          section: classData.section,
          teacher,
          studentCount: 0,
          homeworkCount: 0,
          examCount: 0,
        },
        token,
      },
      message: 'Class login successful',
    });
  } catch (error) {
    next(error);
  }
});

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

    const normalizedIdentifier = identifier.trim().toLowerCase();
    console.log(`[LOGIN] Attempting login for: "${normalizedIdentifier}"`);

    let user = null;
    let isAdminLogin = false;

    // First, try to find admin in Admin collection (for Super Admin and School Admin)
    user = await Admin.findOne({
      email: normalizedIdentifier
    }).select('+password');

    if (user) {
      isAdminLogin = true;
      console.log(`[LOGIN] Found admin in Admin collection: ${user.email}`);
    } else {
      // If not found in Admin collection, try User collection (for students, teachers, parents)
      console.log(`[LOGIN] Not found in Admin collection, checking User collection...`);
      user = await User.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${normalizedIdentifier}$`, 'i') } },
          { studentId: { $regex: new RegExp(`^${normalizedIdentifier}$`, 'i') } }
        ]
      }).select('+password').populate('schoolId').populate('classId');

      if (user) {
        console.log(`[LOGIN] Found user in User collection: ${user.email}`);
      }
    }

    if (!user) {
      console.log(`[LOGIN] Login failed: No user found with identifier "${normalizedIdentifier}"`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password using model method
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      console.log(`[LOGIN] Invalid password for: ${normalizedIdentifier}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Update last login for admins
    if (isAdminLogin && user._id) {
      await Admin.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {});
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Get tenant/school info (SUPER_ADMIN has no school)
    let tenant = null;
    if (user.schoolId) {
      // For now, we'll use school as tenant equivalent
      tenant = {
        id: user.schoolId._id,
        name: user.schoolId.schoolName,
        code: user.schoolId.schoolCode,
        address: user.schoolId.address,
        phone: user.schoolId.contactPhone,
        email: user.schoolId.contactEmail
      };
    }

    // Get class code if user is a student
    let classCode = null;
    if (user.classId) {
      classCode = user.classId.classCode;
    }

    // Return user data (excluding password)
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          // Student specific
          studentId: user.studentId,
          classId: user.classId ? user.classId._id : null,
          classCode: classCode
        },
        tenant: tenant
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

    // Check if user is admin (Super Admin or School Admin)
    if (req.user.role !== 'Super Admin' && req.user.role !== 'School Admin') {
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

    const validRoles = ['Super Admin', 'School Admin', 'Teacher', 'Student', 'Parent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Super Admin, School Admin, Teacher, Student, or Parent.'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // Map role to match model enum
    const roleMap = {
      'ADMIN': 'School Admin',
      'TEACHER': 'Teacher',
      'STUDENT': 'Student',
      'SUPER_ADMIN': 'Super Admin',
      'PARENT': 'Parent'
    };
    const mappedRole = roleMap[role] || role;

    // Create user data
    const userData = {
      email,
      password, // Will be hashed by pre-save hook
      name,
      role: mappedRole,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      address: {
        street: address || null,
        city: city || null,
        state: state || null,
        country: 'USA'
      },
      isActive: true
    };

    // Add schoolId for non-Super Admin roles
    if (mappedRole !== 'Super Admin' && req.user.schoolId) {
      userData.schoolId = req.user.schoolId;
    }

    // Add student-specific fields
    if (mappedRole === 'Student' && classId) {
      userData.studentId = `STU-${String(Date.now()).slice(-6)}`;
      userData.rollNumber = rollNumber || null;
      userData.classId = classId;
    }

    // Add teacher-specific fields
    if (mappedRole === 'Teacher') {
      userData.qualification = qualification || null;
      userData.specialization = specialization || null;
    }

    // Create user
    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: `${mappedRole} registered successfully.`,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId || null,
        teacherId: user.qualification ? `TCH-${String(Date.now()).slice(-6)}` : null
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 * Works for both regular users (User collection) and admins (Admin collection)
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`[GET ME] Fetching profile for userId: ${userId}`);

    // First, try to find admin in Admin collection
    let user = await Admin.findById(userId);

    if (user) {
      console.log(`[GET ME] Found admin in Admin collection: ${user.email}`);
    } else {
      // If not found in Admin collection, try User collection
      console.log(`[GET ME] Not found in Admin collection, checking User collection...`);
      user = await User.findById(userId)
        .populate('schoolId')
        .populate('classId')
        .populate('parentOf');

      if (user) {
        console.log(`[GET ME] Found user in User collection: ${user.email}`);
      }
    }

    if (!user) {
      console.log(`[GET ME] User not found with id: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Return user data (excluding password)
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: user.address,
        studentId: user.studentId || null,
        rollNumber: user.rollNumber || null,
        classId: user.classId ? user.classId._id : null,
        schoolId: user.schoolId ? user.schoolId._id : null,
        schoolName: user.schoolId ? user.schoolId.schoolName : null,
        parentOf: user.parentOf ? user.parentOf.map(p => p._id) : [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
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

    // Get current user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
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