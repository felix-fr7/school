/**
 * File Upload Middleware
 * Configures multer for handling file uploads (CSV, Excel, and lesson attachments)
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter - only allow CSV and Excel files (for student import)
const csvFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel files are allowed'), false);
  }
};

// File filter - allow lesson attachments (PDF, Images, Documents)
const lessonFileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed types: PDF, Images (JPG, PNG, GIF, WebP), Documents (DOC, DOCX, XLS, XLSX)'), false);
  }
};

// Configure multer for CSV uploads (existing)
const upload = multer({
  storage,
  fileFilter: csvFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
});

// Configure multer for lesson attachments (new)
const uploadLesson = multer({
  storage,
  fileFilter: lessonFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for lesson attachments
    files: 1,
  },
});

// Middleware to handle file upload errors
const handleFileUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'File too large. Maximum size is 5MB.',
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
      },
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
      },
    });
  }
  next();
};

module.exports = { upload, uploadLesson, handleFileUploadError };
