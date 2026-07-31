/**
 * Teacher Routes
 * Teacher-specific endpoints for class management
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ClassModel = require('../models/Class');
const StudentProfile = require('../models/StudentProfile');
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const ClassCircular = require('../models/ClassCircular');
const ClassSubject = require('../models/ClassSubject');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Middleware to ensure user is a Teacher or Admin
router.use((req, res, next) => {
  if (req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN' && req.user.role !== 'TENANT_ADMIN') {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Teachers only.' }
    });
  }
  next();
});

// ============================================
// Dashboard Stats (Teacher)
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Get class subjects taught by this teacher
    const taughtSubjects = await ClassSubject.find({ tenantId, teacherId: userId }).select('classId');
    const subjectClassIds = taughtSubjects.map(cs => cs.classId);

    // Get classes where user is class teacher or subject teacher
    const classes = await ClassModel.find({
      tenantId,
      isActive: true,
      $or: [
        { classTeacherId: userId },
        { _id: { $in: subjectClassIds } }
      ]
    });

    const classIds = classes.map(c => c._id);

    // Calculate student counts for these classes
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await StudentProfile.countDocuments({
          tenantId,
          classId: cls._id,
          isActive: true
        });
        return {
          ...cls.toObject(),
          student_count: studentCount
        };
      })
    );

    // Get homeworks created by this teacher or for their classes
    const teacherHomeworks = await Homework.find({
      tenantId,
      $or: [{ createdBy: userId }, { classId: { $in: classIds } }]
    }).select('_id');

    const homeworkIds = teacherHomeworks.map(h => h._id);

    const pendingSubmissionsCount = await HomeworkSubmission.countDocuments({
      tenantId,
      homeworkId: { $in: homeworkIds },
      status: 'submitted'
    });

    res.json({
      success: true,
      data: {
        classes: classesWithCounts,
        pendingSubmissions: pendingSubmissionsCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// My Classes
// ============================================
router.get('/classes', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const taughtSubjects = await ClassSubject.find({ tenantId, teacherId: userId }).select('classId');
    const subjectClassIds = taughtSubjects.map(cs => cs.classId);

    const classes = await ClassModel.find({
      tenantId,
      isActive: true,
      $or: [
        { classTeacherId: userId },
        { _id: { $in: subjectClassIds } }
      ]
    })
      .populate('classTeacherId', 'name')
      .sort({ gradeLevel: 1, section: 1 });

    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await StudentProfile.countDocuments({
          tenantId,
          classId: cls._id,
          isActive: true
        });
        return {
          ...cls.toObject(),
          class_teacher_name: cls.classTeacherId?.name || null,
          student_count: studentCount
        };
      })
    );

    res.json({ success: true, data: classesWithCounts });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Students in My Classes
// ============================================
router.get('/students', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    let targetClassIds = [];

    if (classId) {
      targetClassIds = [classId];
    } else {
      const taughtSubjects = await ClassSubject.find({ tenantId, teacherId: userId }).select('classId');
      const subjectClassIds = taughtSubjects.map(cs => cs.classId);

      const classes = await ClassModel.find({
        tenantId,
        isActive: true,
        $or: [
          { classTeacherId: userId },
          { _id: { $in: subjectClassIds } }
        ]
      }).select('_id');

      targetClassIds = classes.map(c => c._id);
    }

    const studentProfiles = await StudentProfile.find({
      tenantId,
      classId: { $in: targetClassIds },
      isActive: true
    })
      .populate({
        path: 'userId',
        match: { role: 'STUDENT', isActive: true, tenantId },
        select: 'name email phone avatarUrl role isActive'
      })
      .populate('classId', 'name section gradeLevel')
      .sort({ rollNumber: 1 });

    const validProfiles = studentProfiles.filter(sp => sp.userId !== null);

    const formattedStudents = validProfiles.map(sp => ({
      ...sp.userId.toObject(),
      student_id: sp._id,
      roll_number: sp.rollNumber,
      class_id: sp.classId?._id,
      class_name: sp.classId?.name,
      section: sp.classId?.section
    }));

    res.json({ success: true, data: formattedStudents });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Homework Management
// ============================================
router.get('/homework', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    let queryFilter = { tenantId, createdBy: userId };
    if (classId) {
      queryFilter = { tenantId, $or: [{ createdBy: userId }, { classId }] };
    }

    const homeworks = await Homework.find(queryFilter)
      .populate('subjectId', 'name')
      .populate('classId', 'name section')
      .sort({ dueDate: -1 });

    const homeworkWithCounts = await Promise.all(
      homeworks.map(async (hw) => {
        const totalSubmissions = await HomeworkSubmission.countDocuments({ tenantId, homeworkId: hw._id });
        const submittedCount = await HomeworkSubmission.countDocuments({ tenantId, homeworkId: hw._id, status: 'submitted' });

        return {
          ...hw.toObject(),
          subject_name: hw.subjectId?.name,
          class_name: hw.classId?.name,
          section: hw.classId?.section,
          total_submissions: totalSubmissions,
          submitted_count: submittedCount
        };
      })
    );

    res.json({ success: true, data: homeworkWithCounts });
  } catch (error) {
    next(error);
  }
});

router.post('/homework', async (req, res, next) => {
  try {
    const { classId, subjectId, title, description, dueDate, attachmentUrl } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const homework = new Homework({
      tenantId,
      classId,
      subjectId,
      title,
      description,
      attachmentUrl: attachmentUrl || null,
      dueDate: new Date(dueDate),
      createdBy: userId,
      isPublished: true
    });

    await homework.save();

    const students = await StudentProfile.find({ tenantId, classId, isActive: true });

    const submissionPromises = students.map(student => {
      const sub = new HomeworkSubmission({
        tenantId,
        homeworkId: homework._id,
        studentId: student.userId,
        status: 'pending'
      });
      return sub.save();
    });

    await Promise.all(submissionPromises);

    res.status(201).json({ success: true, data: { id: homework._id } });
  } catch (error) {
    next(error);
  }
});

router.put('/homework/:id', async (req, res, next) => {
  try {
    const { title, description, dueDate, isPublished } = req.body;
    const tenantId = req.user.tenantId;

    await Homework.findOneAndUpdate(
      { tenantId, _id: req.params.id, createdBy: req.user.id },
      {
        $set: {
          title,
          description,
          dueDate: new Date(dueDate),
          isPublished: isPublished !== undefined ? isPublished : true,
          updatedAt: new Date()
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/homework/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    await Homework.findOneAndDelete({ tenantId, _id: req.params.id, createdBy: req.user.id });
    await HomeworkSubmission.deleteMany({ tenantId, homeworkId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/homework/:id/submissions', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const submissions = await HomeworkSubmission.find({ tenantId, homeworkId: req.params.id })
      .populate('studentId', 'name avatarUrl')
      .lean();

    const formattedSubmissions = await Promise.all(
      submissions.map(async (sub) => {
        const studentProfile = await StudentProfile.findOne({ tenantId, userId: sub.studentId?._id });
        return {
          ...sub,
          student_name: sub.studentId?.name,
          avatar_url: sub.studentId?.avatarUrl,
          student_id: studentProfile?._id,
          roll_number: studentProfile?.rollNumber
        };
      })
    );

    formattedSubmissions.sort((a, b) => (a.roll_number || 0) - (b.roll_number || 0));

    res.json({ success: true, data: formattedSubmissions });
  } catch (error) {
    next(error);
  }
});

router.put('/homework/:id/submissions/:studentId', async (req, res, next) => {
  try {
    const { grade, remarks } = req.body;
    const tenantId = req.user.tenantId;

    await HomeworkSubmission.findOneAndUpdate(
      { tenantId, homeworkId: req.params.id, studentId: req.params.studentId },
      {
        $set: {
          grade,
          remarks,
          status: 'graded',
          gradedAt: new Date(),
          gradedBy: req.user.id
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Class Circulars
// ============================================
router.get('/circulars', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    let queryFilter = { tenantId, createdBy: userId };
    if (classId) {
      queryFilter = { tenantId, classId, createdBy: userId };
    }

    const circulars = await ClassCircular.find(queryFilter)
      .populate('createdBy', 'name')
      .populate('classId', 'name section')
      .sort({ issueDate: -1, createdAt: -1 });

    const formattedCirculars = circulars.map(c => ({
      ...c.toObject(),
      created_by_name: c.createdBy?.name,
      class_name: c.classId?.name,
      section: c.classId?.section
    }));

    res.json({ success: true, data: formattedCirculars });
  } catch (error) {
    next(error);
  }
});

router.post('/circulars', async (req, res, next) => {
  try {
    const { classId, title, content, circularNo } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const circular = new ClassCircular({
      tenantId,
      classId,
      title,
      content,
      circularNo: circularNo || null,
      createdBy: userId,
      isPublished: true,
      issueDate: new Date()
    });

    await circular.save();

    res.status(201).json({ success: true, data: { id: circular._id } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;