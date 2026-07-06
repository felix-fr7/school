/**
 * Weekly Lesson Controller
 * Handles Homework & Classwork management organized by date-based timetable
 * All operations are scoped to tenantId and classId for multi-tenant isolation
 */

const db = require('../config/db');
const storageService = require('../services/storageService');
const fs = require('fs');

// ============================================
// TEACHER ENDPOINTS
// ============================================

/**
 * Get weekly lesson grid for teacher's assigned class
 * GET /api/teacher/weekly-lessons
 * Returns all entries organized by date and subject
 */
const getWeeklyLessons = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;

    // Find the teacher's class
    const classQuery = `
      SELECT id, name, section FROM "Class" 
      WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. Please contact your administrator.' },
      });
    }

    const classId = classResult.rows[0].id;
    const className = classResult.rows[0].section 
      ? `${classResult.rows[0].name} - ${classResult.rows[0].section}`
      : classResult.rows[0].name;

    // Get all lesson logs for this class, ordered by date (newest first)
    const lessonsQuery = `
      SELECT 
        wll.id,
        wll."classworkText",
        wll."homeworkText",
        wll."lessonDate",
        wll."subject",
        wll."attachments",
        wll."createdBy",
        wll."createdAt",
        wll."updatedAt",
        u.name as "creatorName"
      FROM "WeeklyLessonLog" wll
      LEFT JOIN "User" u ON wll."createdBy" = u.id
      WHERE wll."classId" = $1 AND wll."tenantId" = $2
      ORDER BY wll."lessonDate" DESC, wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId]);

    // Return lessons as a flat array (date-based, not weekday grid)
    res.status(200).json({
      success: true,
      data: {
        classId,
        className,
        lessons: lessonsResult.rows,
      },
    });
  } catch (error) {
    console.error('GetWeeklyLessons Error:', error);
    next(error);
  }
};

/**
 * Create or update a weekly lesson entry (UPSERT)
 * POST /api/teacher/weekly-lessons
 * Body: { lessonDate, subject, classworkText?, homeworkText? }
 * Uses ON CONFLICT to update existing entries for the same class/subject/date
 */
