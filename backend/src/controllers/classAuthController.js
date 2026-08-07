/**
 * Class Authentication Controller
 * Handles class-based login system where classes login with classCode and password
 * Uses MongoDB/Mongoose
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Class = require('../models/Class');
const User = require('../models/User');
const Homework = require('../models/Homework');
const Exam = require('../models/Exam');

/**
 * Class Login
 * POST /api/auth/class-login
 * @body { classCode, password }
 */
const classLogin = async (req, res, next) => {
  try {
    const { classCode, password } = req.body;

    // Validation
    if (!classCode || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Class code and password are required',
        },
      });
    }

    // Find class by classCode (MongoDB)
    const classData = await Class.findOne({ 
      classCode: classCode.toUpperCase() 
    }).select('+password');

    if (!classData) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class code or password',
        },
      });
    }

    // Check if password is set
    if (!classData.password) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Class password not set. Please contact your administrator.',
        },
      });
    }

    // Verify password using the model's comparePassword method
    const isPasswordValid = await classData.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class code or password',
        },
      });
    }

    // Get class statistics
    const studentCount = await User.countDocuments({ 
      classId: classData._id, 
      role: 'STUDENT' 
    });
    const homeworkCount = await Homework.countDocuments({ 
      classId: classData._id 
    });
    const examCount = await Exam.countDocuments({ 
      classId: classData._id, 
      isPublished: true 
    });

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

    // Create JWT token with class context
    const token = jwt.sign(
      {
        classId: classData._id,
        classCode: classData.classCode,
        tenantId: classData.tenantId,
        type: 'CLASS', // Distinguish from user tokens
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return class dashboard data
    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData._id,
          classCode: classData.classCode,
          name: classData.name,
          section: classData.section,
          teacher,
          studentCount,
          homeworkCount,
          examCount,
        },
        token,
      },
      message: 'Class login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Class Dashboard Data
 * GET /api/class/dashboard
 * Protected route for logged-in classes
 */
const getClassDashboard = async (req, res, next) => {
  try {
    // classId comes from the JWT token (set by classLogin middleware)
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    if (!classId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class session',
        },
      });
    }

    // Get class details (MongoDB)
    const classData = await Class.findOne({ 
      _id: classId, 
      tenantId: tenantId 
    }).populate('teacherId', 'name email phone');

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    // Get students in this class
    const students = await User.find({ 
      classId: classId, 
      role: 'STUDENT' 
    }).select('id name email studentId createdAt');

    // Get recent homework
    const homework = await Homework.find({ 
      classId: classId,
      isPublished: true 
    })
    .populate('assignedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get upcoming exams
    const exams = await Exam.find({ 
      classId: classId,
      isPublished: true,
      startDate: { $gte: new Date() }
    }).sort({ startDate: 1 }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData._id,
          classCode: classData.classCode,
          name: classData.name,
          section: classData.section,
          teacher: classData.teacherId ? {
            name: classData.teacherId.name,
            email: classData.teacherId.email,
            phone: classData.teacherId.phone,
          } : null,
        },
        students,
        homework,
        exams,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  classLogin,
  getClassDashboard,
};