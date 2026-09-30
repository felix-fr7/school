/**
 * File Upload Middleware
 * Handles image, document, audio, and video uploads
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
/**
 * Multer storage engine that uploads straight to Cloudinary.
 *
 * We implement this ourselves instead of using multer-storage-cloudinary
 * because that library relies on cloudinary's upload_stream(), which hangs
 * indefinitely in this environment (the callback never fires, so the HTTP
 * request never completes). Multer gives us the file as a stream, so we
 * buffer it and use the reliable non-streaming upload() API instead.
 * MAX_FILE_SIZE caps the buffered payload at 10MB.
 */

const {
  cloudinary,
  isCloudinaryEnabled,
  folderForMimeType,
  resourceTypeForMimeType,
  parseCloudinaryUrl,
  deleteByUrl,
} = require('../config/cloudinary');

// Ensure local upload directories exist (used only in the local fallback mode)
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

/**
 * Custom multer storage engine that pushes each file to Cloudinary.
 *
 * @param {string} [fixedFolder] - force a folder, otherwise derive from mimetype
 * @returns {object} a multer storage engine
 */
const cloudinaryStorageFor = (fixedFolder) => {
  return {
    _handleFile(req, file, callback) {
      const chunks = [];

      file.stream.on('data', (chunk) => chunks.push(chunk));
      file.stream.on('error', (error) => callback(error));

      file.stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);

          const uploaded = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${buffer.toString('base64')}`,
            {
              resource_type: resourceTypeForMimeType(file.mimetype),
              type: 'upload',
              folder: fixedFolder || folderForMimeType(file.mimetype),
              // Unique public_id => every upload is a new asset, never an overwrite.
              public_id: `${Date.now()}-${uuidv4()}`,
              use_filename: false,
              unique_filename: false,
              overwrite: false,
            }
          );

          // Mirror multer-storage-cloudinary's shape: path = URL, filename = public_id.
          callback(null, {
            path: uploaded.secure_url,
            size: uploaded.bytes,
            filename: uploaded.public_id,
            destination: uploaded.folder || fixedFolder || '',
            mimetype: file.mimetype,
            originalname: file.originalname,
            encoding: file.encoding,
          });
        } catch (error) {
          callback(error);
        }
      });
    },

    _removeFile(req, file, callback) {
      deleteByUrl(file.path)
        .then(() => callback(null))
        .catch((error) => callback(error));
    },
  };
};

// Storage configuration
// With Cloudinary enabled, files stream straight to Cloudinary (no disk write).
const storage = isCloudinaryEnabled()
  ? cloudinaryStorageFor(null)
  : multer.diskStorage({
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

// Exam-specific storage configuration (Cloudinary folder: exam/ | local: uploads/exam/)
const examStorage = isCloudinaryEnabled()
  ? cloudinaryStorageFor('exam')
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, examDir);
      },
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
      }
    });

// Report Card-specific storage configuration (Cloudinary: reportcard/ | local: uploads/reportcard/)
const reportcardStorage = isCloudinaryEnabled()
  ? cloudinaryStorageFor('reportcard')
  : multer.diskStorage({
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
// Works for both Cloudinary URLs and legacy local /uploads/... paths.
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      resolve(true);
      return;
    }

    // 1) Cloudinary-hosted asset -> destroy it in the cloud.
    if (parseCloudinaryUrl(filePath)) {
      deleteByUrl(filePath)
        .then((deleted) => resolve(deleted))
        .catch((error) => reject(error));
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

/**
 * Resolve the final stored URL for an uploaded multer file.
 * With Cloudinary this is the remote secure_url; in local mode it builds
 * the legacy /uploads/<subfolder>/<filename> path.
 *
 * @param {object} file - req.file from multer
 * @param {string} [subfolder] - local subfolder (images, documents, exam...)
 * @returns {string} URL to store in the database
 */
const resolveFileUrl = (file, subfolder = '') => {
  if (!file) return null;

  // multer-storage-cloudinary sets file.path = secure_url and file.filename = public_id.
  if (isCloudinaryEnabled() && file.path && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }

  if (subfolder) {
    return `/uploads/${subfolder}/${file.filename}`;
  }

  // Generic mode: derive the subfolder from where multer placed the file.
  const destination = file.destination || '';
  const marker = 'uploads';
  const idx = destination.replace(/\\/g, '/').lastIndexOf(marker);
  const derived = idx !== -1 ? destination.replace(/\\/g, '/').slice(idx + marker.length).replace(/^\//, '') : '';

  return derived
    ? `/uploads/${derived}/${file.filename}`
    : `/uploads/${file.filename}`;
};

/**
 * Attach the resolved URL onto each uploaded file so controllers can simply
 * read `file.url`. Works for req.file and every entry in req.files.
 */
const attachFileUrls = (req) => {
  if (req.file) {
    req.file.url = resolveFileUrl(req.file);
  }
  if (Array.isArray(req.files)) {
    req.files.forEach((file) => {
      file.url = resolveFileUrl(file);
    });
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((group) => {
      if (Array.isArray(group)) {
        group.forEach((file) => {
          file.url = resolveFileUrl(file);
        });
      }
    });
  }
  return req;
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

// Excel sheets are only parsed in memory, never persisted.
// Using memoryStorage keeps import files off both disk and Cloudinary.
const excelStorage = multer.memoryStorage();

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
  resolveFileUrl,
  attachFileUrls,
  isCloudinaryEnabled,
  cloudinaryStorageFor,
  uploadDir,
  examDir,
  reportcardDir
};
