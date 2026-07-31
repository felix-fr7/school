/**
 * School Contacts Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const SchoolContact = require('../models/SchoolContact');
const { authenticate } = require('../middleware/auth');

// Get all active contacts for the tenant
router.get('/', authenticate, async (req, res, next) => {
  try {
    const contacts = await SchoolContact.find({
      tenantId: req.user.tenantId,
      isActive: true
    }).sort({ department: 1, name: 1 });

    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;