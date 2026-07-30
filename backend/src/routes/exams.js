/**
 * Exams Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get exams (for student's class or all for admin)
router.get('/', authenticate, async (req, res, next) => {
  try {
    let exams;
    
    if (req.user.role === 'STUDENT') {
      exams = await query(
        `SELECT DISTINCT e.*, 
                (SELECT COUNT(*) FROM exam_schedules WHERE exam_id = e.id AND class_id = ?) as schedule_count
         FROM exams e
         WHERE e.tenant_id = ? AND e.is_published = TRUE
         ORDER BY e.start_date DESC`,
        [req.user.classId, req.user.tenantId]
      );
    } else {
      exams = await query(
        `SELECT e.*, 
                (SELECT COUNT(*) FROM exam_schedules WHERE exam_id = e.id) as schedule_count
         FROM exams e
         WHERE e.tenant_id = ?
         ORDER BY e.start_date DESC`,
        [req.user.tenantId]
      );
    }

    res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
});

// Get exam schedule for student's class
router.get('/schedule/:classId', authenticate, async (req, res, next) => {
  try {
    const schedule = await query(
      `SELECT es.*, e.name as exam_name, e.type as exam_type, s.name as subject_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN subjects s ON es.subject_id = s.id
       WHERE es.class_id = ? AND e.is_published = TRUE
       ORDER BY es.schedule_date, es.start_time`,
      [req.params.classId]
    );

    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
});

// Create exam (Admin)
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { name, type, academicYear, startDate, endDate, description } = req.body;
    const examId = uuidv4();

    await query(
      `INSERT INTO exams (id, tenant_id, name, type, academic_year, start_date, end_date, is_published, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
      [examId, req.user.tenantId, name, type, academicYear, startDate, endDate, description]
    );

    res.status(201).json({ success: true, data: { id: examId } });
  } catch (error) {
    next(error);
  }
});

// Update exam
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { name, type, academicYear, startDate, endDate, isPublished, description } = req.body;

    await query(
      `UPDATE exams SET name = ?, type = ?, academic_year = ?, start_date = ?, end_date = ?, 
              is_published = ?, description = ?, updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [name, type, academicYear, startDate, endDate, isPublished, description, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Create exam schedule
router.post('/:id/schedule', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { classId, subjectId, scheduleDate, startTime, endTime, roomNumber } = req.body;
    const scheduleId = uuidv4();

    await query(
      `INSERT INTO exam_schedules (id, exam_id, class_id, subject_id, tenant_id, schedule_date, 
              start_time, end_time, room_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [scheduleId, req.params.id, classId, subjectId, req.user.tenantId, scheduleDate, startTime, endTime, roomNumber]
    );

    res.status(201).json({ success: true, data: { id: scheduleId } });
  } catch (error) {
    next(error);
  }
});

// Delete exam
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM exams WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;