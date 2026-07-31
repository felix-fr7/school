/**
 * Student Module
 * Student-specific endpoints
 * Modular structure - Student module
 * 
 * Exports:
 * - routes: Express router with all Student endpoints
 * - middleware: Role-specific middleware functions
 */

const express = require('express');
const router = express.Router();
const { query } = require('../../config/db');
const { authenticate } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Import module-specific middleware
const studentMiddleware = require('./student.middleware');

// All routes require authentication
router.use(authenticate);

// ============================================
// Dashboard
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const classId = req.user.classId;

    const [todayAttendance] = await query(
      `SELECT status FROM attendance WHERE student_id = $1 AND attendance_date = CURRENT_DATE`,
      [studentId]
    );

    const [pendingHomework] = await query(
      `SELECT COUNT(*) as count FROM homework_submissions hs
       JOIN homework h ON hs.homework_id = h.id
       WHERE hs.student_id = $1 AND hs.status = 'pending'`,
      [studentId]
    );

    const exams = await query(
      `SELECT e.name, e.type, es.schedule_date, es.start_time, es.end_time, s.name as subject_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.class_id = $1 AND es.schedule_date >= CURRENT_DATE
       ORDER BY es.schedule_date, es.start_time
       LIMIT 5`,
      [classId]
    );

    const homework = await query(
      `SELECT h.*, s.name as subject_name, hs.status as submission_status, hs.grade, hs.remarks
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = $1
       WHERE h.class_id = $2 AND h.is_published = TRUE
       ORDER BY h.due_date DESC
       LIMIT 5`,
      [studentId, classId]
    );

    res.json({
      success: true,
      data: {
        todayAttendance: todayAttendance?.status || null,
        pendingHomework: pendingHomework.count,
        upcomingExams: exams,
        recentHomework: homework
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Timetable
// ============================================
router.get('/timetable', async (req, res, next) => {
  try {
    const classId = req.user.classId;

    const timetable = await query(
      `SELECT t.*, s.name as subject_name, u.name as teacher_name
       FROM timetables t
       JOIN subjects s ON t.subject_id = s.id
       JOIN users u ON t.teacher_id = u.id
       WHERE t.class_id = $1 AND t.is_active = TRUE
       ORDER BY CASE t.day_of_week 
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                    WHEN 7 THEN 'Sunday'
                  END, 
                  t.period_number`,
      [classId]
    );

    res.json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Homework
// ============================================
router.get('/homework', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const classId = req.user.classId;

    const homework = await query(
      `SELECT h.*, s.name as subject_name, 
              hs.status as submission_status, hs.submitted_at, hs.grade, hs.remarks,
              u.name as graded_by_name
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = $1
       LEFT JOIN users u ON hs.graded_by = u.id
       WHERE h.class_id = $2 AND h.is_published = TRUE
       ORDER BY h.due_date DESC`,
      [studentId, classId]
    );

    res.json({ success: true, data: homework });
  } catch (error) {
    next(error);
  }
});

router.post('/homework/:id/submit', async (req, res, next) => {
  try {
    const { submissionText, attachmentUrl } = req.body;
    const studentId = req.user.id;

    await query(
      `UPDATE homework_submissions SET submission_text = $1, attachment_url = $2, status = 'submitted', 
              submitted_at = NOW()
       WHERE homework_id = $3 AND student_id = $4`,
      [submissionText, attachmentUrl, req.params.id, studentId]
    );

    res.json({ success: true, message: 'Homework submitted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Exams
// ============================================
router.get('/exams', async (req, res, next) => {
  try {
    const classId = req.user.classId;

    const exams = await query(
      `SELECT e.*, es.schedule_date, es.start_time, es.end_time, es.room_number, s.name as subject_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.class_id = $1 AND e.is_published = TRUE
       ORDER BY es.schedule_date, es.start_time`,
      [classId]
    );

    res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Marks/Report Card
// ============================================
router.get('/marks', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const marks = await query(
      `SELECT m.*, e.name as exam_name, e.type as exam_type, s.name as subject_name,
              (SELECT COUNT(*) FROM marks WHERE student_id = $1 AND exam_id = m.exam_id) as total_subjects
       FROM marks m
       JOIN exams e ON m.exam_id = e.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = $1
       ORDER BY e.start_date DESC, s.name`,
      [studentId]
    );

    res.json({ success: true, data: marks });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Attendance history
// ============================================
router.get('/attendance', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    let whereClause = 'a.student_id = $1';
    let params = [studentId];

    if (month && year) {
      whereClause += ` AND EXTRACT(MONTH FROM a.attendance_date) = $${params.length + 1} AND EXTRACT(YEAR FROM a.attendance_date) = $${params.length + 2}`;
      params.push(parseInt(month), parseInt(year));
    }

    const attendance = await query(
      `SELECT a.*, u.name as marked_by_name
       FROM attendance a
       JOIN users u ON a.marked_by = u.id
       WHERE ${whereClause}
       ORDER BY a.attendance_date DESC, a.created_at DESC`,
      params
    );

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Leave requests
// ============================================
router.get('/leave', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const leaves = await query(
      `SELECT l.*, u.name as approved_by_name
       FROM leave_requests l
       LEFT JOIN users u ON l.approved_by = u.id
       WHERE l.student_id = $1
       ORDER BY l.created_at DESC`,
      [studentId]
    );

    res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
});

router.post('/leave', async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason, attachmentUrl } = req.body;
    const studentId = req.user.id;
    const classId = req.user.classId;

    const leaveId = uuidv4();

    await query(
      `INSERT INTO leave_requests (id, tenant_id, student_id, class_id, leave_type, start_date, end_date, 
              reason, attachment_url, applied_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [leaveId, req.user.tenantId, studentId, classId, leaveType, startDate, endDate, reason, attachmentUrl, studentId]
    );

    res.status(201).json({ success: true, data: { id: leaveId } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Profile
// ============================================
router.get('/profile', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const profile = await query(
      `SELECT u.*, sp.*, c.name as class_name, c.section, c.grade_level
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON sp.class_id = c.id
       WHERE u.id = $1`,
      [studentId]
    );

    if (!profile || profile.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, data: profile[0] });
  } catch (error) {
    next(error);
  }
});

// Export the router as default and named exports
module.exports = router;
module.exports.routes = router;
module.exports.middleware = studentMiddleware;