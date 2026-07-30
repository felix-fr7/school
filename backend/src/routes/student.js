/**
 * Student Routes
 * Student-specific endpoints
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const classId = req.user.classId;

    // Today's attendance
    const [todayAttendance] = await query(
      `SELECT status FROM attendance WHERE student_id = ? AND attendance_date = CURDATE()`,
      [studentId]
    );

    // Pending homework
    const [pendingHomework] = await query(
      `SELECT COUNT(*) as count FROM homework_submissions hs
       JOIN homework h ON hs.homework_id = h.id
       WHERE hs.student_id = ? AND hs.status = 'pending'`,
      [studentId]
    );

    // Upcoming exams
    const exams = await query(
      `SELECT e.name, e.type, es.schedule_date, es.start_time, es.end_time, s.name as subject_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.class_id = ? AND es.schedule_date >= CURDATE()
       ORDER BY es.schedule_date, es.start_time
       LIMIT 5`,
      [classId]
    );

    // Recent homework
    const homework = await query(
      `SELECT h.*, s.name as subject_name, hs.status as submission_status, hs.grade, hs.remarks
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = ?
       WHERE h.class_id = ? AND h.is_published = TRUE
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

// Timetable
router.get('/timetable', async (req, res, next) => {
  try {
    const classId = req.user.classId;

    const timetable = await query(
      `SELECT t.*, s.name as subject_name, u.name as teacher_name
       FROM timetables t
       JOIN subjects s ON t.subject_id = s.id
       JOIN users u ON t.teacher_id = u.id
       WHERE t.class_id = ? AND t.is_active = TRUE
       ORDER BY FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), 
                t.period_number`,
      [classId]
    );

    res.json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
});

// Homework
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
       LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = ?
       LEFT JOIN users u ON hs.graded_by = u.id
       WHERE h.class_id = ? AND h.is_published = TRUE
       ORDER BY h.due_date DESC`,
      [studentId, classId]
    );

    res.json({ success: true, data: homework });
  } catch (error) {
    next(error);
  }
});

// Submit homework
router.post('/homework/:id/submit', async (req, res, next) => {
  try {
    const { submissionText, attachmentUrl } = req.body;
    const studentId = req.user.id;

    await query(
      `UPDATE homework_submissions SET submission_text = ?, attachment_url = ?, status = 'submitted', 
              submitted_at = NOW()
       WHERE homework_id = ? AND student_id = ?`,
      [submissionText, attachmentUrl, req.params.id, studentId]
    );

    res.json({ success: true, message: 'Homework submitted successfully' });
  } catch (error) {
    next(error);
  }
});

// Exams
router.get('/exams', async (req, res, next) => {
  try {
    const classId = req.user.classId;

    const exams = await query(
      `SELECT e.*, es.schedule_date, es.start_time, es.end_time, es.room_number, s.name as subject_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.class_id = ? AND e.is_published = TRUE
       ORDER BY es.schedule_date, es.start_time`,
      [classId]
    );

    res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
});

// Marks/Report Card
router.get('/marks', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const marks = await query(
      `SELECT m.*, e.name as exam_name, e.type as exam_type, s.name as subject_name,
              (SELECT COUNT(*) FROM marks WHERE student_id = ? AND exam_id = m.exam_id) as total_subjects
       FROM marks m
       JOIN exams e ON m.exam_id = e.id
       JOIN subjects s ON m.subject_id = s.id
       WHERE m.student_id = ?
       ORDER BY e.start_date DESC, s.name`,
      [studentId, studentId]
    );

    res.json({ success: true, data: marks });
  } catch (error) {
    next(error);
  }
});

// Attendance history
router.get('/attendance', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    let whereClause = 'a.student_id = ?';
    let params = [studentId];

    if (month && year) {
      whereClause += ` AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?`;
      params.push(parseInt(month), parseInt(year));
    }

    const attendance = await query(
      `SELECT a.*, u.name as marked_by_name
       FROM attendance a
       JOIN users u ON a.marked_by = u.id
       WHERE ${whereClause}
       ORDER BY a.attendance_date DESC, a.createdAt DESC`,
      params
    );

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

// Leave requests
router.get('/leave', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const leaves = await query(
      `SELECT l.*, u.name as approved_by_name
       FROM leave_requests l
       LEFT JOIN users u ON l.approved_by = u.id
       WHERE l.student_id = ?
       ORDER BY l.createdAt DESC`,
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
    const { v4: uuidv4 } = require('uuid');
    const leaveId = uuidv4();

    await query(
      `INSERT INTO leave_requests (id, tenant_id, student_id, class_id, leave_type, start_date, end_date, 
              reason, attachment_url, applied_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [leaveId, req.user.tenantId, studentId, classId, leaveType, startDate, endDate, reason, attachmentUrl, studentId]
    );

    res.status(201).json({ success: true, data: { id: leaveId } });
  } catch (error) {
    next(error);
  }
});

// Profile
router.get('/profile', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const profile = await query(
      `SELECT u.*, sp.*, c.name as class_name, c.section, c.grade_level
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON sp.class_id = c.id
       WHERE u.id = ?`,
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

module.exports = router;