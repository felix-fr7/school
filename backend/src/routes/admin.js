/**
 * Admin Routes
 * Handles school admin operations for managing students, classes, homework, marks, news, etc.
 * All routes require Admin role
 */

const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads (memory storage for Excel parsing)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'), false);
    }
  },
});

// All routes require Admin role
router.use(protect);
router.use(requireAdmin);

// ============================================
// Class Management Routes
// ============================================

/**
 * @route   GET /api/admin/classes
 * @desc    Get all classes for admin's school
 * @access  Admin
 */
router.get('/classes', adminController.getAllClasses);

/**
 * @route   GET /api/admin/classes/:id/dashboard
 * @desc    Get class dashboard data with metrics, recent homework, exams, and announcements
 * @access  Admin
 */
router.get(
  '/classes/:id/dashboard',
  [param('id').isUUID().withMessage('Invalid class ID format')],
  adminController.getClassDashboard
);

/**
 * @route   GET /api/admin/classes/:id
 * @desc    Get single class with students
 * @access  Admin
 */
router.get(
  '/classes/:id',
  [param('id').isUUID().withMessage('Invalid class ID format')],
  adminController.getClassById
);

/**
 * @route   POST /api/admin/classes
 * @desc    Create a new class
 * @access  Admin
 * @body    { name, section }
 */
router.post(
  '/classes',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Class name is required')
      .isLength({ max: 100 })
      .withMessage('Class name must be less than 100 characters'),
    body('section')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Section must be less than 10 characters'),
  ],
  adminController.createClass
);

/**
 * @route   PUT /api/admin/classes/:id
 * @desc    Update a class
 * @access  Admin
 */
