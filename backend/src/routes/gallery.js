/**
 * Gallery Routes (Photo Albums & Photos)
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadSingle, uploadArray } = require('../middleware/fileUpload');

// Get all albums
router.get('/albums', authenticate, async (req, res, next) => {
  try {
    const albums = await query(
      `SELECT a.*, u.name as author_name, COUNT(p.id) as photo_count
       FROM photo_albums a
       JOIN users u ON a.created_by = u.id
       LEFT JOIN photos p ON a.id = p.album_id AND p.is_active = TRUE
       WHERE a.tenant_id = ? AND a.is_published = TRUE
       GROUP BY a.id
       ORDER BY a.event_date DESC, a.createdAt DESC`,
      [req.user.tenantId]
    );

    res.json({ success: true, data: albums });
  } catch (error) {
    next(error);
  }
});

// Get album with photos
router.get('/albums/:id', authenticate, async (req, res, next) => {
  try {
    const albums = await query(
      `SELECT a.*, u.name as author_name
       FROM photo_albums a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = ? AND a.tenant_id = ? AND a.is_published = TRUE`,
      [req.params.id, req.user.tenantId]
    );

    if (!albums || albums.length === 0) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    const photos = await query(
      `SELECT * FROM photos WHERE album_id = ? AND is_active = TRUE ORDER BY sort_order, createdAt`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...albums[0], photos } });
  } catch (error) {
    next(error);
  }
});

// Create album (Admin)
router.post('/albums', authenticate, isAdmin, uploadSingle('coverImage'), async (req, res, next) => {
  try {
    const { title, description, eventDate } = req.body;
    const coverImageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
    const albumId = uuidv4();

    await query(
      `INSERT INTO photo_albums (id, tenant_id, title, description, cover_image_url, event_date, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [albumId, req.user.tenantId, title, description, coverImageUrl, eventDate, req.user.id]
    );

    res.status(201).json({ success: true, data: { id: albumId } });
  } catch (error) {
    next(error);
  }
});

// Upload photos to album
router.post('/albums/:id/photos', authenticate, isAdmin, uploadArray('photos', 10), async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    for (const file of files) {
      const photoId = uuidv4();
      await query(
        `INSERT INTO photos (id, album_id, tenant_id, image_url, caption, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [photoId, req.params.id, req.user.tenantId, `/uploads/images/${file.filename}`, '']
      );
    }

    res.json({ success: true, message: `${files.length} photos uploaded` });
  } catch (error) {
    next(error);
  }
});

// Delete photo
router.delete('/photos/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('UPDATE photos SET is_active = FALSE WHERE id = ? AND tenant_id = ?', 
      [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete album
router.delete('/albums/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM photo_albums WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenantId]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;