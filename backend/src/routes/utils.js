/**
 * Utils Routes
 * Utility endpoints accessible by authenticated users (Admin and Teacher)
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');

// All utils routes require authentication
router.use(authenticate);

// ============================================
// CSV Template Routes
// ============================================

/**
 * @route   GET /api/utils/download-sample-csv
 * @desc    Download a sample CSV template for student bulk upload
 * @access  Admin, Teacher, Super Admin
 */
router.get('/download-sample-csv', (req, res, next) => {
  try {
    const userRole = req.user.role;
    
    // Check if user is admin, teacher, or super admin
    if (userRole !== 'ADMIN' && userRole !== 'TEACHER' && userRole !== 'SUPER_ADMIN' && userRole !== 'TENANT_ADMIN') {
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
  } catch (error) {
    next(error);
  }
});

module.exports = router;