/**
 * Timetable Routes
 * - Class login: create/edit/publish/delete own class timetables (weekly grid)
 * - Admin: list all, edit, delete any class timetable
 * - Students: view published only for their classId
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

router.use(authenticate);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_SUBJECTS = [
  'English', 'Tamil', 'Maths', 'Physics', 'Chemistry', 'Biology',
  'Social Science', 'Hindi', 'CS', 'ST', 'CCA', 'PE', 'PT'
];

const getTenantId = (req) =>
  req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;

const isAdminUser = (req) => {
  const r = (req.user.role || '').toUpperCase();
  return ['ADMIN', 'SCHOOL_ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(r) || req.user.isAdmin === true;
};

const isClassUser = (req) =>
  req.user.isClass === true || (req.user.role || '').toUpperCase() === 'CLASS';

const emptyDay = () => ({ classwork: '', homework: '' });

const emptyRow = (subject) => ({
  subject,
  Monday: emptyDay(),
  Tuesday: emptyDay(),
  Wednesday: emptyDay(),
  Thursday: emptyDay(),
  Friday: emptyDay(),
  Saturday: emptyDay()
});

const normalizeRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && r.subject && String(r.subject).trim())
    .map((r) => {
      const row = emptyRow(String(r.subject).trim());
      DAYS.forEach((d) => {
        const cell = r[d] || {};
        row[d] = {
          classwork: cell.classwork != null ? String(cell.classwork) : '',
          homework: cell.homework != null ? String(cell.homework) : ''
        };
      });
      return row;
    });
};

// Default blank template subjects for class create UI
router.get('/template', async (req, res) => {
  res.json({
    success: true,
    data: {
      days: DAYS,
      defaultSubjects: DEFAULT_SUBJECTS,
      blankRows: DEFAULT_SUBJECTS.map((s) => emptyRow(s))
    }
  });
});

// Admin: all timetables
router.get('/admin/all', requireAdmin, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { classId, isPublished, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { tenantId, isActive: true };
    if (classId) filter.classId = classId;
    if (isPublished !== undefined && isPublished !== '') {
      filter.isPublished = isPublished === 'true';
    }
    const [data, total] = await Promise.all([
      Timetable.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('classId', 'name section classCode'),
      Timetable.countDocuments(filter)
    ]);
    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)) || 0
      }
    });
  } catch (e) { next(e); }
});

// Admin single
router.get('/admin/:id', requireAdmin, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const tt = await Timetable.findOne({ _id: req.params.id, tenantId })
      .populate('classId', 'name section classCode');
    if (!tt) return res.status(404).json({ success: false, error: { message: 'Not found' } });
    res.json({ success: true, data: tt });
  } catch (e) { next(e); }
});

// List for current actor
// Class: own class all (draft+published)
// Student: published only for classId
// Admin without query: all
router.get('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const filter = { tenantId, isActive: true };

    if (isClassUser(req)) {
      filter.classId = req.user.classId;
    } else if (isAdminUser(req)) {
      if (req.query.classId) filter.classId = req.query.classId;
      if (req.query.isPublished !== undefined && req.query.isPublished !== '') {
        filter.isPublished = req.query.isPublished === 'true';
      }
    } else {
      // student / teacher with class
      if (!req.user.classId) {
        return res.json({ success: true, data: [] });
      }
      filter.classId = req.user.classId;
      filter.isPublished = true;
    }

    const data = await Timetable.find(filter)
      .sort({ updatedAt: -1 })
      .populate('classId', 'name section classCode');

    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Create — Class (own class only) or Admin (must pass classId)
router.post('/', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    let classId = req.body.classId;
    let createdByRole = 'OTHER';

    if (isClassUser(req)) {
      classId = req.user.classId;
      createdByRole = 'CLASS';
    } else if (isAdminUser(req)) {
      createdByRole = 'ADMIN';
      if (!classId) {
        return res.status(400).json({ success: false, error: { message: 'classId required' } });
      }
    } else {
      return res.status(403).json({ success: false, error: { message: 'Not allowed to create timetable' } });
    }

    if (!classId) {
      return res.status(400).json({ success: false, error: { message: 'Class not found on session' } });
    }

    const classDoc = await Class.findOne({ _id: classId, tenantId });
    if (!classDoc) {
      return res.status(400).json({ success: false, error: { message: 'Invalid class' } });
    }

    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, error: { message: 'Title is required' } });
    }

    const rows = normalizeRows(req.body.rows && req.body.rows.length ? req.body.rows : DEFAULT_SUBJECTS.map((s) => emptyRow(s)));

    const tt = await Timetable.create({
      title,
      weekLabel: (req.body.weekLabel || '').trim(),
      description: (req.body.description || '').trim(),
      tenantId,
      classId,
      createdBy: req.user.id || req.user._id || req.user.classId,
      createdByRole,
      rows,
      isPublished: !!req.body.isPublished,
      isActive: true
    });

    await tt.populate('classId', 'name section classCode');
    res.status(201).json({ success: true, message: 'Timetable created', data: tt });
  } catch (e) { next(e); }
});

// Update — Class (own) or Admin (any)
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const tt = await Timetable.findOne({ _id: req.params.id, tenantId });
    if (!tt) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    if (isClassUser(req)) {
      if (String(tt.classId) !== String(req.user.classId)) {
        return res.status(403).json({ success: false, error: { message: 'Not your class timetable' } });
      }
    } else if (!isAdminUser(req)) {
      return res.status(403).json({ success: false, error: { message: 'Not allowed' } });
    }

    if (req.body.title !== undefined) tt.title = String(req.body.title).trim();
    if (req.body.weekLabel !== undefined) tt.weekLabel = String(req.body.weekLabel).trim();
    if (req.body.description !== undefined) tt.description = String(req.body.description).trim();
    if (req.body.rows !== undefined) tt.rows = normalizeRows(req.body.rows);
    if (req.body.isPublished !== undefined) tt.isPublished = !!req.body.isPublished;

    // Admin may reassign class
    if (isAdminUser(req) && req.body.classId) {
      const classDoc = await Class.findOne({ _id: req.body.classId, tenantId });
      if (!classDoc) {
        return res.status(400).json({ success: false, error: { message: 'Invalid class' } });
      }
      tt.classId = req.body.classId;
    }

    await tt.save();
    await tt.populate('classId', 'name section classCode');
    res.json({ success: true, message: 'Timetable updated', data: tt });
  } catch (e) { next(e); }
});

// Publish toggle — Class (own) or Admin
router.patch('/:id/publish', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const tt = await Timetable.findOne({ _id: req.params.id, tenantId });
    if (!tt) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    if (isClassUser(req)) {
      if (String(tt.classId) !== String(req.user.classId)) {
        return res.status(403).json({ success: false, error: { message: 'Not your class timetable' } });
      }
    } else if (!isAdminUser(req)) {
      return res.status(403).json({ success: false, error: { message: 'Not allowed' } });
    }

    if (typeof req.body.isPublished !== 'boolean') {
      return res.status(400).json({ success: false, error: { message: 'isPublished boolean required' } });
    }

    tt.isPublished = req.body.isPublished;
    await tt.save();
    await tt.populate('classId', 'name section classCode');

    const label = tt.classId
      ? (tt.classId.name + (tt.classId.section ? '-' + tt.classId.section : ''))
      : 'class';

    res.json({
      success: true,
      message: tt.isPublished
        ? ('Published to ' + label + ' students only')
        : 'Unpublished',
      data: tt
    });
  } catch (e) { next(e); }
});

// Delete — Class (own) or Admin (any)
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const tt = await Timetable.findOne({ _id: req.params.id, tenantId });
    if (!tt) return res.status(404).json({ success: false, error: { message: 'Not found' } });

    if (isClassUser(req)) {
      if (String(tt.classId) !== String(req.user.classId)) {
        return res.status(403).json({ success: false, error: { message: 'Not your class timetable' } });
      }
    } else if (!isAdminUser(req)) {
      return res.status(403).json({ success: false, error: { message: 'Not allowed' } });
    }

    await Timetable.deleteOne({ _id: tt._id });
    res.json({ success: true, message: 'Timetable deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
