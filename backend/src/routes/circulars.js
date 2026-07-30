/**
 * Circulars Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Get circulars
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'c.tenant_id = ? AND c.is_published = TRUE';
    let params = [req.user.tenantId];

    if (type) { whereClause += ' AND c.type = ?'; params.push(type); }

    const circulars = await query(
      `SELECT c.*, u.name as author_name
       FROM circulars c
       JOIN users u ON c.created_by = u.id
       WHERE ${whereClause}
       ORDER BY c.publish_date DESC, c.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: circulars });
  } catch (error) {
    next(error);
  }
});

// Get single circular
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const circular = await query(
      `SELECT c.*, u.name as author_name
       FROM circulars c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = ? AND c.tenant_id = ?`,
      [req.params.id, req.user.tenantId]
    );

    if (!circular || circular.length === 0) {
      return res.status(404).json({ success: false, message: 'Circular not found' });
    }

    res.json({ success: true, data: circular[0] });
  } catch (error) {
    next(error);
  }
});

// Create circular (Admin)
router.post('/', authenticate, isAdmin, uploadSingle('attachment'), async (req, res, next) => {
  try {
    const { title, content, type, circularNumber, publishDate } = req.body;
    const attachmentUrl = req.file ? `/uploads/documents/${req.file.filename}` : null;
    const circularId = uuidv4();

    await query(
      `INSERT INTO circulars (id, tenant_id, circular_number, title, content, type, attachment_url, 
              is_published, publish_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [circularId, req.user.tenantId, circularNumber, title, content, type, attachmentUrl, publishDate, req.user.id]
    );

    res.status(201).json({ success: true, data: { id: circularId } });
  } catch (error) {
    next(error);
  }
});

// Update circular
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, content, type, isPublished, publishDate } = req.body;

    await query(
      `UPDATE circulars SET title = ?, content = ?, type = ?, is_published = ?, publish_date = ?, updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [title, content, type, isPublished, publishDate, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete circular
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM circulars WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;