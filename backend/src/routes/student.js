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
    const studentId = req.user.id;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pending homework count
    const pendingHomeworkCount = await HomeworkSubmission.countDocuments({
      tenantId,
      studentId,
      status: 'pending'
    });

    // Upcoming exams
    const exams = await ExamSchedule.find({
      tenantId,
      classId,
      scheduleDate: { $gte: today }
    })
      .sort({ scheduleDate: 1, startTime: 1 })
      .limit(5)
      .populate('examId', 'name type')
      .populate('subjectId', 'name');

    // Recent homework
    const homework = await Homework.find({
      tenantId,
      classId,
      isPublished: true
    })
      .sort({ dueDate: -1 })
      .limit(5)
      .populate('subjectId', 'name');

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
      .populate('subjectId', 'name')
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
      .sort({ dueDate: -1 })
      .populate('subjectId', 'name');

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

// Exams
router.get('/exams', async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    const examSchedules = await ExamSchedule.find({ tenantId, classId })
      .populate({
        path: 'examId',
        match: { isPublished: true, tenantId },
        select: 'name type isPublished'
      })
      .populate('subjectId', 'name')
      .sort({ scheduleDate: 1, startTime: 1 });

    const filteredExams = examSchedules.filter(es => es.examId !== null);

    res.json({ success: true, data: filteredExams });
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
      .populate('subjectId', 'name')
      .sort({ 'examId.startDate': -1, 'subjectId.name': 1 });

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