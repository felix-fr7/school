/**
 * Storage Service
 * Handles file operations with Supabase Storage for lesson attachments
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[StorageService] Supabase credentials not configured. File uploads will be disabled.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

const BUCKET_NAME = 'lesson-attachments';

/**
 * Generate storage path for a lesson attachment
 * Path format: tenantId/classId/lessonLogId/filename
 */
function generateStoragePath(tenantId, classId, lessonLogId, fileName) {
  // Sanitize filename to avoid path traversal
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${tenantId}/${classId}/${lessonLogId}/${safeFileName}`;
}

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Original filename
 * @param {string} tenantId - Tenant UUID
 * @param {string} classId - Class UUID
 * @param {string} lessonLogId - Lesson log UUID
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Attachment metadata
 */
async function uploadFile(fileBuffer, fileName, tenantId, classId, lessonLogId, mimeType) {
  if (!supabase) {
    throw new Error('Supabase storage is not configured');
  }

  const path = generateStoragePath(tenantId, classId, lessonLogId, fileName);
  
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload error: ${error.message}`);
  }

  // Get signed URL for private bucket access (1 year expiry)
  const { data: urlData, error: urlError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (urlError) {
    throw new Error(`Storage URL error: ${urlError.message}`);
  }

  return {
    path,
    url: urlData.signedUrl,
    name: fileName,
    type: mimeType,
    size: fileBuffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - The storage path to delete
 */
async function deleteFile(filePath) {
  if (!supabase) {
    throw new Error('Supabase storage is not configured');
  }

  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw new Error(`Storage delete error: ${error.message}`);
  }
}

/**
 * Get a signed URL for a file
 * @param {string} filePath - The storage path
 * @param {number} expiresIn - Seconds until expiry (default 1 hour)
 * @returns {Promise<string>} Signed URL
 */
async function getSignedUrl(filePath, expiresIn = 3600) {
  if (!supabase) {
    throw new Error('Supabase storage is not configured');
  }

  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Storage URL error: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Check if storage service is configured
 */
function isConfigured() {
  return supabase !== null;
}

module.exports = {
  uploadFile,
  deleteFile,
  getSignedUrl,
  generateStoragePath,
  BUCKET_NAME,
  isConfigured,
};