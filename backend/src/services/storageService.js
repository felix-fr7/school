/**
 * Storage Service
 * Handles file operations with local file storage
 * Files are stored in the uploads/ directory
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Generate unique filename to avoid conflicts
 * @param {string} fileName - Original filename
 * @returns {string} Unique filename
 */
function generateUniqueFileName(fileName) {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${baseName}_${timestamp}_${random}${ext}`;
}

/**
 * Generate storage path for a file
 * Path format: tenantId/classId/lessonLogId/filename
 */
function generateStoragePath(tenantId, classId, lessonLogId, fileName) {
  // Sanitize filename to avoid path traversal
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${tenantId}/${classId}/${lessonLogId}/${safeFileName}`;
}

/**
 * Upload a file to local storage
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Original filename
 * @param {string} tenantId - Tenant UUID
 * @param {string} classId - Class UUID
 * @param {string} lessonLogId - Lesson log UUID (optional)
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Attachment metadata
 */
async function uploadFile(fileBuffer, fileName, tenantId, classId, lessonLogId, mimeType) {
  // Create directory structure
  const uniqueFileName = generateUniqueFileName(fileName);
  let relativePath;
  
  if (lessonLogId) {
    relativePath = `${tenantId}/${classId}/${lessonLogId}/${uniqueFileName}`;
  } else {
    relativePath = `${tenantId}/${classId}/${uniqueFileName}`;
  }
  
  const fullPath = path.join(UPLOADS_DIR, relativePath);
  const dirPath = path.dirname(fullPath);
  
  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Write file
  fs.writeFileSync(fullPath, fileBuffer);
  
  // Generate URL for accessing the file
  const url = `/uploads/${relativePath}`;
  
  return {
    path: relativePath,
    url: url,
    name: uniqueFileName,
    originalName: fileName,
    type: mimeType,
    size: fileBuffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a file from local storage
 * @param {string} filePath - The relative storage path to delete
 */
async function deleteFile(filePath) {
  const fullPath = path.join(UPLOADS_DIR, filePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    
    // Remove empty parent directories (but not the uploads root)
    let dirPath = path.dirname(fullPath);
    while (dirPath !== UPLOADS_DIR) {
      try {
        fs.rmdirSync(dirPath);
        dirPath = path.dirname(dirPath);
      } catch (e) {
        // Directory not empty or other error, stop
        break;
      }
    }
  }
}

/**
 * Get file URL
 * @param {string} filePath - The relative storage path
 * @returns {string} URL path
 */
function getFileUrl(filePath) {
  return `/uploads/${filePath}`;
}

/**
 * Check if storage service is configured
 */
function isConfigured() {
  return fs.existsSync(UPLOADS_DIR);
}

/**
 * Get upload directory path
 */
function getUploadsDir() {
  return UPLOADS_DIR;
}

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl,
  generateStoragePath,
  generateUniqueFileName,
  isConfigured,
  getUploadsDir,
};