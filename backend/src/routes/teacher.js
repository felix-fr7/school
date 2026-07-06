/**
 * Teacher Routes
 * Handles teacher-specific operations for managing their assigned class
 * All routes require Teacher role
 */

const express = require('express');
const { query, body } = require('express-validator');
const teacherController = require('../controllers/teacherController');
const teacherDashboardController = require('../controllers/teacherDashboardController');
const attendanceController = require('../controllers/attendanceController');
const { protect, requireTeacher } = require('../middleware/auth');
const { upload, handleFileUploadError } = require('../middleware/fileUpload');

const router = express.Router();

// All routes require Teacher role
router.use(protect);
router.use(requireTeacher);

// ============================================
// Class & Dashboard Routes
// ============================================

/**
 * @route   GET /api/teacher/dashboard-profile
 * @desc    Get teacher dashboard profile with school branding and stats
 * @access  Teacher
 */
router.get('/dashboard-profile', teacherDashboardController.getDashboardProfile);

/**
 * @route   GET /api/teacher/my-class
 * @desc    Get teacher's assigned class with students, homework, and exams
 * @access  Teacher
 */
router.get('/my-class', teacherController.getMyClass);

// ============================================
// Student Routes
// ============================================

/**
 * @route   GET /api/teacher/students
 * @desc    Get all students in teacher's class
 * @access  Teacher
 * @query   search, page, limit
 */
router.get(
  '/students',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  teacherController.getMyStudents
);

// ============================================
// Homework Routes
// ============================================

/**
 * @route   GET /api/teacher/homework
 * @desc    Get all homework for teacher's class
 * @access  Teacher
 * @query   page, limit
 */
router.get(
  '/homework',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  teacherController.getHomework
);

/**
 * @route   POST /api/teacher/homework
 * @desc    Create homework for teacher's class
 * @access  Teacher
 * @body    { title, description, subject, dueDate? }
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
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ],
  teacherController.createHomework
);

/**
 * @route   PUT /api/teacher/homework/:id
 * @desc    Update homework for teacher's class
 * @access  Teacher
 * @body    { title?, description?, subject?, dueDate?, isPublished? }
 */
router.put(
  '/homework/:id',
  [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Homework title cannot be empty')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('description')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Homework description cannot be empty'),
    body('subject')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Subject cannot be empty'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('isPublished')
      .optional()
      .isBoolean()
      .withMessage('isPublished must be a boolean'),
  ],
  teacherController.updateHomework
);

/**
 * @route   DELETE /api/teacher/homework/:id
 * @desc    Delete homework for teacher's class
 * @access  Teacher
 */
router.delete('/homework/:id', teacherController.deleteHomework);

// ============================================
// Marks Routes
// ============================================

/**
 * @route   GET /api/teacher/marks
 * @desc    Get all marks for students in teacher's class
 * @access  Teacher
 * @query   studentId, examType, page, limit
 */
router.get(
  '/marks',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  teacherController.getMarks
);

/**
 * @route   POST /api/teacher/marks
 * @desc    Create marks for students in teacher's class (batch)
 * @access  Teacher
 * @body    { marksData: [{ studentId, subject, marksObtained, totalMarks, examType, examDate?, remarks? }] }
 */
