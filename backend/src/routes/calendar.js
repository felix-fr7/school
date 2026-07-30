/**
 * Academic Calendar Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get calendar events
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { month, year, eventType } = req.query;

    let whereClause = 'c.tenant_id = ? AND c.is_active = TRUE';
    let params = [req.user.tenantId];

    if (month && year) {
      whereClause += ' AND MONTH(c.start_date) = ? AND YEAR(c.start_date) = ?';
      params.push(parseInt(month), parseInt(year));
    }

    if (eventType) {
      whereClause += ' AND c.event_type = ?';
      params.push(eventType);
    }

    const events = await query(
      `SELECT c.*
       FROM academic_calendar c
       WHERE ${whereClause}
       ORDER BY c.start_date DESC`,
      params
    );

    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

// Create calendar event (Admin)
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, description, eventType, startDate, endDate, isRecurring, recurringPattern, targetAudience, color } = req.body;
    const eventId = uuidv4();

    await query(
      `INSERT INTO academic_calendar (id, tenant_id, title, description, event_type, start_date, end_date, 
              is_recurring, recurring_pattern, target_audience, color, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [eventId, req.user.tenantId, title, description, eventType, startDate, endDate, isRecurring, recurringPattern, targetAudience, color]
    );

    res.status(201).json({ success: true, data: { id: eventId } });
  } catch (error) {
    next(error);
  }
});

// Update calendar event
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, description, eventType, startDate, endDate, isRecurring, recurringPattern, targetAudience, color, isActive } = req.body;

    await query(
      `UPDATE academic_calendar SET title = ?, description = ?, event_type = ?, start_date = ?, end_date = ?, 
              is_recurring = ?, recurring_pattern = ?, target_audience = ?, color = ?, is_active = ?, updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [title, description, eventType, startDate, endDate, isRecurring, recurringPattern, targetAudience, color, isActive !== undefined ? isActive : true, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete calendar event
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM academic_calendar WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;