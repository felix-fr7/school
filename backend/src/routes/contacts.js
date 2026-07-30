/**
 * School Contacts Routes
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Get all contacts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const contacts = await query(
      `SELECT * FROM school_contacts 
       WHERE tenant_id = ? AND is_active = TRUE 
       ORDER BY department, name`,
      [req.user.tenantId]
    );

    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;