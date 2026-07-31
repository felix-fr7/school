/**
 * Weekly Lesson Controller (Mongoose Version)
 * Handles Homework & Classwork management organized by date-based timetable
 * All operations are scoped to tenantId and classId for multi-tenant isolation
 */

const WeeklyLessonLog = require('../models/WeeklyLessonLog'); // Neenga create pannira Model path-ah check pannikonga
const Class = require('../models/Class');
const User = require('../models/User');

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
    const teacherClass = await Class.findOne({ teacherId, tenantId }).lean();

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. Please contact your administrator.' },
      });
    }

    const classId = teacherClass._id;
    const className = teacherClass.section 
      ? `${teacherClass.name} - ${teacherClass.section}`
      : teacherClass.name;

    // Get all lesson logs for this class, ordered by date (newest first)
    const lessons = await WeeklyLessonLog.find({ classId, tenantId })
      .populate('createdBy', 'name')
      .sort({ lessonDate: -1, subject: 1 })
      .lean();

    // Format output to match existing response structure
    const formattedLessons = lessons.map(lesson => ({
      ...lesson,
      id: lesson._id,
      creatorName: lesson.createdBy ? lesson.createdBy.name : null,
      createdBy: lesson.createdBy ? lesson.createdBy._id : lesson.createdBy
    }));

    res.status(200).json({
      success: true,
      data: {
        classId,
        className,
        lessons: formattedLessons,
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
    const teacherClass = await Class.findOne({ teacherId, tenantId }).lean();

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. Please contact your administrator.' },
      });
    }

    const classId = teacherClass._id;

    // Upsert using findOneAndUpdate with upsert: true
    const filter = { tenantId, classId, subject: subject.trim(), lessonDate };
    const update = {
      $set: {
        classworkText: classworkText || null,
        homeworkText: homeworkText || null,
        updatedBy: teacherId,
        updated_at: Date.now(),
      },
      $setOnInsert: {
        createdBy: teacherId,
        created_at: Date.now(),
      }
    };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    const savedLesson = await WeeklyLessonLog.findOneAndUpdate(filter, update, options);

    res.status(200).json({
      success: true,
      data: savedLesson,
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
 */
const deleteWeeklyLesson = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const deletedLesson = await WeeklyLessonLog.findOneAndDelete({ _id: id, tenantId });

    if (!deletedLesson) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found or you do not have permission to delete it.' },
      });
    }

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
    const lesson = await WeeklyLessonLog.findOne({ _id: id, tenantId });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found or you do not have permission to upload.' },
      });
    }

    const fileBuffer = req.file.buffer;
    const fileMimeType = req.file.mimetype;
    const fileName = req.file.originalname;

    // Create attachment record
    const attachmentRecord = {
      fileName,
      mimeType: fileMimeType,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
      uploadedBy: teacherId
    };

    // Push to attachments array
    lesson.attachments = lesson.attachments || [];
    lesson.attachments.push(attachmentRecord);
    lesson.updatedBy = teacherId;
    lesson.updated_at = Date.now();

    await lesson.save();

    res.status(200).json({
      success: true,
      data: {
        lesson,
        attachment: attachmentRecord,
      },
      message: 'Attachment uploaded successfully',
    });
  } catch (error) {
    console.error('UploadAttachment Error:', error);
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

    const lesson = await WeeklyLessonLog.findOne({ _id: id, tenantId });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found.' },
      });
    }

    const attachments = lesson.attachments || [];

    if (index >= attachments.length) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found.' },
      });
    }

    // Remove from array
    attachments.splice(index, 1);
    lesson.attachments = attachments;
    lesson.updated_at = Date.now();

    await lesson.save();

    res.status(200).json({
      success: true,
      data: lesson,
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
 */
const getStudentLessons = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    // Get student's class
    const student = await User.findOne({ _id: studentId, tenantId, role: 'STUDENT' }).lean();

    if (!student || !student.classId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found or no class assigned.' },
      });
    }

    const classId = student.classId;

    // Get all lesson logs for this class, ordered by date
    const lessons = await WeeklyLessonLog.find({ classId, tenantId })
      .sort({ lessonDate: -1, subject: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        classId,
        lessons,
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
    const student = await User.findOne({ _id: studentId, tenantId, role: 'STUDENT' }).lean();

    if (!student || !student.classId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found or no class assigned.' },
      });
    }

    const classId = student.classId;

    // Get lessons for specific date
    const lessons = await WeeklyLessonLog.find({ classId, tenantId, lessonDate: date })
      .sort({ subject: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        date,
        lessons,
      },
    });
  } catch (error) {
    console.error('GetLessonsByDate Error:', error);
    next(error);
  }
};

module.exports = {
  getWeeklyLessons,
  upsertWeeklyLesson,
  deleteWeeklyLesson,
  uploadAttachment,
  deleteAttachment,
  getStudentLessons,
  getLessonsByDate,
};