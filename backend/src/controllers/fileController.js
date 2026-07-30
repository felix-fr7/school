/**
 * File Controller
 * Handles serving and managing files stored as BYTEA in PostgreSQL
 */

const db = require('../config/db');

/**
 * Get exam timetable file (PDF/Image) from database
 * GET /api/files/exam/:id
 */
const getExamFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    console.log(`[FileController] Fetching exam file: id=${id}, tenantId=${tenantId}`);

    const query = `
      SELECT file_data, file_mime_type, file_name 
      FROM "Exam" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      console.warn(`[FileController] Exam not found: id=${id}`);
      return res.status(404).json({
        success: false,
        error: { message: 'Exam record not found' }
      });
    }

    const row = result.rows[0];

    if (!row.file_data) {
      console.warn(`[FileController] File data is NULL for exam: id=${id}. file_mime_type=${row.file_mime_type}, file_name=${row.file_name}`);
      return res.status(404).json({
        success: false,
        error: { message: 'File binary data not found in database for this record. Please re-upload the file.' }
      });
    }

    // Set response headers
    const mimeType = row.file_mime_type || 'application/pdf';
    const fileName = row.file_name || 'file.pdf';
    
    console.log(`[FileController] Sending file: id=${id}, mimeType=${mimeType}, size=${row.file_data.length} bytes`);
    
    res.set('Content-Type', mimeType);
    res.set('Content-Disposition', `inline; filename="${fileName}"`);
    res.set('Cache-Control', 'public, max-age=31536000');

    // Send binary data
    res.send(row.file_data);
  } catch (error) {
    console.error('[FileController] Error retrieving exam file:', error);
    next(error);
  }
};

/**
 * Get news announcement image from database
 * GET /api/files/news/:id/image
 */
const getNewsImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    const query = `
      SELECT image_data, image_mime_type, image_file_name 
      FROM "News" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({
        success: false,
        error: { message: 'Image not found' }
      });
    }

    const { image_data, image_mime_type, image_file_name } = result.rows[0];

    res.set('Content-Type', image_mime_type);
    res.set('Content-Disposition', `inline; filename="${image_file_name}"`);
    res.set('Cache-Control', 'public, max-age=31536000');

    res.send(image_data);
  } catch (error) {
    console.error('Error retrieving news image:', error);
    next(error);
  }
};

/**
 * Get news announcement PDF from database
 * GET /api/files/news/:id/pdf
 */
const getNewsPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    const query = `
      SELECT pdf_data, pdf_mime_type, pdf_file_name 
      FROM "News" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].pdf_data) {
      return res.status(404).json({
        success: false,
        error: { message: 'PDF not found' }
      });
    }

    const { pdf_data, pdf_mime_type, pdf_file_name } = result.rows[0];

    res.set('Content-Type', pdf_mime_type);
    res.set('Content-Disposition', `inline; filename="${pdf_file_name}"`);
    res.set('Cache-Control', 'public, max-age=31536000');

    res.send(pdf_data);
  } catch (error) {
    console.error('Error retrieving news PDF:', error);
    next(error);
  }
};

/**
 * Get circular image from database
 * GET /api/files/circular/:id/image
 */
const getCircularImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    const query = `
      SELECT image_data, image_mime_type, image_file_name 
      FROM "Circular" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({
        success: false,
        error: { message: 'Image not found' }
      });
    }

    const { image_data, image_mime_type, image_file_name } = result.rows[0];

    res.set('Content-Type', image_mime_type);
    res.set('Content-Disposition', `inline; filename="${image_file_name}"`);
    res.set('Cache-Control', 'public, max-age=31536000');

    res.send(image_data);
  } catch (error) {
    console.error('Error retrieving circular image:', error);
    next(error);
  }
};

/**
 * Get homework attachment from database
 * GET /api/files/homework/:id/attachment
 */
const getHomeworkAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    const query = `
      SELECT attachment_data, attachment_mime_type, attachment_file_name 
      FROM "Homework" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].attachment_data) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found' }
      });
    }

    const { attachment_data, attachment_mime_type, attachment_file_name } = result.rows[0];

    res.set('Content-Type', attachment_mime_type);
    res.set('Content-Disposition', `attachment; filename="${attachment_file_name}"`);
    res.set('Cache-Control', 'public, max-age=31536000');

    res.send(attachment_data);
  } catch (error) {
    console.error('Error retrieving homework attachment:', error);
    next(error);
  }
};

/**
 * Get weekly lesson attachment from database
 * GET /api/files/lesson/:id/attachment
 */
const getLessonAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    const query = `
      SELECT attachment_data, attachment_mime_type, attachment_file_name 
      FROM "WeeklyLesson" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].attachment_data) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found' }
      });
    }

    const { attachment_data, attachment_mime_type, attachment_file_name } = result.rows[0];

    res.set('Content-Type', attachment_mime_type);
    res.set('Content-Disposition', `attachment; filename="${attachment_file_name}"`);
    res.set('Cache-Control', 'public, max-age=31536000');

    res.send(attachment_data);
  } catch (error) {
    console.error('Error retrieving lesson attachment:', error);
    next(error);
  }
};

/**
 * Get file from central File table
 * GET /api/files/central/:id
 */
const getCentralFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    const query = `
      SELECT file_data, file_mime_type, file_name, file_size 
      FROM "File" 
      WHERE id = $1 AND "tenant_id" = $2
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].file_data) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' }
      });
    }

    const { file_data, file_mime_type, file_name, file_size } = result.rows[0];

    res.set('Content-Type', file_mime_type);
    res.set('Content-Disposition', `inline; filename="${file_name}"`);
    res.set('Content-Length', file_size);
    res.set('Cache-Control', 'public, max-age=31536000');

    res.send(file_data);
  } catch (error) {
    console.error('Error retrieving central file:', error);
    next(error);
  }
};

/**
 * Delete file from central File table
 * DELETE /api/files/central/:id
 */
const deleteCentralFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;

    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    const query = `
      DELETE FROM "File" 
      WHERE id = $1 AND "tenant_id" = $2
      RETURNING id
    `;

    const result = await db.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'File not found' }
      });
    }

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting central file:', error);
    next(error);
  }
};

/**
 * Get file storage statistics
 * GET /api/files/stats
 */
const getFileStatistics = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    const query = `SELECT * FROM "FileStatistics"`;
    const result = await db.query(query);

    let totalFiles = 0;
    let totalSizeBytes = 0;

    result.rows.forEach(row => {
      totalFiles += parseInt(row.records_with_file) || 0;
      totalSizeBytes += parseInt(row.total_file_bytes) || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        byTable: result.rows,
        summary: {
          totalFiles,
          totalSizeBytes,
          totalSizeMB: (totalSizeBytes / (1024 * 1024)).toFixed(2),
          totalSizeGB: (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(4)
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving file statistics:', error);
    next(error);
  }
};

module.exports = {
  getExamFile,
  getNewsImage,
  getNewsPdf,
  getCircularImage,
  getHomeworkAttachment,
  getLessonAttachment,
  getCentralFile,
  deleteCentralFile,
  getFileStatistics
};