/**
 * News & Announcements Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdminOrTeacher, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Get all news (public for authenticated users)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'n.tenant_id = ? AND n.is_published = TRUE';
    let params = [req.user.tenantId];

    if (type) {
      whereClause += ' AND n.type = ?';
      params.push(type);
    }

    const news = await query(
      `SELECT n.*, u.name as author_name, u.avatar_url as author_avatar
       FROM news n
       JOIN users u ON n.created_by = u.id
       WHERE ${whereClause}
       ORDER BY n.priority DESC, n.publish_date DESC, n.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: news });
  } catch (error) {
    next(error);
  }
});

// Get single news item
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const news = await query(
      `SELECT n.*, u.name as author_name
       FROM news n
       JOIN users u ON n.created_by = u.id
       WHERE n.id = ? AND n.tenant_id = ?`,
      [req.params.id, req.user.tenantId]
    );

    if (!news || news.length === 0) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    // Increment view count
    await query('UPDATE news SET views_count = views_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: news[0] });
  } catch (error) {
    next(error);
  }
});

// Create news (Admin only)
router.post('/', authenticate, isAdmin, uploadSingle('image'), async (req, res, next) => {
  try {
    const { title, content, type, publishDate, expiryDate, priority } = req.body;
    const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
    const newsId = uuidv4();

    await query(
      `INSERT INTO news (id, tenant_id, title, content, type, image_url, is_published, publish_date, 
              expiry_date, priority, created_by)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)`,
      [newsId, req.user.tenantId, title, content, type || 'news', imageUrl, 
       publishDate || null, expiryDate || null, priority || 0, req.user.id]
    );

    res.status(201).json({ success: true, data: { id: newsId } });
  } catch (error) {
    next(error);
  }
});

// Update news
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, content, type, isPublished, publishDate, expiryDate, priority } = req.body;

    await query(
      `UPDATE news SET title = ?, content = ?, type = ?, is_published = ?, publish_date = ?, 
              expiry_date = ?, priority = ?, updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [title, content, type, isPublished, publishDate, expiryDate, priority, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete news
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM news WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;