const upsertWeeklyLesson = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { lessonDate, subject, classworkText, homeworkText } = req.body;

    // Validate lessonDate
    if (!lessonDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Lesson date is required.' },
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(lessonDate)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid date format. Use YYYY-MM-DD.' },
      });
    }

    // Validate subject
    if (!subject || subject.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { message: 'Subject is required.' },
      });
    }

    // Find the teacher's class
    const classQuery = `
      SELECT id FROM "Class" 
      WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. Please contact your administrator.' },
      });
    }

    const classId = classResult.rows[0].id;

    // Upsert the lesson entry using ON CONFLICT
    // Parameter order: tenantId, classId, subject, lessonDate, classworkText, homeworkText, createdBy, updatedBy
    const upsertQuery = `
      INSERT INTO "WeeklyLessonLog" 
        ("tenantId", "classId", "subject", "lessonDate", "classworkText", "homeworkText", "createdBy", "updatedBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT ("tenantId", "classId", "subject", "lessonDate") 
      DO UPDATE SET 
        "classworkText" = EXCLUDED."classworkText",
        "homeworkText" = EXCLUDED."homeworkText",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = NOW()
      RETURNING *
    `;

    const result = await db.query(upsertQuery, [
      tenantId,
      classId,
      subject.trim(),
      lessonDate,
      classworkText || null,
      homeworkText || null,
      teacherId,
      teacherId,
    ]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Lesson saved successfully',
    });
  } catch (error) {
    console.error('UpsertWeeklyLesson Error:', error);
    next(error);
  }
};

/**
 * Delete a weekly lesson entry
 * DELETE /api/teacher/weekly-lessons/:id
 * Also cleans up all associated attachments from storage
 */
const deleteWeeklyLesson = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // Get lesson with attachments
    const lessonQuery = `
      SELECT * FROM "WeeklyLessonLog" 
      WHERE id = $1 AND "tenantId" = $2
    `;
    const lessonResult = await db.query(lessonQuery, [id, tenantId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found or you do not have permission to delete it.' },
      });
    }

    const lesson = lessonResult.rows[0];

    // Delete all attachments from storage
    const attachments = lesson.attachments || [];
    for (const attachment of attachments) {
      try {
        await storageService.deleteFile(attachment.path);
      } catch (err) {
        console.error('Error deleting attachment from storage:', err);
        // Continue even if storage delete fails
      }
    }

    // Delete lesson from database
    await db.query('DELETE FROM "WeeklyLessonLog" WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    console.error('DeleteWeeklyLesson Error:', error);
    next(error);
  }
};

/**
 * Upload attachment to a lesson entry
 * POST /api/teacher/weekly-lessons/:id/attachments
 * multipart/form-data with 'file' field
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file provided. Please upload a file.' },
      });
    }

    // Verify the lesson belongs to tenant
    const lessonQuery = `
      SELECT * FROM "WeeklyLessonLog" 
      WHERE id = $1 AND "tenantId" = $2
    `;
    const lessonResult = await db.query(lessonQuery, [id, tenantId]);

    if (lessonResult.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found or you do not have permission to upload.' },
      });
    }

    const lesson = lessonResult.rows[0];

    // Check if Supabase storage is configured
    if (!storageService.isConfigured()) {
      fs.unlinkSync(req.file.path);
      return res.status(503).json({
        success: false,
        error: { message: 'File storage is not configured. Please contact the administrator.' },
      });
    }

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(req.file.path);
    const uploadResult = await storageService.uploadFile(
      fileBuffer,
      req.file.originalname,
      tenantId,
      lesson.classId,
      lesson.id,
      req.file.mimetype
    );

    // Clean up local file
    fs.unlinkSync(req.file.path);

    // Update lesson attachments JSONB
    const attachments = lesson.attachments || [];
    attachments.push(uploadResult);

    const updateQuery = `
      UPDATE "WeeklyLessonLog" 
      SET "attachments" = $1, "updatedBy" = $2, "updatedAt" = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [
      JSON.stringify(attachments),
      teacherId,
      id,
    ]);

    res.status(200).json({
      success: true,
      data: {
        lesson: updateResult.rows[0],
        attachment: uploadResult,
      },
      message: 'Attachment uploaded successfully',
    });
  } catch (error) {
    console.error('UploadAttachment Error:', error);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Delete attachment from a lesson entry
 * DELETE /api/teacher/weekly-lessons/:id/attachments/:attachmentIndex
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id, attachmentIndex } = req.params;
    const index = parseInt(attachmentIndex, 10);

    // Validate index
    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid attachment index.' },
      });
    }

    // Get lesson
    const lessonQuery = `
      SELECT * FROM "WeeklyLessonLog" 
      WHERE id = $1 AND "tenantId" = $2
    `;
    const lessonResult = await db.query(lessonQuery, [id, tenantId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found.' },
      });
    }

    const lesson = lessonResult.rows[0];
    const attachments = lesson.attachments || [];

    if (index >= attachments.length) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found.' },
      });
    }

    // Delete from storage
    const attachment = attachments[index];
    try {
      await storageService.deleteFile(attachment.path);
    } catch (err) {
      console.error('Error deleting attachment from storage:', err);
      // Continue to remove from database even if storage delete fails
    }

    // Remove from array
    attachments.splice(index, 1);

    // Update lesson
    const updateQuery = `
      UPDATE "WeeklyLessonLog" 
      SET "attachments" = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [
      JSON.stringify(attachments),
      id,
    ]);

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('DeleteAttachment Error:', error);
    next(error);
  }
};

// ============================================
// STUDENT ENDPOINTS (Read-only)
// ============================================

/**
 * Get weekly lessons for student's assigned class
 * GET /api/student/weekly-lessons
 * Students can only see entries for their own class
 */
const getStudentLessons = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    // Get student's class
    const studentQuery = `
      SELECT "classId" FROM "User" 
      WHERE id = $1 AND "tenantId" = $2 AND role = 'STUDENT'
    `;
    const studentResult = await db.query(studentQuery, [studentId, tenantId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found or no class assigned.' },
      });
    }

    const classId = studentResult.rows[0].classId;

    // Get all lesson logs for this class, ordered by date
    const lessonsQuery = `
      SELECT 
        wll.id,
        wll."classworkText",
        wll."homeworkText",
        wll."lessonDate",
        wll."subject",
        wll."attachments",
        wll."createdAt",
        wll."updatedAt"
      FROM "WeeklyLessonLog" wll
      WHERE wll."classId" = $1 AND wll."tenantId" = $2
      ORDER BY wll."lessonDate" DESC, wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId]);

    res.status(200).json({
      success: true,
      data: {
        classId,
        lessons: lessonsResult.rows,
      },
    });
  } catch (error) {
    console.error('GetStudentLessons Error:', error);
    next(error);
  }
};

/**
 * Get lessons for a specific date
 * GET /api/student/weekly-lessons/by-date?date=2026-07-06
 */
const getLessonsByDate = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const { date } = req.query;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid date format. Use YYYY-MM-DD.' },
      });
    }

    // Get student's class
    const studentQuery = `
      SELECT "classId" FROM "User" 
      WHERE id = $1 AND "tenantId" = $2 AND role = 'STUDENT'
    `;
    const studentResult = await db.query(studentQuery, [studentId, tenantId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found or no class assigned.' },
      });
    }

    const classId = studentResult.rows[0].classId;

    // Get lessons for specific date
    const lessonsQuery = `
      SELECT 
        wll.id,
        wll."classworkText",
        wll."homeworkText",
        wll."lessonDate",
        wll."subject",
        wll."attachments",
        wll."createdAt",
        wll."updatedAt"
      FROM "WeeklyLessonLog" wll
      WHERE wll."classId" = $1 AND wll."tenantId" = $2 AND wll."lessonDate" = $3
      ORDER BY wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId, date]);

    res.status(200).json({
      success: true,
      data: {
        date,
        lessons: lessonsResult.rows,
      },
    });
  } catch (error) {
    console.error('GetLessonsByDate Error:', error);
    next(error);
  }
};

module.exports = {
  // Teacher endpoints
  getWeeklyLessons,
  upsertWeeklyLesson,
  deleteWeeklyLesson,
  uploadAttachment,
  deleteAttachment,
  // Student endpoints
  getStudentLessons,
  getLessonsByDate,
};