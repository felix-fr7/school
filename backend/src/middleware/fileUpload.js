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

[uploadDir, imageDir, documentDir, audioDir, videoDir].forEach(dir => {
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
    
    // Extract relative path from URL
    const relativePath = filePath.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '../../', relativePath);
    
    fs.unlink(fullPath, (err) => {
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

module.exports = {
  uploadSingle,
  uploadArray,
  uploadFields,
  deleteFile,
  getFileUrl,
  uploadDir
};