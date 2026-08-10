/**
 * Exams Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const ExamSchedule = require('../models/ExamSchedule');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin, requireTeacher } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/exams
 * @desc    Get all exams (filtered by user role)
 * @query   classId, page, limit
 * @access  Authenticated users
 * 
 * Filtering logic:
 * - Students: See school-wide exams (classId = null) + their class's specific exams
 * - Teachers: See school-wide exams + their class's specific exams (if classId query param provided)
 * - Admins: See all exams (no class filtering)
 */
router.get('/', async (req, res, next) => {
  try {
    const { classId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = { tenantId: req.user.tenantId };
    
    // Filter by role with proper class isolation
    if (req.user.role === 'Student') {
      query.isPublished = true;
      // Students see school-wide exams (classId = null) AND their class's specific exams
      if (req.user.classId) {
        query.$or = [
          { classId: null },
          { classId: { $exists: false } },
          { classId: req.user.classId }
        ];
      } else {
        // Students without a class only see school-wide exams
        query.$or = [
          { classId: null },
          { classId: { $exists: false } }
        ];
      }
    } else if (req.user.role === 'Teacher' && classId) {
      query.isPublished = true;
      // Teachers see school-wide exams AND their class's specific exams
      query.$or = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: classId }
      ];
    }
    
    const exams = await Exam.find(query)
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('classId', 'name section');
    
    const total = await Exam.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: exams,
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
 * @route   GET /api/exams/schedule/:classId
 * @desc    Get exam schedule for a class (Placed BEFORE /:id to prevent route clash)
 * @access  Authenticated users
 * 
 * Filtering logic:
 * - Students: See school-wide schedules (classId = null) + their class's specific schedules
 * - Teachers: See school-wide schedules + their class's specific schedules
 * - Admins: See all schedules
 */
router.get('/schedule/:classId', async (req, res, next) => {
  try {
    let query = {
      tenantId: req.user.tenantId,
      isPublished: true
    };
    
    // Apply class-based filtering for students and teachers
    if (req.user.role === 'Student' || req.user.role === 'Teacher' || req.user.role === 'CLASS_CONTROLLER') {
      const userClassId = req.user.classId;
      if (userClassId) {
        // See school-wide schedules (classId = null) AND their class's specific schedules
        query.$or = [
          { classId: null },
          { classId: { $exists: false } },
          { classId: userClassId }
        ];
      } else {
        // Users without a class only see school-wide schedules
        query.$or = [
          { classId: null },
          { classId: { $exists: false } }
        ];
      }
    } else {
      // Admins can optionally filter by the classId in the URL
      if (req.params.classId && req.params.classId !== 'null') {
        query.classId = req.params.classId;
      }
    }
    
    const schedules = await ExamSchedule.find(query)
      .sort({ date: 1, startTime: 1 })
      .populate('examId', 'name type')
      .populate('classId', 'name section');
    
    res.status(200).json({
      success: true,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/exams/:id
 * @desc    Get single exam with schedules
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
    .populate('classId', 'name section');
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' }
      });
    }
    
    // Get exam schedules
    const schedules = await ExamSchedule.find({
      examId: exam._id,
      isPublished: true
    }).populate('classId', 'name section');
    
    res.status(200).json({
      success: true,
      data: {
        ...exam.toObject(),
        schedules
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/exams
 * @desc    Create new exam
 * @body    { name, type, classId, startDate, endDate, description, academicYear }
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      type,
      classId,
      startDate,
      endDate,
      description,
      academicYear
    } = req.body;
    
    const exam = new Exam({
      name,
      type: type || 'OTHER',
      classId,
      tenantId: req.user.tenantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      academicYear,
      isPublished: false
    });
    
    await exam.save();
    
    res.status(201).json({
      success: true,
      data: exam,
      message: 'Exam created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/exams/:id
 * @desc    Update exam
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      name,
      type,
      startDate,
      endDate,
      description,
      academicYear,
      isPublished
    } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (startDate !== undefined) updates.startDate = new Date(startDate);
    if (endDate !== undefined) updates.endDate = new Date(endDate);
    if (description !== undefined) updates.description = description;
    if (academicYear !== undefined) updates.academicYear = academicYear;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: exam,
      message: 'Exam updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete exam
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' }
      });
    }
    
    // Delete associated schedules
    await ExamSchedule.deleteMany({ examId: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/exams/:id/schedule
 * @desc    Create exam schedule
 * @body    { title, subject, classId, date, startTime, endTime, duration, roomNo }
 * @access  Admin only
 */
router.post('/:id/schedule', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      subject,
      classId,
      date,
      startTime,
      endTime,
      duration,
      roomNo
    } = req.body;
    
    const schedule = new ExamSchedule({
      title,
      subject,
      examId: req.params.id,
      classId,
      tenantId: req.user.tenantId,
      date: new Date(date),
      startTime,
      endTime,
      duration: duration || 60,
      roomNo,
      isPublished: false
    });
    
    await schedule.save();
    
    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Exam schedule created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/exams/schedule/:id
 * @desc    Update exam schedule
 * @access  Admin only
 */
router.put('/schedule/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      title,
      subject,
      date,
      startTime,
      endTime,
      duration,
      roomNo,
      isPublished
    } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (date !== undefined) updates.date = new Date(date);
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (duration !== undefined) updates.duration = duration;
    if (roomNo !== undefined) updates.roomNo = roomNo;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    
    const schedule = await ExamSchedule.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam schedule not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: schedule,
      message: 'Exam schedule updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/exams/schedule/:id
 * @desc    Delete exam schedule
 * @access  Admin only
 */
router.delete('/schedule/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const schedule = await ExamSchedule.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam schedule not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Exam schedule deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;