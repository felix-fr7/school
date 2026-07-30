/**
 * Profile Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');

// Get profile
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const users = await query(
      `SELECT u.*, sp.*, tp.*, c.name as class_name, c.section, c.grade_level
       FROM users u
       LEFT JOIN student_profiles sp ON u.id = sp.user_id
       LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
       LEFT JOIN classes c ON sp.class_id = c.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/', authenticate, uploadSingle('avatar'), async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const avatarUrl = req.file ? `/uploads/images/${req.file.filename}` : null;

    await query(
      `UPDATE users SET name = ?, phone = ?, email = ?, avatar_url = COALESCE(?, avatar_url), updatedAt = NOW()
       WHERE id = ?`,
      [name, phone, email, avatarUrl, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;