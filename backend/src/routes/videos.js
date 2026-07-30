/**
 * Videos Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Get all videos
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'v.tenant_id = ? AND v.is_published = TRUE';
    let params = [req.user.tenantId];

    if (category) { whereClause += ' AND v.category = ?'; params.push(category); }

    const videos = await query(
      `SELECT v.*, u.name as uploader_name
       FROM videos v
       JOIN users u ON v.uploaded_by = u.id
       WHERE ${whereClause}
       ORDER BY v.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
});

// Get single video
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const videos = await query(
      `SELECT v.*, u.name as uploader_name
       FROM videos v
       JOIN users u ON v.uploaded_by = u.id
       WHERE v.id = ? AND v.tenant_id = ? AND v.is_published = TRUE`,
      [req.params.id, req.user.tenantId]
    );

    if (!videos || videos.length === 0) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Increment view count
    await query('UPDATE videos SET views_count = views_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: videos[0] });
  } catch (error) {
    next(error);
  }
});

// Upload video (Admin)
router.post('/', authenticate, isAdmin, uploadSingle('video'), async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    const videoUrl = req.file ? `/uploads/videos/${req.file.filename}` : null;
    const videoId = uuidv4();

    await query(
      `INSERT INTO videos (id, tenant_id, title, description, video_url, category, is_published, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [videoId, req.user.tenantId, title, description, videoUrl, category || 'educational', req.user.id]
    );

    res.status(201).json({ success: true, data: { id: videoId } });
  } catch (error) {
    next(error);
  }
});

// Update video
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, description, category, isPublished } = req.body;

    await query(
      `UPDATE videos SET title = ?, description = ?, category = ?, is_published = ?, updatedAt = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [title, description, category, isPublished, req.params.id, req.user.tenantId]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete video
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM videos WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;