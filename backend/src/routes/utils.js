/**
 * Utils Routes
 * Utility endpoints accessible by authenticated users (Admin and Teacher)
 */

const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All utils routes require authentication
router.use(protect);

// ============================================
// CSV Template Routes
// ============================================

/**
 * @route   GET /api/utils/download-sample-csv
 * @desc    Download a sample CSV template for student bulk upload
 * @access  Admin, Teacher
 */
router.get('/download-sample-csv', (req, res) => {
  // Check if user is admin or teacher
  const userRole = req.user.role;
  if (userRole !== 'ADMIN' && userRole !== 'TEACHER') {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Only Admin and Teacher can download this template.' },
    });
  }

  // CSV content with headers and sample data
  const csvContent = `name,email,studentId,phone,password
John Doe,john@example.com,STU101,9876543210,Student@123
Jane Smith,jane@example.com,STU102,9876543211,Student@123`;

  // Set response headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sample_students_template.csv');

  // Send the CSV content
  res.status(200).send(csvContent);
});

module.exports = router;