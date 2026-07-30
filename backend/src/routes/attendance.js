/**
 * Attendance Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get attendance stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { classId, month, year } = req.query;
    const tenantId = req.user.tenantId;

    let whereClause = 'a.tenant_id = ?';
    let params = [tenantId];

    if (classId) {
      whereClause += ' AND a.class_id = ?';
      params.push(classId);
    }

    if (month && year) {
      whereClause += ' AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?';
      params.push(parseInt(month), parseInt(year));
    }

    const stats = await query(
      `SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused
       FROM attendance a
       WHERE ${whereClause}`,
      params
    );

    res.json({ success: true, data: stats[0] });
  } catch (error) {
    next(error);
  }
});

// Get attendance records
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { classId, studentId, date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'a.tenant_id = ?';
    let params = [req.user.tenantId];

    if (classId) { whereClause += ' AND a.class_id = ?'; params.push(classId); }
    if (studentId) { whereClause += ' AND a.student_id = ?'; params.push(studentId); }
    if (date) { whereClause += ' AND a.attendance_date = ?'; params.push(date); }

    const attendance = await query(
      `SELECT a.*, u.name as student_name, u.avatar_url, sp.student_id, sp.roll_number,
              c.name as class_name, c.section
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON a.class_id = c.id
       WHERE ${whereClause}
       ORDER BY a.attendance_date DESC, u.name
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

// Mark attendance (Admin only)
router.post('/mark', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { classId, attendanceDate, attendances } = req.body;
    const { v4: uuidv4 } = require('uuid');

    for (const att of attendances) {
      await query(
        `INSERT INTO attendance (id, tenant_id, student_id, class_id, attendance_date, status, remarks, marked_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           status = VALUES(status), remarks = VALUES(remarks), marked_by = VALUES(marked_by)`,
        [uuidv4(), req.user.tenantId, att.studentId, classId, attendanceDate, att.status, att.remarks || null, req.user.id]
      );
    }

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;