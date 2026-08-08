/**
 * Homework Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const Homework = require('../models/Homework');
const { authenticate } = require('../middleware/authMiddleware');
const { requireTeacher, requireAdmin } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/homework
 * @desc    Get all homework (filtered by user role)
 * @query   classId, page, limit
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const { classId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { schoolId: req.user.tenantId };
    
    // Filter by role
    if (req.user.role === 'Student') {
      query.classId = req.user.classId;
      query.isPublished = true;
    } else if (req.user.role === 'Teacher') {
      if (classId) {
        query.classId = classId;
      }
    }
    
    const homeworks = await Homework.find(query)
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('teacher', 'name email')
      .populate('classId', 'name section');
    
    const total = await Homework.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: homeworks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/homework/:id
 * @desc    Get single homework details
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const homework = await Homework.findOne({
      _id: req.params.id,
      schoolId: req.user.tenantId
    })
    .populate('teacher', 'name email')
    .populate('classId', 'name section');
    
    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: homework
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/homework
 * @desc    Create new homework assignment
 * @body    { title, subject, classGrade, description, dueDate, attachments, classId, maxMarks, tags }
 * @access  Teachers and Admins only
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      subject,
      classGrade,
      description,
      dueDate,
      attachments,
      classId,
      maxMarks,
      tags
    } = req.body;
    
    const homework = new Homework({
      title,
      subject,
      classGrade,
      description,
      dueDate: new Date(dueDate),
      attachments: attachments || [],
      teacher: req.user.id,
      schoolId: req.user.tenantId,
      classId: classId || req.user.classId,
      maxMarks: maxMarks || 100,
      tags: tags || [],
      isPublished: true
    });
    
    await homework.save();
    
    res.status(201).json({
      success: true,
      data: homework,
      message: 'Homework created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/homework/:id
 * @desc    Update homework assignment
 * @access  Teachers and Admins only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      subject,
      classGrade,
      description,
      dueDate,
      attachments,
      maxMarks,
      tags,
      isPublished
    } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (classGrade !== undefined) updates.classGrade = classGrade;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
    if (attachments !== undefined) updates.attachments = attachments;
    if (maxMarks !== undefined) updates.maxMarks = maxMarks;
    if (tags !== undefined) updates.tags = tags;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    
    const homework = await Homework.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: homework,
      message: 'Homework updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/homework/:id
 * @desc    Delete homework assignment
 * @access  Teachers and Admins only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const homework = await Homework.findOneAndDelete({
      _id: req.params.id,
      schoolId: req.user.tenantId
    });
    
    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Homework deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/homework/:id/submit
 * @desc    Submit homework (for students)
 * @body    { submissionFile }
 * @access  Students only
 */
router.post('/:id/submit', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'Student') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only students can submit homework' }
      });
    }
    
    const { submissionFile } = req.body;
    
    const homework = await Homework.findOne({
      _id: req.params.id,
      schoolId: req.user.tenantId
    });
    
    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found' }
      });
    }
    
    await homework.addSubmission(req.user.id, submissionFile);
    
    res.status(200).json({
      success: true,
      data: homework,
      message: 'Homework submitted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/homework/:id/check
 * @desc    Check/grade a student submission
 * @body    { studentId, marks, maxMarks, feedback }
 * @access  Teachers only
 */
router.post('/:id/check', authenticate, requireTeacher, async (req, res, next) => {
  try {
    const { studentId, marks, maxMarks, feedback } = req.body;
    
    const homework = await Homework.findOne({
      _id: req.params.id,
      schoolId: req.user.tenantId
    });
    
    if (!homework) {
      return res.status(404).json({
        success: false,
        error: { message: 'Homework not found' }
      });
    }
    
    await homework.checkSubmission(studentId, marks, maxMarks, feedback);
    
    res.status(200).json({
      success: true,
      data: homework,
      message: 'Submission checked successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;