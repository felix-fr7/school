/**
 * Weekly Lesson Controller
 * Handles Homework & Classwork management organized by weekly timetable
 * All operations are scoped to tenantId and classId for multi-tenant isolation
 */

const db = require('../config/db');
const storageService = require('../services/storageService');
const fs = require('fs');

// Weekday names mapping
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================
// TEACHER ENDPOINTS
// ============================================

/**
 * Get weekly lesson grid for teacher's assigned class
 * GET /api/teacher/weekly-lessons
 * Returns all entries organized by weekday and subject
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

    // Get all lesson logs for this class
    const lessonsQuery = `
      SELECT 
        wll.id,
        wll."classworkText",
        wll."homeworkText",
        wll."weekday",
        wll."subject",
        wll."attachments",
        wll."createdBy",
        wll."createdAt",
        wll."updatedAt",
        u.name as "creatorName"
      FROM "WeeklyLessonLog" wll
      LEFT JOIN "User" u ON wll."createdBy" = u.id
      WHERE wll."classId" = $1 AND wll."tenantId" = $2
      ORDER BY wll."weekday" ASC, wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId]);

    // Organize into grid structure
    const grid = {};
    WEEKDAY_NAMES.forEach((day, index) => {
      grid[index + 1] = {
        name: day,
        lessons: [],
      };
    });

    lessonsResult.rows.forEach(lesson => {
      const weekday = lesson.weekday;
      if (grid[weekday]) {
        grid[weekday].lessons.push({
          id: lesson.id,
          subject: lesson.subject,
          classworkText: lesson.classworkText,
          homeworkText: lesson.homeworkText,
          attachments: lesson.attachments || [],
          createdBy: lesson.creatorName,
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        classId,
        className,
        grid,
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
 * Body: { weekday, subject, classworkText?, homeworkText? }
 * Uses ON CONFLICT to update existing entries for the same class/subject/weekday
 */
const upsertWeeklyLesson = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { weekday, subject, classworkText, homeworkText } = req.body;

    // Validate weekday (1-6 for Monday-Saturday)
    if (!weekday || weekday < 1 || weekday > 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid weekday. Must be 1-6 (Monday-Saturday).' },
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
    const upsertQuery = `
      INSERT INTO "WeeklyLessonLog" 
        ("weekday", "subject", "classworkText", "homeworkText", "classId", "tenantId", "createdBy", "updatedBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      ON CONFLICT ("classId", "subject", "weekday") 
      DO UPDATE SET 
        "classworkText" = EXCLUDED."classworkText",
        "homeworkText" = EXCLUDED."homeworkText",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = NOW()
      RETURNING *
    `;

    const result = await db.query(upsertQuery, [
      weekday,
      subject.trim(),
      classworkText || null,
      homeworkText || null,
      classId,
      tenantId,
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

    // Get all lesson logs for this class
    const lessonsQuery = `
      SELECT 
        wll.id,
        wll."classworkText",
        wll."homeworkText",
        wll."weekday",
        wll."subject",
        wll."attachments",
        wll."createdAt",
        wll."updatedAt"
      FROM "WeeklyLessonLog" wll
      WHERE wll."classId" = $1 AND wll."tenantId" = $2
      ORDER BY wll."weekday" ASC, wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId]);

    // Organize into grid structure
    const grid = {};
    WEEKDAY_NAMES.forEach((day, index) => {
      grid[index + 1] = {
        name: day,
        lessons: [],
      };
    });

    lessonsResult.rows.forEach(lesson => {
      const weekday = lesson.weekday;
      if (grid[weekday]) {
        grid[weekday].lessons.push({
          id: lesson.id,
          subject: lesson.subject,
          classworkText: lesson.classworkText,
          homeworkText: lesson.homeworkText,
          attachments: lesson.attachments || [],
          createdAt: lesson.createdAt,
          updatedAt: lesson.updatedAt,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        classId,
        grid,
      },
    });
  } catch (error) {
    console.error('GetStudentLessons Error:', error);
    next(error);
  }
};

/**
 * Get lessons for a specific weekday
 * GET /api/student/weekly-lessons/:weekday
 */
const getLessonsByWeekday = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const { weekday } = req.params;
    const weekdayNum = parseInt(weekday, 10);

    // Validate weekday
    if (isNaN(weekdayNum) || weekdayNum < 1 || weekdayNum > 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid weekday. Must be 1-6 (Monday-Saturday).' },
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

    // Get lessons for specific weekday
    const lessonsQuery = `
      SELECT 
        wll.id,
        wll."classworkText",
        wll."homeworkText",
        wll."weekday",
        wll."subject",
        wll."attachments",
        wll."createdAt",
        wll."updatedAt"
      FROM "WeeklyLessonLog" wll
      WHERE wll."classId" = $1 AND wll."tenantId" = $2 AND wll."weekday" = $3
      ORDER BY wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId, weekdayNum]);

    res.status(200).json({
      success: true,
      data: {
        weekday: WEEKDAY_NAMES[weekdayNum - 1],
        weekdayNumber: weekdayNum,
        lessons: lessonsResult.rows,
      },
    });
  } catch (error) {
    console.error('GetLessonsByWeekday Error:', error);
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
  getLessonsByWeekday,
};