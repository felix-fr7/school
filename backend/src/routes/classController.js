/**
 * Class Controller Routes
 * Routes for class-based login users (Class ID login - CLS-X)
 * All routes are protected and require authentication
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import authentication middleware
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================
// File Upload Configuration for Homework
// ============================================

// Ensure homework upload directory exists
const homeworkUploadDir = path.join(__dirname, '../../uploads/homework');
if (!fs.existsSync(homeworkUploadDir)) {
  fs.mkdirSync(homeworkUploadDir, { recursive: true });
}

// Configure multer for homework attachments
const homeworkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, homeworkUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'homework-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const homeworkUpload = multer({
  storage: homeworkStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF) and PDF files are allowed'), false);
    }
  }
});

/**
 * POST /api/class-controller/upload-homework-files
 * Upload files for homework attachments
 */
router.post('/upload-homework-files', homeworkUpload.array('files', 5), async (req, res, next) => {
  try {
    if (!req.user.isClass && req.user.role !== 'Teacher') {
      return res.status(401).json({
        success: false,
        error: { message: 'Teacher authentication required.' }
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No files uploaded.' }
      });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/homework/${file.filename}`,
      path: file.path
    }));

    res.json({
      success: true,
      data: { files },
      message: 'Files uploaded successfully.'
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    next(error);
  }
});

/**
 * DELETE /api/class-controller/homework-files/:filename
 * Delete a homework attachment file
 */
router.delete('/homework-files/:filename', async (req, res, next) => {
  try {
    if (!req.user.isClass && req.user.role !== 'Teacher') {
      return res.status(401).json({
        success: false,
        error: { message: 'Teacher authentication required.' }
      });
    }

    const { filename } = req.params;
    const filePath = path.join(homeworkUploadDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found.' }
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    next(error);
  }
});

// ============================================
// Dashboard
// ============================================

/**
 * GET /api/class-controller/dashboard
 * Returns dashboard data for the logged-in class
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    // Check if this is a class token
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    // Get class details
    const Class = require('../models/Class');
    const classData = await Class.findOne({
      _id: classId,
      isActive: true
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Class not found.' }
      });
    }

    // Get student count
    const User = require('../models/User');
    const studentCount = await User.countDocuments({
      classId: classId,
      role: 'Student',
      isActive: true
    });

    // Get homework count
    const Homework = require('../models/Homework');
    const homeworkCount = await Homework.countDocuments({
      classId: classId,
      isPublished: true
    });

    // Get exam count
    const Exam = require('../models/Exam');
    const examCount = await Exam.countDocuments({
      classId: classId,
      isPublished: true
    });

    // Get teacher info if assigned
    let teacher = null;
    if (classData.teacherId) {
      const teacherDoc = await User.findOne({
        _id: classData.teacherId,
        role: 'Teacher',
        isActive: true
      }).select('name email');

      if (teacherDoc) {
        teacher = {
          name: teacherDoc.name,
          email: teacherDoc.email
        };
      }
    }

    res.json({
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
          examCount
        },
        stats: {
          totalStudents: studentCount,
          totalHomework: homeworkCount,
          upcomingExams: examCount,
          attendanceRate: 94 // Default attendance rate
        }
      }
    });
  } catch (error) {
    console.error('Error in class dashboard:', error);
    next(error);
  }
});

// ============================================
// Students
// ============================================

/**
 * GET /api/class-controller/students
 * Get all students for the logged-in class
 */
router.get('/students', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const User = require('../models/User');
    
    let query = {
      classId: classId,
      role: 'Student',
      isActive: true
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(take)
      .sort({ name: 1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        students: students.map(s => ({
          id: s._id,
          name: s.name,
          email: s.email,
          studentId: s.studentId,
          created_at: s.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/class-controller/students/next-id
 * Get next available student ID
 */
router.get('/students/next-id', async (req, res, next) => {
  try {
    const User = require('../models/User');
    const count = await User.countDocuments({ role: 'Student' });
    const nextNumber = count + 1;
    const nextStudentId = `STU-${String(nextNumber).padStart(4, '0')}`;

    res.json({
      success: true,
      data: { nextStudentId }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/class-controller/students
 * Add a new student to the class
 */
router.post('/students', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { name, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student name is required.' }
      });
    }

    const User = require('../models/User');

    // Generate student ID
    const count = await User.countDocuments({ role: 'Student' });
    const nextNumber = count + 1;
    const studentId = `STU-${String(nextNumber).padStart(4, '0')}`;

    // Generate dummy email
    const dummyEmail = `stu-${studentId}-${Date.now().toString().slice(-6)}@school.internal`;

    // Use provided password or default temporary password
    // Note: Password will be hashed by User model's pre-save hook
    const finalPassword = password || 'Student@123';

    const student = await User.create({
      email: dummyEmail,
      password: finalPassword, // Plain password - will be hashed by model
      name: name.trim(),
      role: 'Student',
      tenantId: tenantId,
      studentId: studentId,
      classId: classId,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        created_at: student.createdAt,
        password: finalPassword
      },
      message: 'Student created successfully.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/class-controller/students/:id
 * Update a student
 */
router.put('/students/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const { id } = req.params;
    const { name, email, studentId } = req.body;

    const User = require('../models/User');

    // Verify student exists and belongs to this class
    const existingStudent = await User.findOne({
      _id: id,
      classId: classId,
      role: 'Student',
      isActive: true
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found in your class.' }
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (studentId !== undefined) updateData.studentId = studentId;

    const updatedStudent = await User.findOneAndUpdate(
      { _id: id, classId: classId, role: 'Student' },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/class-controller/students/:id/reset-password
 * Reset student password
 */
router.put('/students/:id/reset-password', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const { id } = req.params;
    const { password } = req.body;

    const User = require('../models/User');
    const bcrypt = require('bcryptjs');

    // Verify student exists and belongs to this class
    const existingStudent = await User.findOne({
      _id: id,
      classId: classId,
      role: 'Student',
      isActive: true
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found in your class.' }
      });
    }

    const newPassword = password || 'Student@123';

    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long.' }
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await User.findByIdAndUpdate(id, {
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      data: { password: newPassword },
      message: `Password reset successfully. New password: ${newPassword}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/class-controller/students/:id
 * Delete a student
 */
router.delete('/students/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const { id } = req.params;

    const User = require('../models/User');

    // Verify student exists and belongs to this class
    const existingStudent = await User.findOne({
      _id: id,
      classId: classId,
      role: 'Student',
      isActive: true
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found in your class.' }
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Student deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Exams
// ============================================

/**
 * GET /api/class-controller/exams
 * Get all exams for the class
 */
router.get('/exams', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const Exam = require('../models/Exam');

    const exams = await Exam.find({
      tenantId: tenantId,
      classId: classId,
      isPublished: true
    })
    .skip(skip)
    .limit(take)
    .sort({ createdAt: -1 });

    const total = await Exam.countDocuments({
      tenantId: tenantId,
      classId: classId,
      isPublished: true
    });

    res.json({
      success: true,
      data: {
        exams: exams.map(e => ({
          id: e._id,
          title: e.title || e.examName || 'Exam',
          examName: e.title || e.examName || 'Exam',
          classId: e.classId,
          tenantId: e.tenantId,
          fileUrl: e.fileUrl || e.pdfUrl || e.imageUrl,
          pdfUrl: e.pdfUrl || e.fileUrl,
          imageUrl: e.imageUrl || e.fileUrl,
          dueDate: e.dueDate,
          isPublished: e.isPublished,
          created_at: e.createdAt,
          updated_at: e.updatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Homework
// ============================================

/**
 * GET /api/class-controller/homework
 * Get all homework for the class
 */
router.get('/homework', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const Homework = require('../models/Homework');

    const homeworks = await Homework.find({
      classId: classId,
      isPublished: true
    })
    .skip(skip)
    .limit(take)
    .sort({ createdAt: -1 });

    const total = await Homework.countDocuments({
      classId: classId,
      isPublished: true
    });

    res.json({
      success: true,
      data: {
        homework: homeworks.map(h => ({
          id: h._id,
          title: h.title,
          subject: h.subject,
          description: h.description,
          dueDate: h.dueDate,
          givenDate: h.givenDate,
          classGrade: h.classGrade,
          isPublished: h.isPublished,
          maxMarks: h.maxMarks,
          attachments: h.attachments || [],
          created_at: h.createdAt,
          updated_at: h.updatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/class-controller/homework
 * Create a new homework for the class
 */
router.post('/homework', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const teacherId = req.user.id;
    
    const {
      title,
      subject,
      description,
      givenDate,
      dueDate,
      isPublished,
      maxMarks,
      attachments
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Homework title is required.' }
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Subject is required.' }
      });
    }

    if (!givenDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Given date is required.' }
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Due date is required.' }
      });
    }

    const Homework = require('../models/Homework');
    const Class = require('../models/Class');

    // Verify class exists and belongs to this tenant
    const classData = await Class.findOne({
      _id: classId,
      tenantId: tenantId
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Class not found.' }
      });
    }

    const homework = new Homework({
      title: title.trim(),
      subject: subject.trim(),
      classGrade: `${classData.name}${classData.section ? '-' + classData.section : ''}`,
      description: description ? description.trim() : '',
      givenDate: new Date(givenDate),
      dueDate: new Date(dueDate),
      teacher: teacherId,
      classId: classId,
      schoolId: tenantId,
      isPublished: isPublished !== undefined ? isPublished : true,
      maxMarks: maxMarks || 100,
      attachments: attachments || []
    });

    await homework.save();

    res.status(201).json({
      success: true,
      data: {
        id: homework._id,
        title: homework.title,
        subject: homework.subject,
        description: homework.description,
        givenDate: homework.givenDate,
        dueDate: homework.dueDate,
        classGrade: homework.classGrade,
        isPublished: homework.isPublished,
        created_at: homework.createdAt
      },
      message: 'Homework created successfully.'
    });
  } catch (error) {
    console.error('Error creating homework:', error);
    next(error);
  }
});

/**
 * PUT /api/class-controller/homework/:id
 * Update a homework assignment
 */
router.put('/homework/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const {
      title,
      subject,
      description,
      givenDate,
      dueDate,
      isPublished,
      maxMarks
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Homework title is required.' }
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Subject is required.' }
      });
    }

    if (!givenDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Given date is required.' }
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Due date is required.' }
      });
    }

    const Homework = require('../models/Homework');
    const Class = require('../models/Class');

    // Verify class exists and belongs to this tenant
    const classData = await Class.findOne({
      _id: classId,
      tenantId: tenantId
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Class not found.' }
      });
    }

    // Find and update homework
    const homework = await Homework.findOneAndUpdate(
      { _id: id, classId: classId, schoolId: tenantId },
      {
        title: title.trim(),
        subject: subject.trim(),
        classGrade: `${classData.name}${classData.section ? '-' + classData.section : ''}`,
        description: description ? description.trim() : '',
        givenDate: new Date(givenDate),
        dueDate: new Date(dueDate),
        isPublished: isPublished !== undefined ? isPublished : true,
        maxMarks: maxMarks || 100,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found.' }
      });
    }

    res.json({
      success: true,
      data: {
        id: homework._id,
        title: homework.title,
        subject: homework.subject,
        description: homework.description,
        givenDate: homework.givenDate,
        dueDate: homework.dueDate,
        classGrade: homework.classGrade,
        isPublished: homework.isPublished,
        updated_at: homework.updatedAt
      },
      message: 'Homework updated successfully.'
    });
  } catch (error) {
    console.error('Error updating homework:', error);
    next(error);
  }
});

/**
 * DELETE /api/class-controller/homework/:id
 * Delete a homework assignment
 */
router.delete('/homework/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const Homework = require('../models/Homework');

    // Find and delete homework
    const homework = await Homework.findOneAndDelete({
      _id: id,
      classId: classId,
      schoolId: tenantId
    });

    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found.' }
      });
    }

    res.json({
      success: true,
      message: 'Homework deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting homework:', error);
    next(error);
  }
});

/**
 * GET /api/class-controller/exams/:id
 * Get single exam details
 */
router.get('/exams/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const Exam = require('../models/Exam');

    const exam = await Exam.findOne({
      _id: id,
      tenantId: tenantId,
      classId: classId,
      isPublished: true
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found.' }
      });
    }

    res.json({
      success: true,
      data: {
        id: exam._id,
        title: exam.title || exam.examName || 'Exam',
        examName: exam.title || exam.examName || 'Exam',
        classId: exam.classId,
        tenantId: exam.tenantId,
        fileUrl: exam.fileUrl || exam.pdfUrl || exam.imageUrl,
        pdfUrl: exam.pdfUrl || exam.fileUrl,
        imageUrl: exam.imageUrl || exam.fileUrl,
        dueDate: exam.dueDate,
        isPublished: exam.isPublished,
        created_at: exam.createdAt,
        updated_at: exam.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Exam Schedules (Admin-published timetables)
// ============================================

/**
 * GET /api/class-controller/exam-schedules
 * Get all published exam schedules for the class (including school-wide)
 */
router.get('/exam-schedules', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const ExamSchedule = require('../models/ExamSchedule');

    // Find exam schedules: school-wide (classId is null) OR specific to this class
    const examSchedules = await ExamSchedule.find({
      tenantId: tenantId,
      isPublished: true,
      $or: [
        { classId: null },
        { classId: classId }
      ]
    })
    .skip(skip)
    .limit(take)
    .sort({ date: -1 });

    const total = await ExamSchedule.countDocuments({
      tenantId: tenantId,
      isPublished: true,
      $or: [
        { classId: null },
        { classId: classId }
      ]
    });

    res.json({
      success: true,
      data: {
        examSchedules: examSchedules.map(e => ({
          id: e._id,
          title: e.title,
          subject: e.subject,
          date: e.date,
          time: e.time,
          duration: e.duration,
          roomNo: e.roomNo,
          classId: e.classId,
          isPublished: e.isPublished,
          fileUrl: e.fileUrl,
          created_at: e.createdAt,
          updated_at: e.updatedAt,
          class: e.classId ? { id: e.classId } : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching exam schedules:', error);
    next(error);
  }
});

/**
 * GET /api/class-controller/exam-schedules/:id
 * Get single exam schedule details
 */
router.get('/exam-schedules/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass || !req.user.classId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Class authentication required.' }
      });
    }

    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const ExamSchedule = require('../models/ExamSchedule');

    const examSchedule = await ExamSchedule.findOne({
      _id: id,
      tenantId: tenantId,
      isPublished: true,
      $or: [
        { classId: null },
        { classId: classId }
      ]
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam schedule not found.' }
      });
    }

    res.json({
      success: true,
      data: {
        id: examSchedule._id,
        title: examSchedule.title,
        subject: examSchedule.subject,
        date: examSchedule.date,
        time: examSchedule.time,
        duration: examSchedule.duration,
        roomNo: examSchedule.roomNo,
        classId: examSchedule.classId,
        isPublished: examSchedule.isPublished,
        fileUrl: examSchedule.fileUrl,
        created_at: examSchedule.createdAt,
        updated_at: examSchedule.updatedAt,
        class: examSchedule.classId ? { id: examSchedule.classId } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Subjects Management (for Class Teachers)
// ============================================

/**
 * GET /api/class-controller/subjects
 * Get all subjects for the tenant
 */
router.get('/subjects', async (req, res, next) => {
  try {
    if (!req.user.isClass && req.user.role !== 'Teacher') {
      return res.status(401).json({
        success: false,
        error: { message: 'Teacher authentication required.' }
      });
    }

    const tenantId = req.user.tenantId;
    const Subject = require('../models/Subject');

    const subjects = await Subject.find({
      tenantId,
      isActive: true
    }).sort({ name: 1 });

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/class-controller/subjects
 * Create a new subject
 */
router.post('/subjects', async (req, res, next) => {
  try {
    if (!req.user.isClass && req.user.role !== 'Teacher') {
      return res.status(401).json({
        success: false,
        error: { message: 'Teacher authentication required.' }
      });
    }

    const Subject = require('../models/Subject');
    const { name, code, description } = req.body;
    const tenantId = req.user.tenantId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    // Generate code from name if not provided
    let subjectCode = code ? code.toUpperCase().trim() : null;
    if (!subjectCode) {
      const namePart = name.trim().substring(0, 3).toUpperCase();
      const count = await Subject.countDocuments({ tenantId });
      subjectCode = `${namePart}-${String(count + 1).padStart(3, '0')}`;
    }

    // Check if code already exists
    const existingSubject = await Subject.findOne({ code: subjectCode, tenantId });
    if (existingSubject) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }

    const subjectData = {
      tenantId,
      name: name.trim(),
      code: subjectCode,
      description: description ? description.trim() : '',
      isActive: true
    };

    const newSubject = new Subject(subjectData);
    await newSubject.save();

    res.status(201).json({ 
      success: true, 
      data: {
        id: newSubject._id,
        name: newSubject.name,
        code: newSubject.code,
        description: newSubject.description,
        isActive: newSubject.isActive,
        createdAt: newSubject.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    next(error);
  }
});

/**
 * PUT /api/class-controller/subjects/:id
 * Update a subject
 */
router.put('/subjects/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass && req.user.role !== 'Teacher') {
      return res.status(401).json({
        success: false,
        error: { message: 'Teacher authentication required.' }
      });
    }

    const { name, code, description } = req.body;
    const tenantId = req.user.tenantId;
    const Subject = require('../models/Subject');

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    const updateData = {
      name: name.trim(),
      code: code ? code.toUpperCase().trim() : undefined,
      description: description ? description.trim() : ''
    };

    const updatedSubject = await Subject.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ 
      success: true,
      data: {
        id: updatedSubject._id,
        name: updatedSubject.name,
        code: updatedSubject.code,
        description: updatedSubject.description,
        isActive: updatedSubject.isActive
      }
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    next(error);
  }
});

/**
 * DELETE /api/class-controller/subjects/:id
 * Delete a subject (soft delete)
 */
router.delete('/subjects/:id', async (req, res, next) => {
  try {
    if (!req.user.isClass && req.user.role !== 'Teacher') {
      return res.status(401).json({
        success: false,
        error: { message: 'Teacher authentication required.' }
      });
    }

    const tenantId = req.user.tenantId;
    const Subject = require('../models/Subject');

    const deletedSubject = await Subject.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { isActive: false },
      { new: true }
    );

    if (!deletedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
