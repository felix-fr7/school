/**
 * Messages Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdminOrTeacher } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Get messages
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Messages sent to user or to their class
    const messages = await query(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar,
              c.name as class_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN classes c ON m.class_id = c.id
       WHERE m.tenant_id = ? 
         AND (m.recipient_id = ? 
              OR (m.recipient_type = 'class' AND m.class_id = ?)
              OR m.recipient_type = 'all_students'
              OR (m.recipient_type = 'all_teachers' AND ? = 'TEACHER'))
       ORDER BY m.is_important DESC, m.createdAt DESC
       LIMIT ? OFFSET ?`,
      [req.user.tenantId, userId, req.user.classId, req.user.role, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Get single message
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const message = await query(
      `SELECT m.*, u.name as sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ? AND m.tenant_id = ?`,
      [req.params.id, req.user.tenantId]
    );

    if (!message || message.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Mark as read
    await query(
      `UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = ? AND recipient_id = ?`,
      [req.params.id, req.user.id]
    );

    res.json({ success: true, data: message[0] });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/', authenticate, isAdminOrTeacher, uploadSingle('attachment'), async (req, res, next) => {
  try {
    const { subject, message, recipientType, recipientId, classId, isImportant } = req.body;
    const attachmentUrl = req.file ? `/uploads/documents/${req.file.filename}` : null;
    const messageId = uuidv4();

    await query(
      `INSERT INTO messages (id, tenant_id, sender_id, recipient_type, recipient_id, class_id, 
              subject, message, attachment_url, is_important)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, req.user.tenantId, req.user.id, recipientType, recipientId || null, 
       classId || null, subject, message, attachmentUrl, isImportant ? 1 : 0]
    );

    res.status(201).json({ success: true, data: { id: messageId } });
  } catch (error) {
    next(error);
  }
});

// Delete message
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query('DELETE FROM messages WHERE id = ? AND (sender_id = ? OR recipient_id = ?)', 
      [req.params.id, req.user.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;