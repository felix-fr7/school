/**
 * Report Card Routes
 * Handles report card management for admins/teachers and students
 */

const express = require('express');
const router = express.Router();
const {
  uploadReportCard,
  createReportCard,
  updateReportCard,
  deleteReportCard,
  getReportCards,
  getReportCardById,
  getSchoolInfo,
  publishReportCard,
  publishAllReportCardsForClass,
  getMyReportCards,
  getStudentReportCard,
  acknowledgeReportCard,
  bulkUploadReportCards,
  getReportCardsByStudent
} = require('../controllers/reportCardController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadReportCardSingle, uploadExcelSingle } = require('../middleware/fileUpload');

// All routes require authentication
router.use(authenticate);

// ============================================
// ADMIN/TEACHER ROUTES
// ============================================

// Upload a report card file (image or PDF) - POST /api/reportcards/upload
router.post('/upload', uploadReportCardSingle('reportCardFile'), uploadReportCard);

// Bulk upload report cards via Excel - POST /api/reportcards/bulk-upload
router.post('/bulk-upload', uploadExcelSingle('excelFile'), bulkUploadReportCards);

// Create a digital report card with marks - POST /api/reportcards
router.post('/', createReportCard);

// Get school information for report cards - GET /api/reportcards/school-info
router.get('/school-info', getSchoolInfo);

// Get report cards by student name and roll number - GET /api/reportcards/by-student?name=xxx&rollNumber=xxx
router.get('/by-student', getReportCardsByStudent);

// Get all report cards (with filtering) - GET /api/reportcards
router.get('/', getReportCards);

// Get a single report card by ID - GET /api/reportcards/:id
router.get('/:id', getReportCardById);

// Update a report card - PUT /api/reportcards/:id
router.put('/:id', updateReportCard);

// Publish/Send a report card to a student - PUT /api/reportcards/:id/publish
router.put('/:id/publish', publishReportCard);

// Publish all report cards for a class - PUT /api/reportcards/class/:classId/publish-all
router.put('/class/:classId/publish-all', publishAllReportCardsForClass);

// Delete a report card - DELETE /api/reportcards/:id
router.delete('/:id', deleteReportCard);

// ============================================
// STUDENT ROUTES
// ============================================

// Get student's own report cards - GET /api/reportcards/student/my-report-cards
router.get('/student/my-report-cards', getMyReportCards);

// Get a single report card for student - GET /api/reportcards/student/:id
router.get('/student/:id', getStudentReportCard);

// Acknowledge report card - PUT /api/reportcards/student/:id/acknowledge
router.put('/student/:id/acknowledge', acknowledgeReportCard);

module.exports = router;