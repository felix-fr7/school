/**
 * Leave Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate, isAdmin, isTeacher, isAdminOrTeacher } = require('../middleware/auth');

// Get leave requests
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, classId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'l.tenant_id = ?';
    let params = [req.user.tenantId];

    if (status) { whereClause += ' AND l.status = ?'; params.push(status); }
    if (classId) { whereClause += ' AND l.class_id = ?'; params.push(classId); }

    // Admin sees all, teachers see their class, students see their own
    if (req.user.role === 'TEACHER') {
      whereClause += ' AND l.class_id IN (SELECT id FROM classes WHERE class_teacher_id = ?)';
      params.push(req.user.id);
    } else if (req.user.role === 'STUDENT') {
      whereClause += ' AND l.student_id = ?';
      params.push(req.user.id);
    }

    const leaves = await query(
      `SELECT l.*, u.name as student_name, u.avatar_url, sp.student_id, 
              c.name as class_name, c.section, approver.name as approved_by_name
       FROM leave_requests l
       JOIN users u ON l.student_id = u.id
       JOIN student_profiles sp ON u.id = sp.user_id
       JOIN classes c ON l.class_id = c.id
       LEFT JOIN users approver ON l.approved_by = approver.id
       WHERE ${whereClause}
       ORDER BY l.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject leave (Admin & Teachers)
router.put('/:id/status', authenticate, isAdminOrTeacher, async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    await query(
      `UPDATE leave_requests SET status = ?, remarks = ?, approved_by = ?, approved_at = NOW(), updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [status, remarks || null, req.user.id, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;