/**
 * Voice Messages Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Get voice messages
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'v.tenant_id = ? AND v.is_published = TRUE';
    let params = [req.user.tenantId];

    if (type) { whereClause += ' AND v.type = ?'; params.push(type); }

    const messages = await query(
      `SELECT v.*, u.name as author_name
       FROM voice_messages v
       JOIN users u ON v.created_by = u.id
       WHERE ${whereClause}
       ORDER BY v.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Upload voice message (Admin)
router.post('/', authenticate, isAdmin, uploadSingle('audio'), async (req, res, next) => {
  try {
    const { title, type } = req.body;
    const audioUrl = req.file ? `/uploads/audio/${req.file.filename}` : null;
    const messageId = uuidv4();

    await query(
      `INSERT INTO voice_messages (id, tenant_id, title, audio_url, type, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
      [messageId, req.user.tenantId, title, audioUrl, type || 'announcement', req.user.id]
    );

    res.status(201).json({ success: true, data: { id: messageId } });
  } catch (error) {
    next(error);
  }
});

// Delete voice message
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM voice_messages WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;