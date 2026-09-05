/**
 * File Upload Middleware
 * Handles image, document, audio, and video uploads
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const imageDir = path.join(uploadDir, 'images');
const documentDir = path.join(uploadDir, 'documents');
const audioDir = path.join(uploadDir, 'audio');
const videoDir = path.join(uploadDir, 'videos');
const examDir = path.join(uploadDir, 'exam');
const reportcardDir = path.join(uploadDir, 'reportcard');

[uploadDir, imageDir, documentDir, audioDir, videoDir, examDir, reportcardDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let targetDir = uploadDir;
    
    if (file.mimetype.startsWith('image/')) {
      targetDir = imageDir;
    } else if (file.mimetype.startsWith('audio/')) {
      targetDir = audioDir;
    } else if (file.mimetype.startsWith('video/')) {
      targetDir = videoDir;
    } else {
      targetDir = documentDir;
    }
    
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// Exam-specific storage configuration (saves to uploads/exam/)
const examStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, examDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// Report Card-specific storage configuration (saves to uploads/reportcard/)
const reportcardStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportcardDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'],
    audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm']
  };

  const allAllowedTypes = Object.values(allowedMimeTypes).flat();

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Maximum 5 files per request
  }
});

// Single file upload
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple file upload
const uploadArray = (fieldName, maxCount) => {
  return upload.array(fieldName, maxCount);
};

// Fields upload (different field names)
const uploadFields = (fields) => {
  return upload.fields(fields);
};

// File deletion helper
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      resolve(true);
      return;
    }

    let relativePath = filePath;

    try {
      const parsedUrl = new URL(filePath);
      const uploadIndex = parsedUrl.pathname.indexOf('/uploads/');
      if (uploadIndex !== -1) {
        relativePath = parsedUrl.pathname.slice(uploadIndex + 1);
      }
    } catch (error) {
      // Not a URL; use the stored path as-is.
    }

    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1);
    }

    relativePath = relativePath.replace(/\\/g, '/');
    const uploadIndex = relativePath.indexOf('uploads/');
    if (uploadIndex > 0) {
      relativePath = relativePath.slice(uploadIndex);
    }

    if (!relativePath.startsWith('uploads/')) {
      relativePath = `uploads/${relativePath.replace(/^\.+\//, '')}`;
    }

    const fullPath = path.join(__dirname, '../../', relativePath);
    const resolvedFullPath = path.resolve(fullPath);
    const resolvedUploadRoot = path.resolve(path.join(__dirname, '../../uploads'));

    if (!resolvedFullPath.startsWith(`${resolvedUploadRoot}${path.sep}`)) {
      reject(new Error('Invalid upload file path'));
      return;
    }
    
    fs.unlink(resolvedFullPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

// File URL helper
const getFileUrl = (filename, subfolder = '') => {
  const baseUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads`;
  return subfolder 
    ? `${baseUrl}/${subfolder}/${filename}`
    : `${baseUrl}/${filename}`;
};

// Exam-specific upload configuration
const uploadExam = multer({
  storage: examStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1
  }
});

const uploadExamSingle = (fieldName) => {
  return uploadExam.single(fieldName);
};

// Report Card-specific upload configuration
const uploadReportCard = multer({
  storage: reportcardStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1
  }
});

const uploadReportCardSingle = (fieldName) => {
  return uploadReportCard.single(fieldName);
};

// Excel-specific storage configuration (saves to uploads/documents/)
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// Excel file filter
const excelFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv'
  ];
  
  const allowedExtensions = ['.xls', '.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xls, .xlsx) and CSV files are allowed'), false);
  }
};

const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1
  }
});

const uploadExcelSingle = (fieldName) => {
  return uploadExcel.single(fieldName);
};

module.exports = {
  uploadSingle,
  uploadArray,
  uploadFields,
  uploadExamSingle,
  uploadReportCardSingle,
  uploadExcelSingle,
  deleteFile,
  getFileUrl,
  uploadDir,
  examDir,
  reportcardDir
};
