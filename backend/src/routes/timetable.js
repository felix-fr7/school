/**
 * Timetable Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get timetable for a class
router.get('/class/:classId', authenticate, async (req, res, next) => {
  try {
    const timetable = await query(
      `SELECT t.*, s.name as subject_name, u.name as teacher_name
       FROM timetables t
       JOIN subjects s ON t.subject_id = s.id
       JOIN users u ON t.teacher_id = u.id
       WHERE t.class_id = ? AND t.is_active = TRUE
       ORDER BY FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), 
                t.period_number`,
      [req.params.classId]
    );

    res.json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
});

// Create timetable entry (Admin)
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { classId, dayOfWeek, periodNumber, subjectId, teacherId, roomNumber, startTime, endTime } = req.body;
    const timetableId = uuidv4();

    await query(
      `INSERT INTO timetables (id, tenant_id, class_id, day_of_week, period_number, subject_id, 
              teacher_id, room_number, start_time, end_time, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [timetableId, req.user.tenantId, classId, dayOfWeek, periodNumber, subjectId, teacherId, roomNumber, startTime, endTime]
    );

    res.status(201).json({ success: true, data: { id: timetableId } });
  } catch (error) {
    next(error);
  }
});

// Update timetable entry
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { dayOfWeek, periodNumber, subjectId, teacherId, roomNumber, startTime, endTime, isActive } = req.body;

    await query(
      `UPDATE timetables SET day_of_week = ?, period_number = ?, subject_id = ?, teacher_id = ?, 
              room_number = ?, start_time = ?, end_time = ?, is_active = ?, updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [dayOfWeek, periodNumber, subjectId, teacherId, roomNumber, startTime, endTime, isActive !== undefined ? isActive : true, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete timetable entry
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM timetables WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;