router.put(
  '/classes/:id',
  [
    param('id').isUUID().withMessage('Invalid class ID format'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Class name cannot be empty'),
    body('section')
      .optional()
      .trim()
      .isLength({ max: 10 }),
  ],
  adminController.updateClass
);

/**
 * @route   DELETE /api/admin/classes/:id
 * @desc    Delete a class
 * @access  Admin
 */
router.delete(
  '/classes/:id',
  [param('id').isUUID().withMessage('Invalid class ID format')],
  adminController.deleteClass
);

// ============================================
// Student Management Routes
// ============================================

/**
 * @route   GET /api/admin/students
 * @desc    Get all students for admin's school
 * @access  Admin
 * @query   classId, search, page, limit
 */
router.get(
  '/students',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  adminController.getAllStudents
);

/**
 * @route   GET /api/admin/students/:id
 * @desc    Get single student details
 * @access  Admin
 */
router.get(
  '/students/:id',
  [param('id').isUUID().withMessage('Invalid student ID format')],
  adminController.getStudentById
);

/**
 * @route   POST /api/admin/students
 * @desc    Create a new student (with login credentials)
 * @access  Admin
 * @body    { name, email, password, studentId, classId }
 */
router.post(
  '/students',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Student name is required')
      .isLength({ max: 100 })
      .withMessage('Student name must be less than 100 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('studentId')
      .trim()
      .notEmpty()
      .withMessage('Student ID is required')
      .isLength({ max: 50 })
      .withMessage('Student ID must be less than 50 characters'),
    body('classId')
      .optional()
      .isUUID()
      .withMessage('Invalid class ID format'),
  ],
  adminController.createStudent
);

/**
 * @route   PUT /api/admin/students/:id
 * @desc    Update a student
 * @access  Admin
 */
router.put(
  '/students/:id',
  [
    param('id').isUUID().withMessage('Invalid student ID format'),
    body('name')
      .optional()
      .trim()
      .notEmpty(),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail(),
    body('classId')
      .optional()
      .isUUID(),
  ],
  adminController.updateStudent
);

/**
 * @route   DELETE /api/admin/students/:id
 * @desc    Delete a student
 * @access  Admin
 */
router.delete(
  '/students/:id',
  [param('id').isUUID().withMessage('Invalid student ID format')],
  adminController.deleteStudent
);

/**
 * @route   GET /api/admin/students/template
 * @desc    Get student import template (column headers and sample data)
 * @access  Admin
 */
router.get(
  '/students/template',
  adminController.getStudentTemplate
);

/**
 * @route   POST /api/admin/students/manual
 * @desc    Create a student manually with extended fields (rollNumber, studentName, classAndSection, parentMobile, bloodGroup, studentAddress, userId, password)
 * @access  Admin
 */
router.post(
  '/students/manual',
  [
    body('rollNumber')
      .trim()
      .notEmpty()
      .withMessage('Roll number is required'),
    body('studentName')
      .trim()
      .notEmpty()
      .withMessage('Student name is required'),
    body('userId')
      .isEmail()
      .withMessage('Please provide a valid email for userId')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('parentMobile')
      .optional()
      .trim(),
    body('bloodGroup')
      .optional()
      .trim(),
    body('studentAddress')
      .optional()
      .trim(),
    body('classAndSection')
      .optional()
      .trim(),
    body('className')
      .optional()
      .trim(),
  ],
  adminController.createStudentManual
);

/**
 * @route   POST /api/admin/students/bulk
 * @desc    Bulk import students from Excel file (.xlsx, .xls, .csv)
 * @access  Admin
 * @form    file (Excel file with columns: rollNumber, studentName, classAndSection, parentMobile, bloodGroup, studentAddress, userId, password)
 */
router.post(
  '/students/bulk',
  upload.single('file'),
  adminController.bulkImportStudents
);

// ============================================
// Homework Management Routes
// ============================================

/**
 * @route   GET /api/admin/homework
 * @desc    Get all homework for admin's school
 * @access  Admin
 * @query   classId, isPublished, page, limit
 */
router.get(
  '/homework',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  adminController.getAllHomework
);

/**
 * @route   GET /api/admin/homework/:id
 * @desc    Get single homework
 * @access  Admin
 */
router.get(
  '/homework/:id',
  [param('id').isUUID().withMessage('Invalid homework ID format')],
  adminController.getHomeworkById
);

/**
 * @route   POST /api/admin/homework
 * @desc    Create new homework
 * @access  Admin
 * @body    { title, description, subject, classId, dueDate }
 */
router.post(
  '/homework',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Homework title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Homework description is required'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('classId')
      .isUUID()
      .withMessage('Valid class ID is required'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ],
  adminController.createHomework
);

/**
 * @route   PUT /api/admin/homework/:id
 * @desc    Update homework
 * @access  Admin
 */
router.put(
  '/homework/:id',
  [
    param('id').isUUID().withMessage('Invalid homework ID format'),
    body('title')
      .optional()
      .trim()
      .notEmpty(),
    body('description')
      .optional()
      .trim()
      .notEmpty(),
    body('subject')
      .optional()
      .trim()
      .notEmpty(),
    body('classId')
      .optional()
      .isUUID(),
    body('dueDate')
      .optional()
      .isISO8601(),
    body('isPublished')
      .optional()
      .isBoolean(),
  ],
  adminController.updateHomework
);

/**
 * @route   DELETE /api/admin/homework/:id
 * @desc    Delete homework
 * @access  Admin
 */
router.delete(
  '/homework/:id',
  [param('id').isUUID().withMessage('Invalid homework ID format')],
  adminController.deleteHomework
);

// ============================================
// Marks Management Routes
// ============================================

/**
 * @route   GET /api/admin/marks
 * @desc    Get all marks for admin's school
 * @access  Admin
 */
router.get('/marks', adminController.getAllMarks);

/**
 * @route   POST /api/admin/marks
 * @desc    Create new marks entry
 * @access  Admin
 */
router.post(
  '/marks',
  [
    body('studentId')
      .isUUID()
      .withMessage('Valid student ID is required'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('marksObtained')
      .isFloat({ min: 0 })
      .withMessage('Marks obtained must be a positive number'),
    body('totalMarks')
      .isFloat({ min: 1 })
      .withMessage('Total marks must be greater than 0'),
    body('examType')
      .trim()
      .notEmpty()
      .withMessage('Exam type is required'),
    body('examDate')
      .optional()
      .isISO8601(),
    body('remarks')
      .optional()
      .trim(),
  ],
  adminController.createMark
);

/**
 * @route   PUT /api/admin/marks/:id
 * @desc    Update marks
 * @access  Admin
 */
router.put(
  '/marks/:id',
  [
    param('id').isUUID().withMessage('Invalid mark ID format'),
    body('marksObtained')
      .optional()
      .isFloat({ min: 0 }),
    body('totalMarks')
      .optional()
      .isFloat({ min: 1 }),
    body('grade')
      .optional()
      .trim(),
    body('remarks')
      .optional()
      .trim(),
    body('isPublished')
      .optional()
      .isBoolean(),
  ],
  adminController.updateMark
);

/**
 * @route   DELETE /api/admin/marks/:id
 * @desc    Delete marks
 * @access  Admin
 */
router.delete(
  '/marks/:id',
  [param('id').isUUID().withMessage('Invalid mark ID format')],
  adminController.deleteMark
);

// ============================================
// News Management Routes
// ============================================

/**
 * @route   GET /api/admin/news
 * @desc    Get all news for admin's school
 * @access  Admin
 */
router.get('/news', adminController.getAllNews);

/**
 * @route   POST /api/admin/news
 * @desc    Create new news
 * @access  Admin
 */
router.post(
  '/news',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('News title is required'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('News content is required'),
    body('summary')
      .optional()
      .trim(),
    body('category')
      .optional()
      .trim(),
    body('imageUrl')
      .optional()
      .isURL(),
  ],
  adminController.createNews
);

/**
 * @route   PUT /api/admin/news/:id
 * @desc    Update news
 * @access  Admin
 */
router.put(
  '/news/:id',
  [
    param('id').isUUID().withMessage('Invalid news ID format'),
    body('title')
      .optional()
      .trim()
      .notEmpty(),
    body('content')
      .optional()
      .trim()
      .notEmpty(),
    body('isPublished')
      .optional()
      .isBoolean(),
  ],
  adminController.updateNews
);

/**
 * @route   DELETE /api/admin/news/:id
 * @desc    Delete news
 * @access  Admin
 */
router.delete(
  '/news/:id',
  [param('id').isUUID().withMessage('Invalid news ID format')],
  adminController.deleteNews
);

// ============================================
// Circular Management Routes
// ============================================

/**
 * @route   GET /api/admin/circulars
 * @desc    Get all circulars for admin's school
 * @access  Admin
 */
router.get('/circulars', adminController.getAllCirculars);

/**
 * @route   POST /api/admin/circulars
 * @desc    Create new circular
 * @access  Admin
 */
router.post(
  '/circulars',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Circular title is required'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Circular content is required'),
    body('circularNo')
      .optional()
      .trim(),
  ],
  adminController.createCircular
);

