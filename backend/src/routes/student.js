/**
 * Student Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const ExamSchedule = require('../models/ExamSchedule');
const Exam = require('../models/Exam');
const Timetable = require('../models/Timetable');
const Mark = require('../models/Mark');
const LeaveRequest = require('../models/LeaveRequest');
const StudentProfile = require('../models/StudentProfile');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Middleware to ensure user is a student
router.use((req, res, next) => {
  if (req.user.role !== 'Student') {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Students only.' }
    });
  }
  next();
});

// Dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const studentId = req.user.id;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    // Convert tenantId to ObjectId for proper MongoDB comparison
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) 
      ? new mongoose.Types.ObjectId(tenantId) 
      : tenantId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pending homework count
    const pendingHomeworkCount = await HomeworkSubmission.countDocuments({
      tenantId: tenantObjectId,
      studentId,
      status: 'pending'
    });

    // Upcoming exams - include both class-specific and school-wide (classId is null)
    let examQuery = { tenantId: tenantObjectId, isPublished: true };
    if (classId) {
      // Convert classId to ObjectId as well
      const classObjectId = mongoose.Types.ObjectId.isValid(classId)
        ? new mongoose.Types.ObjectId(classId)
        : classId;
      examQuery.$or = [
        { classId: classObjectId },
        { classId: null },
        { classId: { $exists: false } }
      ];
    } else {
      examQuery.$or = [
        { classId: null },
        { classId: { $exists: false } }
      ];
    }
    examQuery.date = { $gte: today };
    
    const exams = await ExamSchedule.find(examQuery)
      .sort({ date: 1, startTime: 1 })
      .limit(5)
      .populate('examId', 'name type');

    // Recent homework
    const homework = await Homework.find({
      tenantId,
      classId,
      isPublished: true
    })
      .sort({ dueDate: -1 })
      .limit(5);

    // Attach submission status for recent homework
    const homeworkWithSubmissions = await Promise.all(
      homework.map(async (hw) => {
        const submission = await HomeworkSubmission.findOne({
          tenantId,
          homeworkId: hw._id,
          studentId
        });
        return {
          ...hw.toObject(),
          submission_status: submission ? submission.status : 'pending',
          grade: submission ? submission.grade : null,
          remarks: submission ? submission.remarks : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        pendingHomework: pendingHomeworkCount,
        upcomingExams: exams,
        recentHomework: homeworkWithSubmissions
      }
    });
  } catch (error) {
    next(error);
  }
});

// Timetable
router.get('/timetable', async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    const timetable = await Timetable.find({
      tenantId,
      classId,
      isActive: true
    })
      .sort({ dayOfWeek: 1, periodNumber: 1 })
      .populate('teacherId', 'name');

    res.json({ success: true, data: timetable });
  } catch (error) {
    next(error);
  }
});

// Homework
router.get('/homework', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    const homeworks = await Homework.find({
      tenantId,
      classId,
      isPublished: true
    })
      .sort({ dueDate: -1 });

    const homeworkWithSubmissions = await Promise.all(
      homeworks.map(async (hw) => {
        const submission = await HomeworkSubmission.findOne({
          tenantId,
          homeworkId: hw._id,
          studentId
        }).populate('gradedBy', 'name');

        return {
          ...hw.toObject(),
          submission_status: submission ? submission.status : 'pending',
          submitted_at: submission ? submission.submittedAt : null,
          grade: submission ? submission.grade : null,
          remarks: submission ? submission.remarks : null,
          graded_by_name: submission?.gradedBy?.name || null
        };
      })
    );

    res.json({ success: true, data: homeworkWithSubmissions });
  } catch (error) {
    next(error);
  }
});

// Submit homework
router.post('/homework/:id/submit', async (req, res, next) => {
  try {
    const { submissionText, attachmentUrl } = req.body;
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const homeworkId = req.params.id;

    const submission = await HomeworkSubmission.findOneAndUpdate(
      { tenantId, homeworkId, studentId },
      {
        $set: {
          submissionText,
          attachmentUrl,
          status: 'submitted',
          submittedAt: new Date()
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, message: 'Homework submitted successfully', data: submission });
  } catch (error) {
    next(error);
  }
});

// Exams - Students see both their class-specific schedules AND school-wide schedules
router.get('/exams', async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    console.log('[Student Exams] Request received:', { 
      userId: req.user.id, 
      tenantId, 
      classId, 
      role: req.user.role 
    });

    // Convert tenantId to ObjectId for proper MongoDB comparison
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) 
      ? new mongoose.Types.ObjectId(tenantId) 
      : tenantId;

    // Build query to include both class-specific and school-wide (classId is null) schedules
    let query = { tenantId: tenantObjectId, isPublished: true };
    if (classId) {
      // Convert classId to ObjectId as well
      const classObjectId = mongoose.Types.ObjectId.isValid(classId)
        ? new mongoose.Types.ObjectId(classId)
        : classId;
      query.$or = [
        { classId: classObjectId },
        { classId: null },
        { classId: { $exists: false } }
      ];
    } else {
      // Student without a class - only show school-wide schedules
      query.$or = [
        { classId: null },
        { classId: { $exists: false } }
      ];
    }

    console.log('[Student Exams] Query:', JSON.stringify(query));

    const examSchedules = await ExamSchedule.find(query)
      .populate({
        path: 'examId',
        match: { isPublished: true, tenantId: tenantObjectId },
        select: 'name type isPublished'
      })
      .populate('classId', 'name section')
      .sort({ date: 1, startTime: 1 });

    // Include all schedules - both with and without examId
    // (some schedules may be standalone without a linked exam)
    res.json({ success: true, data: examSchedules });
  } catch (error) {
    next(error);
  }
});

// Marks/Report Card
router.get('/marks', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    const marks = await Mark.find({ tenantId, studentId })
      .populate('examId', 'name type startDate')
      .sort({ 'examId.startDate': -1 });

    res.json({ success: true, data: marks });
  } catch (error) {
    next(error);
  }
});

// Leave requests
router.get('/leave', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    const leaves = await LeaveRequest.find({ tenantId, studentId })
      .sort({ createdAt: -1 })
      .populate('approvedBy', 'name');

    res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
});

router.post('/leave', async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason, attachmentUrl } = req.body;
    const studentId = req.user.id;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    const leaveRequest = new LeaveRequest({
      tenantId,
      studentId,
      classId,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      attachmentUrl,
      appliedBy: studentId,
      status: 'pending'
    });

    await leaveRequest.save();

    res.status(201).json({ success: true, data: { id: leaveRequest._id } });
  } catch (error) {
    next(error);
  }
});

// Profile
router.get('/profile', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    const studentProfile = await StudentProfile.findOne({ tenantId, userId: studentId })
      .populate({
        path: 'userId',
        match: { tenantId },
        select: '-password'
      })
      .populate('classId', 'name section gradeLevel');

    if (!studentProfile || !studentProfile.userId) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const profileData = {
      ...studentProfile.userId.toObject(),
      ...studentProfile.toObject(),
      class_name: studentProfile.classId?.name,
      section: studentProfile.classId?.section,
      grade_level: studentProfile.classId?.gradeLevel
    };

    res.json({ success: true, data: profileData });
  } catch (error) {
    next(error);
  }
});

module.exports = router;