router.post(
  '/marks',
  [
    body('marksData')
      .isArray({ min: 1 })
      .withMessage('Marks data must be a non-empty array'),
    body('marksData.*.studentId')
      .isUUID()
      .withMessage('Valid student ID is required'),
    body('marksData.*.subject')
      .trim()
      .notEmpty()
      .withMessage('Subject is required'),
    body('marksData.*.marksObtained')
      .isFloat({ min: 0 })
      .withMessage('Marks obtained must be a positive number'),
    body('marksData.*.totalMarks')
      .isFloat({ min: 1 })
      .withMessage('Total marks must be greater than 0'),
    body('marksData.*.examType')
      .trim()
      .notEmpty()
      .withMessage('Exam type is required'),
    body('marksData.*.examDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('marksData.*.remarks')
      .optional()
      .trim(),
  ],
  teacherController.createMarks
);

/**
 * @route   PUT /api/teacher/marks/:id
 * @desc    Update a mark entry for a student in teacher's class
 * @access  Teacher
 * @body    { marksObtained?, totalMarks?, examType?, examDate?, remarks?, isPublished? }
 */
router.put(
  '/marks/:id',
  [
    body('marksObtained')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Marks obtained must be a positive number'),
    body('totalMarks')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Total marks must be greater than 0'),
    body('examType')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Exam type cannot be empty'),
    body('examDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('remarks')
      .optional()
      .trim(),
    body('isPublished')
      .optional()
      .isBoolean()
      .withMessage('isPublished must be a boolean'),
  ],
  teacherController.updateMark
);

/**
 * @route   DELETE /api/teacher/marks/:id
 * @desc    Delete a mark entry for a student in teacher's class
 * @access  Teacher
 */
router.delete('/marks/:id', teacherController.deleteMark);

// ============================================
// Student Management Routes
// ============================================

/**
 * @route   POST /api/teacher/students/manual
 * @desc    Create a single student manually in teacher's assigned class
 * @access  Teacher
 * @body    { name, email, studentId, phone?, password? }
 */
router.post(
  '/students/manual',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Student name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Student email is required')
      .isEmail()
      .withMessage('Valid email is required'),
    body('studentId')
      .trim()
      .notEmpty()
      .withMessage('Student ID (roll number) is required')
      .isLength({ max: 50 })
      .withMessage('Student ID must be less than 50 characters'),
    body('phone')
      .optional()
      .trim()
      .isMobilePhone('any', { strictMode: false })
      .withMessage('Valid phone number is required'),
    body('password')
      .optional()
      .trim()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  teacherController.createStudentManual
);

/**
 * @route   POST /api/teacher/students/bulk-upload
 * @desc    Bulk upload students from CSV to teacher's assigned class
 * @access  Teacher
 * @body    { file: CSV } - multipart/form-data
 */
router.post(
  '/students/bulk-upload',
  upload.single('file'),
  handleFileUploadError,
  [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('CSV file is required');
        }
        return true;
      }),
  ],
  teacherController.bulkUploadStudents
);

// ============================================
// Attendance Routes
// ============================================

/**
 * @route   POST /api/teacher/attendance
 * @desc    Mark attendance for students in teacher's class (batch)
 * @access  Teacher
 * @body    { date: string, attendanceData: [{ studentId, status, remarks? }] }
 */
router.post(
  '/attendance',
  [
    body('date')
      .notEmpty()
      .withMessage('Date is required'),
    body('attendanceData')
      .isArray({ min: 1 })
      .withMessage('Attendance data must be a non-empty array'),
    body('attendanceData.*.studentId')
      .isUUID()
      .withMessage('Valid student ID is required'),
    body('attendanceData.*.status')
      .isIn(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
      .withMessage('Invalid attendance status'),
    body('attendanceData.*.remarks')
      .optional()
      .trim()
      .isLength({ max: 255 }),
  ],
  attendanceController.markAttendance
);

/**
 * @route   GET /api/teacher/attendance
 * @desc    Get attendance for teacher's class on a specific date
 * @access  Teacher
 * @query   date (YYYY-MM-DD)
 */
router.get(
  '/attendance',
  [
    query('date')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
  ],
  attendanceController.getClassAttendance
);

/**
 * @route   PUT /api/teacher/students/:id
 * @desc    Update student information in teacher's class
 * @access  Teacher
 * @body    { name?, email?, studentId? }
 * @note    Teachers can only update basic info, not class assignment
 */
router.put(
  '/students/:id',
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('studentId')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Student ID cannot be empty'),
  ],
  teacherController.updateStudent
);

module.exports = router;