/**
 * @route   DELETE /api/admin/circulars/:id
 * @desc    Delete circular
 * @access  Admin
 */
router.delete(
  '/circulars/:id',
  [param('id').isUUID().withMessage('Invalid circular ID format')],
  adminController.deleteCircular
);

// ============================================
// Exam Schedule Management Routes
// ============================================

/**
 * @route   GET /api/admin/exam-schedules
 * @desc    Get all exam schedules for admin's school
 * @access  Admin
 */
router.get('/exam-schedules', adminController.getAllExamSchedules);

/**
 * @route   POST /api/admin/exam-schedules
 * @desc    Create new exam schedule
 * @access  Admin
 */
router.post(
  '/exam-schedules',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Exam title is required'),
    body('subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('date')
      .isISO8601()
      .withMessage('Valid exam date is required'),
    body('time')
      .trim()
      .notEmpty()
      .withMessage('Exam time is required'),
    body('classId')
      .isUUID()
      .withMessage('Valid class ID is required'),
    body('duration')
      .optional()
      .isInt({ min: 1 }),
    body('roomNo')
      .optional()
      .trim(),
  ],
  adminController.createExamSchedule
);

/**
 * @route   DELETE /api/admin/exam-schedules/:id
 * @desc    Delete exam schedule
 * @access  Admin
 */
router.delete(
  '/exam-schedules/:id',
  [param('id').isUUID().withMessage('Invalid exam schedule ID format')],
  adminController.deleteExamSchedule
);

// ============================================
// Teacher Management Routes
// ============================================

/**
 * @route   GET /api/admin/teachers/available
 * @desc    Get teachers available for class assignment (unassigned or assigned to specific class)
 * @access  Admin
 * @query   classId, search, page, limit
 */
router.get(
  '/teachers/available',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  adminController.getAvailableTeachers
);

/**
 * @route   GET /api/admin/teachers
 * @desc    Get all teachers for admin's school
 * @access  Admin
 * @query   classId, search, page, limit
 */
router.get(
  '/teachers',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  adminController.getAllTeachers
);

/**
 * @route   GET /api/admin/teachers/:id
 * @desc    Get single teacher details
 * @access  Admin
 */
router.get(
  '/teachers/:id',
  [param('id').isUUID().withMessage('Invalid teacher ID format')],
  adminController.getTeacherById
);

/**
 * @route   POST /api/admin/teachers
 * @desc    Create a new teacher (with login credentials)
 * @access  Admin
 * @body    { name, email, password, phone, classId }
 */
router.post(
  '/teachers',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Teacher name is required')
      .isLength({ max: 100 })
      .withMessage('Teacher name must be less than 100 characters'),
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone number must be less than 20 characters'),
    body('classId')
      .optional()
      .isUUID()
      .withMessage('Invalid class ID format'),
  ],
  adminController.createTeacher
);

/**
 * @route   PUT /api/admin/teachers/:id
 * @desc    Update a teacher
 * @access  Admin
 */
router.put(
  '/teachers/:id',
  [
    param('id').isUUID().withMessage('Invalid teacher ID format'),
    body('name')
      .optional()
      .trim()
      .notEmpty(),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 }),
    body('classId')
      .optional()
      .isUUID(),
  ],
  adminController.updateTeacher
);

/**
 * @route   DELETE /api/admin/teachers/:id
 * @desc    Delete a teacher
 * @access  Admin
 */
router.delete(
  '/teachers/:id',
  [param('id').isUUID().withMessage('Invalid teacher ID format')],
  adminController.deleteTeacher
);

module.exports = router;
