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
const StudentProfile = require('../models/StudentProfile');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Middleware to ensure user is a student
router.use((req, res, next) => {
  const role = (req.user.role || '').replace(/_/g, ' ').trim().toUpperCase();
  if (role !== 'STUDENT') {
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
      schoolId: tenantId,
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

// Timetable — only published schedules for this student's class
router.get('/timetable', async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const tenantId = req.user.tenantId || req.user.schoolId;

    if (!classId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const timetable = await Timetable.find({
      tenantId,
      classId,
      isActive: true,
      isPublished: true
    })
      .sort({ updatedAt: -1 })
      .populate('classId', 'name section');

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
    const schoolId = req.user.tenantId;

    const homeworks = await Homework.find({
      schoolId,
      classId,
      isPublished: true
    })
      .sort({ dueDate: -1 });

    const homeworkWithSubmissions = await Promise.all(
      homeworks.map(async (hw) => {
        const submission = await HomeworkSubmission.findOne({
          tenantId: schoolId,
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
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const filter = { tenantId, studentId, isPublished: true };

    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.examType) filter.examType = req.query.examType;

    const [marks, total] = await Promise.all([
      Mark.find(filter)
        .sort({ examDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Mark.countDocuments(filter),
    ]);

    const marksData = marks.map((mark) => mark.toObject());
    const totalMarksObtained = marksData.reduce((sum, mark) => sum + Number(mark.marksObtained || 0), 0);
    const totalMaxMarks = marksData.reduce((sum, mark) => sum + Number(mark.totalMarks || 0), 0);
    const overallPercentage = totalMaxMarks > 0
      ? Math.round(((totalMarksObtained / totalMaxMarks) * 100) * 100) / 100
      : 0;

    res.json({
      success: true,
      data: {
        marks: marksData,
        statistics: {
          totalSubjects: marksData.length,
          totalMarksObtained,
          totalMaxMarks,
          overallPercentage,
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Profile
router.get('/profile', async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    // Always fetch the student from the User collection with class populated,
    // so class/section are available even if a StudentProfile doc is missing.
    const user = await User.findOne({ _id: studentId })
      .populate({
        path: 'classId',
        select: 'name section gradeLevel'
      })
      .select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const profileData = { ...user.toObject() };

    // Overlay the richer StudentProfile document when it exists
    const studentProfile = await StudentProfile.findOne({ tenantId, userId: studentId })
      .populate('classId', 'name section gradeLevel');

    if (studentProfile) {
      Object.assign(profileData, studentProfile.toObject(), {
        class_name: studentProfile.classId?.name,
        section: studentProfile.classId?.section,
        grade_level: studentProfile.classId?.gradeLevel
      });
    } else if (user.classId) {
      profileData.class_name = user.classId.name;
      profileData.section = user.classId.section;
      profileData.grade_level = user.classId.gradeLevel;
    }

    res.json({ success: true, data: profileData });
  } catch (error) {
    next(error);
  }
});

module.exports = router;