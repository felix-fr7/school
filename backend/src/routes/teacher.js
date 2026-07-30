/**
 * Teacher Routes
 * Teacher-specific endpoints for class management
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isTeacher, isAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ============================================
// Dashboard Stats (Teacher)
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Get classes where user is the class teacher or subject teacher
    const classes = await query(
      `SELECT DISTINCT c.id, c.name, c.section, c.grade_level,
              COUNT(DISTINCT sp.user_id) as student_count
       FROM classes c
       LEFT JOIN student_profiles sp ON c.id = sp.class_id AND sp.is_active = TRUE
       LEFT JOIN class_subjects cs ON c.id = cs.class_id
       WHERE (c.class_teacher_id = ? OR cs.teacher_id = ?) 
         AND c.tenant_id = ? AND c.is_active = TRUE
       GROUP BY c.id`,
      [userId, userId, tenantId]
    );

    // Get today's attendance for their classes
    const [todayAttendance] = await query(
      `SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late
       FROM attendance a
       JOIN classes c ON a.class_id = c.id
       WHERE (c.class_teacher_id = ? OR a.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = ?))
         AND a.attendance_date = CURDATE()`,
      [userId, userId]
    );

    // Get pending homework submissions
    const [pendingSubmissions] = await query(
      `SELECT COUNT(*) as count FROM homework_submissions hs
       JOIN homework h ON hs.homework_id = h.id
       JOIN classes c ON h.class_id = c.id
       WHERE (c.class_teacher_id = ? OR h.created_by = ?)
         AND hs.status = 'submitted'`,
      [userId, userId]
    );

    res.json({
      success: true,
      data: {
        classes,
        todayAttendance,
        pendingSubmissions: pendingSubmissions.count
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// My Classes
// ============================================
router.get('/classes', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const classes = await query(
      `SELECT DISTINCT c.*, ct.name as class_teacher_name,
              COUNT(DISTINCT sp.user_id) as student_count
       FROM classes c
       LEFT JOIN users ct ON c.class_teacher_id = ct.id
       LEFT JOIN student_profiles sp ON c.id = sp.class_id AND sp.is_active = TRUE
       LEFT JOIN class_subjects cs ON c.id = cs.class_id
       WHERE (c.class_teacher_id = ? OR cs.teacher_id = ?) 
         AND c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.grade_level, c.section`,
      [userId, userId]
    );

    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Students in My Classes
// ============================================
router.get('/students', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const userId = req.user.id;

    let classFilter = '(c.class_teacher_id = ? OR cs.teacher_id = ?)';
    let params = [userId, userId];

    if (classId) {
      classFilter = 'c.id = ?';
      params = [classId];
    }

    const students = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
              sp.student_id, sp.roll_number, sp.class_id,
              c.name as class_name, c.section
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON sp.class_id = c.id
       LEFT JOIN class_subjects cs ON c.id = cs.class_id
       WHERE ${classFilter} AND u.role = 'STUDENT' AND u.is_active = TRUE AND sp.is_active = TRUE
       ORDER BY c.grade_level, c.section, sp.roll_number`,
      params
    );

    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Attendance Management
// ============================================
router.get('/attendance', async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    const userId = req.user.id;

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Get students in class
    const students = await query(
      `SELECT u.id, u.name, u.avatar_url, sp.student_id, sp.roll_number,
              a.status, a.remarks
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON sp.class_id = c.id
       LEFT JOIN attendance a ON a.student_id = u.id AND a.attendance_date = ?
       WHERE c.id = ? AND u.role = 'STUDENT' AND u.is_active = TRUE AND sp.is_active = TRUE
       ORDER BY sp.roll_number`,
      [attendanceDate, classId]
    );

    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

router.post('/attendance', async (req, res, next) => {
  try {
    const { classId, attendanceDate, attendances } = req.body;
    const userId = req.user.id;

    // Verify teacher has access to this class
    const [classAccess] = await query(
      `SELECT c.id FROM classes c
       LEFT JOIN class_subjects cs ON c.id = cs.class_id
       WHERE c.id = ? AND (c.class_teacher_id = ? OR cs.teacher_id = ?)`,
      [classId, userId, userId]
    );

    if (!classAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Insert attendance records
    for (const att of attendances) {
      await query(
        `INSERT INTO attendance (id, tenant_id, student_id, class_id, attendance_date, status, remarks, marked_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           status = VALUES(status), 
           remarks = VALUES(remarks), 
           marked_by = VALUES(marked_by),
           updatedAt = NOW()`,
        [uuidv4(), req.user.tenantId, att.studentId, classId, attendanceDate, att.status, att.remarks || null, userId]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Homework Management
// ============================================
router.get('/homework', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const userId = req.user.id;

    let whereClause = 'h.created_by = ?';
    let params = [userId];

    if (classId) {
      whereClause = '(h.created_by = ? OR h.class_id = ?)';
      params = [userId, classId];
    }

    const homework = await query(
      `SELECT h.*, s.name as subject_name, c.name as class_name, c.section,
              (SELECT COUNT(*) FROM homework_submissions WHERE homework_id = h.id) as total_submissions,
              (SELECT COUNT(*) FROM homework_submissions WHERE homework_id = h.id AND status = 'submitted') as submitted_count
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       JOIN classes c ON h.class_id = c.id
       WHERE ${whereClause}
       ORDER BY h.due_date DESC`,
      params
    );

    res.json({ success: true, data: homework });
  } catch (error) {
    next(error);
  }
});

router.post('/homework', async (req, res, next) => {
  try {
    const { classId, subjectId, title, description, dueDate, attachmentUrl } = req.body;
    const userId = req.user.id;

    // Verify teacher has access to this class
    const [classAccess] = await query(
      `SELECT c.id FROM classes c
       LEFT JOIN class_subjects cs ON c.id = cs.class_id
       WHERE c.id = ? AND (c.class_teacher_id = ? OR cs.teacher_id = ?)`,
      [classId, userId, userId]
    );

    if (!classAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const homeworkId = uuidv4();

    await query(
      `INSERT INTO homework (id, tenant_id, class_id, subject_id, title, description, attachment_url, due_date, created_by, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [homeworkId, req.user.tenantId, classId, subjectId, title, description, attachmentUrl || null, dueDate, userId]
    );

    // Create pending submissions for all students
    const students = await query(
      `SELECT user_id FROM student_profiles WHERE class_id = ? AND is_active = TRUE`,
      [classId]
    );

    for (const student of students) {
      await query(
        `INSERT INTO homework_submissions (id, homework_id, student_id, tenant_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [uuidv4(), homeworkId, student.user_id, req.user.tenantId]
      );
    }

    res.status(201).json({ success: true, data: { id: homeworkId } });
  } catch (error) {
    next(error);
  }
});

router.put('/homework/:id', async (req, res, next) => {
  try {
    const { title, description, dueDate, isPublished } = req.body;

    await query(
      `UPDATE homework SET title = ?, description = ?, due_date = ?, is_published = ?, updatedAt = NOW()
       WHERE id = ? AND created_by = ?`,
      [title, description, dueDate, isPublished !== undefined ? isPublished : true, req.params.id, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/homework/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM homework WHERE id = ? AND created_by = ?`, 
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Grade homework submissions
router.get('/homework/:id/submissions', async (req, res, next) => {
  try {
    const submissions = await query(
      `SELECT hs.*, u.name as student_name, u.avatar_url, sp.student_id, sp.roll_number
       FROM homework_submissions hs
       JOIN users u ON hs.student_id = u.id
       JOIN student_profiles sp ON u.id = sp.user_id
       WHERE hs.homework_id = ?
       ORDER BY sp.roll_number, u.name`,
      [req.params.id]
    );

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
});

router.put('/homework/:id/submissions/:studentId', async (req, res, next) => {
  try {
    const { grade, remarks } = req.body;

    await query(
      `UPDATE homework_submissions SET grade = ?, remarks = ?, status = 'graded', graded_at = NOW(), graded_by = ?
       WHERE homework_id = ? AND student_id = ?`,
      [grade, remarks, req.user.id, req.params.id, req.params.studentId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Class Circulars
// ============================================
router.get('/circulars', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const userId = req.user.id;

    let whereClause = 'cc.created_by = ?';
    let params = [userId];

    if (classId) {
      whereClause = 'cc.class_id = ? AND cc.created_by = ?';
      params = [classId, userId];
    }

    const circulars = await query(
      `SELECT cc.*, u.name as created_by_name, c.name as class_name
       FROM class_circular cc
       JOIN users u ON cc.created_by = u.id
       JOIN classes c ON cc.class_id = c.id
       WHERE ${whereClause}
       ORDER BY cc.issue_date DESC, cc.createdAt DESC`,
      params
    );

    res.json({ success: true, data: circulars });
  } catch (error) {
    next(error);
  }
});

router.post('/circulars', async (req, res, next) => {
  try {
    const { classId, title, content, circularNo } = req.body;
    const userId = req.user.id;
    const circularId = uuidv4();

    await query(
      `INSERT INTO class_circular (id, class_id, tenant_id, title, content, circular_no, created_by, is_published, issue_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, CURDATE())`,
      [circularId, classId, req.user.tenantId, title, content, circularNo || null, userId]
    );

    res.status(201).json({ success: true, data: { id: circularId } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;