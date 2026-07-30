/**
 * Homework Routes (Shared endpoints)
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Get homework details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const homework = await query(
      `SELECT h.*, s.name as subject_name, c.name as class_name, c.section,
              u.name as teacher_name
       FROM homework h
       JOIN subjects s ON h.subject_id = s.id
       JOIN classes c ON h.class_id = c.id
       JOIN users u ON h.created_by = u.id
       WHERE h.id = ? AND h.tenant_id = ? AND h.is_published = TRUE`,
      [req.params.id, req.user.tenantId]
    );

    if (!homework || homework.length === 0) {
      return res.status(404).json({ success: false, message: 'Homework not found' });
    }

    res.json({ success: true, data: homework[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;