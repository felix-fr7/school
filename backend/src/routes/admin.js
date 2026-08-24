/**
 * Admin Routes
 * School administration endpoints
 * Converted from PostgreSQL to MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const SchoolContact = require('../models/SchoolContact');
const News = require('../models/News');
const LeaveRequest = require('../models/LeaveRequest');
const StudentProfile = require('../models/StudentProfile');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticate, isAdmin);

// ============================================
// Dashboard Stats
// ============================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;

    // Get counts using MongoDB aggregation
    const totalStudents = await User.countDocuments({
      tenantId,
      role: 'Student',
      isActive: true
    });

    const totalTeachers = await Teacher.countDocuments({
      tenantId,
      isActive: true
    });

    const totalClasses = await Class.countDocuments({
      tenantId,
      isActive: true
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendanceStats = await Class.aggregate([
      { $match: { tenantId, isActive: true } },
      { $lookup: {
          from: 'attendances',
          let: { classId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$classId', '$$classId'] },
                attendanceDate: { $gte: today, $lt: tomorrow }
              }
            }
          ],
          as: 'attendance'
        }
      },
      { $unwind: { path: '$attendance', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ['$attendance.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$attendance.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$attendance.status', 'late'] }, 1, 0] } }
        }
      }
    ]);

    const todayAttendance = attendanceStats.length > 0 ? attendanceStats[0] : { present: 0, absent: 0, late: 0 };

    // Get recent news
    const recentNews = await News.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title type isPublished createdAt');

    // Get pending leaves
    const pendingLeaves = await LeaveRequest.countDocuments({
      tenantId,
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalClasses,
        todayAttendance,
        recentNews,
        pendingLeaves
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Classes Management
// ============================================
router.get('/classes', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const classes = await Class.find({
      tenantId,
      isActive: true
    })
    .populate('teacherId', 'name')
    .select('-password');

    // Get student count for each class
    const classesWithCount = await Promise.all(
      classes.map(async (classItem) => {
        const studentCount = await User.countDocuments({
          classId: classItem._id,
          role: 'Student',
          isActive: true
        });
        
        return {
          ...classItem.toObject(),
          studentCount,
          classTeacherName: classItem.teacherId?.name || null
        };
      })
    );

    res.json({ success: true, data: classesWithCount });
  } catch (error) {
    next(error);
  }
});

router.get('/classes/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const classId = req.params.id;

    const classData = await Class.findOne({
      _id: classId,
      tenantId,
      isActive: true
    }).populate('teacherId', 'name email phone');

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true, data: classData });
  } catch (error) {
    next(error);
  }
});

router.post('/classes', async (req, res, next) => {
  try {
    const { name, section, gradeLevel, classTeacherId, assignedTeacherId, roomNumber, capacity, password } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const classData = {
      tenantId,
      name,
      section,
      gradeLevel,
      teacherId: assignedTeacherId || classTeacherId,
      roomNumber,
      capacity,
      isActive: true
    };

    // Include password if provided
    if (password) {
      classData.password = password;
    }

    const newClass = new Class(classData);
    await newClass.save();

    res.status(201).json({ success: true, data: { id: newClass._id, classCode: newClass.classCode } });
  } catch (error) {
    next(error);
  }
});

router.put('/classes/:id', async (req, res, next) => {
  try {
    const { name, section, gradeLevel, classTeacherId, roomNumber, capacity } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const updatedClass = await Class.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      {
        name,
        section,
        gradeLevel,
        teacherId: classTeacherId,
        roomNumber,
        capacity
      },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/classes/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const classId = req.params.id;

    console.log('[Class DELETE] Attempting to delete class:', classId, 'with tenantId:', tenantId);
    console.log('[Class DELETE] req.user:', { id: req.user.id, tenantId: req.user.tenantId, schoolId: req.user.schoolId, role: req.user.role });

    // First, verify the class exists and belongs to this tenant
    const classData = await Class.findOne({
      _id: classId,
      tenantId
    });

    if (!classData) {
      console.log('[Class DELETE] Class not found or tenant mismatch');
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get counts of related documents for the response
    const studentCount = await User.countDocuments({ classId, role: 'Student' });
    
    // Import models for cleanup
    const Homework = require('../models/Homework');
    const Exam = require('../models/Exam');
    const ExamSchedule = require('../models/ExamSchedule');
    const ClassSubject = require('../models/ClassSubject');
    const WeeklyLesson = require('../models/WeeklyLesson');
    const WeeklyLessonLog = require('../models/WeeklyLessonLog');
    const ClassCircular = require('../models/ClassCircular');
    const Timetable = require('../models/Timetable');

    const homeworkCount = await Homework.countDocuments({ classId });
    const examCount = await Exam.countDocuments({ classId });
    const examScheduleCount = await ExamSchedule.countDocuments({ classId });
    const classSubjectCount = await ClassSubject.countDocuments({ classId });
    const weeklyLessonCount = await WeeklyLesson.countDocuments({ classId });
    const weeklyLessonLogCount = await WeeklyLessonLog.countDocuments({ classId });
    const classCircularCount = await ClassCircular.countDocuments({ classId });
    const timetableCount = await Timetable.countDocuments({ classId });

    // Perform deletion in a controlled manner
    // Step 1: Detach students from this class (set classId to null)
    if (studentCount > 0) {
      await User.updateMany(
        { classId, role: 'Student' },
        { $unset: { classId: 1 } }
      );
    }

    // Step 2: Delete associated homework
    if (homeworkCount > 0) {
      await Homework.deleteMany({ classId });
    }

    // Step 3: Delete associated exams
    if (examCount > 0) {
      await Exam.deleteMany({ classId });
    }

    // Step 4: Delete associated exam schedules
    if (examScheduleCount > 0) {
      await ExamSchedule.deleteMany({ classId });
    }

    // Step 5: Delete associated class subjects
    if (classSubjectCount > 0) {
      await ClassSubject.deleteMany({ classId });
    }

    // Step 6: Delete associated weekly lessons
    if (weeklyLessonCount > 0) {
      await WeeklyLesson.deleteMany({ classId });
    }

    // Step 7: Delete associated weekly lesson logs
    if (weeklyLessonLogCount > 0) {
      await WeeklyLessonLog.deleteMany({ classId });
    }

    // Step 8: Delete associated class circulars
    if (classCircularCount > 0) {
      await ClassCircular.deleteMany({ classId });
    }

    // Step 9: Delete associated timetables
    if (timetableCount > 0) {
      await Timetable.deleteMany({ classId });
    }

    // Step 10: Finally, delete the class itself
    console.log('[Class DELETE] Deleting class:', classId);
    const deleteResult = await Class.findByIdAndDelete(classId);
    console.log('[Class DELETE] Delete result:', deleteResult);

    res.json({
      success: true,
      message: 'Class deleted successfully from database',
      data: {
        deletedClassId: classId,
        className: classData.name,
        section: classData.section,
        dependenciesHandled: {
          studentsDetached: studentCount,
          homeworksDeleted: homeworkCount,
          examsDeleted: examCount,
          examSchedulesDeleted: examScheduleCount,
          classSubjectsDeleted: classSubjectCount,
          weeklyLessonsDeleted: weeklyLessonCount,
          weeklyLessonLogsDeleted: weeklyLessonLogCount,
          classCircularsDeleted: classCircularCount,
          timetablesDeleted: timetableCount
        }
      }
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    next(error);
  }
});

// ============================================
// Class Dashboard
// ============================================
router.get('/classes/:id/dashboard', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const classId = req.params.id;

    // Get class details with teacher info
    const classData = await Class.findOne({
      _id: classId,
      tenantId,
      isActive: true
    }).populate('teacherId', 'name email phone');

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get total students count
    const totalStudents = await User.countDocuments({
      tenantId,
      classId: classId,
      role: 'Student',
      isActive: true
    });

    // Simple attendance rate calculation (default to 0)
    const attendanceRate = 0;

    // Get recent homework (limit 3) - handle if model doesn't exist
    let recentHomework = [];
    try {
      const Homework = require('../models/Homework');
      recentHomework = await Homework.find({
        tenantId,
        classId: classId,
        isPublished: true
      }).sort({ createdAt: -1 }).limit(3);
    } catch (e) {
      // Homework model may not exist
    }

    // Get upcoming exams (limit 3) - handle if model doesn't exist
    let upcomingExams = [];
    try {
      const ExamSchedule = require('../models/ExamSchedule');
      upcomingExams = await ExamSchedule.find({
        tenantId,
        classId: classId,
        isPublished: true,
        date: { $gte: new Date() }
      }).sort({ date: 1, time: 1 }).limit(3);
    } catch (e) {
      // ExamSchedule model may not exist
    }

    // Get recent announcements/news (limit 3)
    const recentAnnouncements = await News.find({
      tenantId,
      isPublished: true
    }).sort({ createdAt: -1 }).limit(3);

    res.json({
      success: true,
      data: {
        class: {
          id: classData._id,
          name: classData.name,
          section: classData.section,
          classCode: classData.classCode,
          teacher: classData.teacherId ? {
            id: classData.teacherId._id,
            name: classData.teacherId.name,
            email: classData.teacherId.email,
            phone: classData.teacherId.phone
          } : null
        },
        metrics: {
          totalStudents,
          attendanceRate
        },
        recentHomework,
        upcomingExams,
        recentAnnouncements
      }
    });
  } catch (error) {
    console.error('Error in class dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// Students Management
// ============================================
router.get('/students', async (req, res, next) => {
  try {
    const { classId, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    // Use schoolId for User model queries (User model uses schoolId, not tenantId)
    const schoolId = req.user.schoolId || req.user.tenantId;

    let query = {
      schoolId,
      role: 'Student',
      isActive: true
    };

    if (classId) {
      query.classId = classId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(query)
      .populate('classId', 'name section gradeLevel')
      .skip(offset)
      .limit(parseInt(limit))
      .select('-password');

    const total = await User.countDocuments(query);

    const studentData = students.map(student => ({
      id: student._id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      avatarUrl: student.profileImage,
      studentId: student.studentId,
      rollNumber: student.rollNumber,
      classId: student.classId?._id,
      className: student.classId?.name,
      section: student.classId?.section,
      gradeLevel: student.classId?.gradeLevel
    }));

    res.json({
      success: true,
      data: studentData,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total 
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/students/:id', async (req, res, next) => {
  try {
    // Use schoolId for User model queries (User model uses schoolId, not tenantId)
    const schoolId = req.user.schoolId || req.user.tenantId;
    const student = await User.findOne({
      _id: req.params.id,
      schoolId,
      role: 'Student',
      isActive: true
    })
    .populate('classId', 'name section gradeLevel')
    .select('-password');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ 
      success: true, 
      data: {
        id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        profileImage: student.profileImage,
        studentId: student.studentId,
        rollNumber: student.rollNumber,
        classId: student.classId?._id,
        className: student.classId?.name,
        section: student.classId?.section,
        gradeLevel: student.classId?.gradeLevel,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        address: student.address
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/students/:id', async (req, res, next) => {
  try {
    const { name, email, phone, classId, rollNumber, dateOfBirth, gender, 
            bloodGroup, address, city, state, fatherName, fatherPhone, motherName, motherPhone } = req.body;
    // Use schoolId for User model queries (User model uses schoolId, not tenantId)
    const schoolId = req.user.schoolId || req.user.tenantId;

    const updateData = {
      name,
      email,
      phone,
      classId,
      rollNumber,
      dateOfBirth,
      gender,
      ...(bloodGroup && { bloodGroup }),
      ...(address && { 'address.street': address }),
      ...(city && { 'address.city': city }),
      ...(state && { 'address.state': state })
    };

    const updatedStudent = await User.findOneAndUpdate(
      { 
        _id: req.params.id, 
        schoolId,
        role: 'Student'
      },
      updateData,
      { new: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Handle parent contact information if provided
    if (fatherName || motherName) {
      const emergencyContact = {};
      if (fatherName) emergencyContact.fatherName = fatherName;
      if (fatherPhone) emergencyContact.fatherPhone = fatherPhone;
      if (motherName) emergencyContact.motherName = motherName;
      if (motherPhone) emergencyContact.motherPhone = motherPhone;
      
      await User.findByIdAndUpdate(
        req.params.id,
        { emergencyContact }
      );
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/students/:id', async (req, res, next) => {
  try {
    // Use schoolId for User model queries (User model uses schoolId, not tenantId)
    const schoolId = req.user.schoolId || req.user.tenantId;
    const deletedStudent = await User.findOneAndUpdate(
      { 
        _id: req.params.id, 
        schoolId,
        role: 'Student'
      },
      { isActive: false },
      { new: true }
    );

    if (!deletedStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Create Student
// ============================================
router.post('/students', async (req, res, next) => {
  try {
    const { name, email, password, rollNumber, classId } = req.body;
    // Use schoolId for User model (tenantId is used for other models like Class, Teacher)
    const schoolId = req.user.schoolId || req.user.tenantId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student name is required' }
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student email is required' }
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password is required' }
      });
    }

    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Roll number is required' }
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
      schoolId
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: { message: 'Student with this email already exists' }
      });
    }

    // Check if roll number already exists
    const existingRollNumber = await User.findOne({
      rollNumber: rollNumber.trim(),
      schoolId,
      role: 'Student'
    });

    if (existingRollNumber) {
      return res.status(409).json({
        success: false,
        error: { message: 'Roll number already exists. Please use a unique roll number.' }
      });
    }

    // Generate studentId in STU-XXXX format
    const studentCount = await User.countDocuments({
      schoolId,
      role: 'Student'
    });
    const studentId = `STU-${String(studentCount + 1).padStart(4, '0')}`;

    // Create student data
    const studentData = {
      schoolId,
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      role: 'Student',
      rollNumber: rollNumber.trim(),
      studentId,
      classId: classId || null,
      isActive: true
    };

    // Create the student (password will be hashed by User model's pre-save hook)
    const newStudent = new User(studentData);
    await newStudent.save();

    // Return success response (excluding password)
    const studentObject = newStudent.toObject();
    delete studentObject.password;

    res.status(201).json({
      success: true,
      data: {
        id: newStudent._id,
        email: newStudent.email,
        name: newStudent.name,
        rollNumber: newStudent.rollNumber,
        studentId: newStudent.studentId,
        classId: newStudent.classId,
        createdAt: newStudent.createdAt
      },
      message: 'Student created successfully'
    });
  } catch (error) {
    console.error('Error creating student:', error);
    next(error);
  }
});

// ============================================
// Teachers Management
// ============================================

// Get available teachers for class assignment (must come before /teachers/:id)
router.get('/teachers/available', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const { classId, search, page = 1, limit = 100 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build filter
    let filter = {
      tenantId,
      isActive: true
    };

    if (classId) {
      // Include teachers who have no class OR are assigned to this specific class
      // We'll filter this in memory since MongoDB doesn't support OR with null checks easily
      const teachers = await Teacher.find(filter).select('-password');
      
      let filteredTeachers = teachers.filter(teacher => {
        if (!teacher.classId || teacher.classId === null) {
          return true; // Unassigned teachers
        }
        if (teacher.classId.toString() === classId) {
          return true; // Teachers assigned to this class
        }
        return false;
      });

      // Apply search filter
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filteredTeachers = filteredTeachers.filter(teacher => 
          searchRegex.test(teacher.name) || searchRegex.test(teacher.email)
        );
      }

      // Get total count after filtering
      const total = filteredTeachers.length;

      // Apply pagination
      const paginatedTeachers = filteredTeachers.slice(skip, skip + take);

      // Get class info for each teacher
      const teachersWithClass = await Promise.all(paginatedTeachers.map(async (teacher) => {
        let classInfo = null;
        if (teacher.classId) {
          const classDoc = await Class.findOne({ _id: teacher.classId, tenantId, isActive: true });
          if (classDoc) {
            classInfo = {
              id: classDoc._id,
              name: classDoc.name,
              section: classDoc.section
            };
          }
        }
        return {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          class: classInfo,
          created_at: teacher.createdAt
        };
      }));

      res.json({
        success: true,
        data: {
          teachers: teachersWithClass,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } else {
      // If no classId provided, only show unassigned teachers
      const teachers = await Teacher.find(filter).select('-password');
      
      let filteredTeachers = teachers.filter(teacher => !teacher.classId || teacher.classId === null);

      // Apply search filter
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filteredTeachers = filteredTeachers.filter(teacher => 
          searchRegex.test(teacher.name) || searchRegex.test(teacher.email)
        );
      }

      // Get total count after filtering
      const total = filteredTeachers.length;

      // Apply pagination
      const paginatedTeachers = filteredTeachers.slice(skip, skip + take);

      const teachersData = paginatedTeachers.map(teacher => ({
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        class: null,
        created_at: teacher.createdAt
      }));

      res.json({
        success: true,
        data: {
          teachers: teachersData,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/teachers', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const teachers = await Teacher.find({
      tenantId,
      isActive: true
    }).select('-password');

    const teacherData = teachers.map(teacher => ({
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      avatarUrl: teacher.profileImage,
      teacherId: teacher.teacherId,
      qualification: teacher.qualification,
      experienceYears: teacher.experienceYears,
      specialization: teacher.specialization,
      subjects: teacher.subjects
    }));

    res.json({ success: true, data: teacherData });
  } catch (error) {
    next(error);
  }
});

router.get('/teachers/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const teacher = await Teacher.findOne({
      _id: req.params.id,
      tenantId,
      isActive: true
    }).select('-password');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({ 
      success: true, 
      data: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        profileImage: teacher.profileImage,
        qualification: teacher.qualification,
        experienceYears: teacher.experienceYears,
        specialization: teacher.specialization,
        subjects: teacher.subjects
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/teachers', async (req, res, next) => {
  try {
    const { email, password, name, phone, qualification, experienceYears, age, gender, specialization, subjects } = req.body;

    // Use schoolId as tenantId for school admins
    const tenantId = req.user.tenantId || req.user.schoolId;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant or school ID is required' });
    }

    // Check if email already exists
    const existingTeacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Generate a temporary password if none provided (model requires one)
    const tempPassword = password || `Tch@${Math.random().toString(36).slice(-4)}${Date.now().toString().slice(-4)}`;

    // Generate a unique teacher ID (global unique index, so check across all tenants)
    const teacherCount = await Teacher.countDocuments({});
    let teacherId = `TCH-${String(teacherCount + 1).padStart(4, '0')}`;
    let suffix = 0;
    while (await Teacher.findOne({ teacherId }, { _id: 1 })) {
      suffix += 1;
      teacherId = `TCH-${String(teacherCount + 1).padStart(4, '0')}-${suffix}`;
    }

    const teacherData = {
      tenantId,
      email: email.toLowerCase(),
      phone,
      password: tempPassword,
      name,
      qualification,
      experienceYears,
      gender,
      specialization,
      subjects,
      teacherId,
      isActive: true
    };

    const newTeacher = new Teacher(teacherData);
    await newTeacher.save();

    res.status(201).json({ success: true, data: { userId: newTeacher._id, teacherId, tempPassword } });
  } catch (error) {
    console.error('Create Teacher Error:', error.message, error.errors || '');
    next(error);
  }
});

router.put('/teachers/:id', async (req, res, next) => {
  try {
    const { name, email, phone, qualification, experienceYears, specialization, subjects } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const updatedTeacher = await Teacher.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      {
        name,
        email: email.toLowerCase(),
        phone,
        qualification,
        experienceYears,
        specialization,
        subjects
      },
      { new: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/teachers/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;

    const teacher = await Teacher.findOne({
      _id: req.params.id,
      tenantId
    });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    // Unassign teacher from any class they might be assigned to
    await Class.updateMany(
      { teacherId: req.params.id },
      { $unset: { teacherId: 1 } }
    );

    // Delete the teacher from the database
    await Teacher.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Teacher deleted successfully from database',
      data: { deletedTeacherId: req.params.id, name: teacher.name }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Subjects Management
// ============================================
router.get('/subjects', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const subjects = await Subject.find({
      tenantId,
      isActive: true
    }).sort({ name: 1 });

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
});

router.post('/subjects', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    // Generate code from name if not provided
    let subjectCode = code ? code.toUpperCase().trim() : null;
    if (!subjectCode) {
      // Generate code from name (first 3 letters + random number)
      const namePart = name.trim().substring(0, 3).toUpperCase();
      const count = await Subject.countDocuments({ tenantId });
      subjectCode = `${namePart}-${String(count + 1).padStart(3, '0')}`;
    }

    // Check if code already exists
    const existingSubject = await Subject.findOne({ code: subjectCode, tenantId });
    if (existingSubject) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }

    const subjectData = {
      tenantId,
      name: name.trim(),
      code: subjectCode,
      description: description ? description.trim() : '',
      isActive: true
    };

    const newSubject = new Subject(subjectData);
    await newSubject.save();

    res.status(201).json({ 
      success: true, 
      data: {
        id: newSubject._id,
        name: newSubject.name,
        code: newSubject.code,
        description: newSubject.description,
        isActive: newSubject.isActive,
        createdAt: newSubject.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    next(error);
  }
});

router.put('/subjects/:id', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    const updateData = {
      name: name.trim(),
      code: code ? code.toUpperCase().trim() : undefined,
      description: description ? description.trim() : ''
    };

    const updatedSubject = await Subject.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ 
      success: true,
      data: {
        id: updatedSubject._id,
        name: updatedSubject.name,
        code: updatedSubject.code,
        description: updatedSubject.description,
        isActive: updatedSubject.isActive
      }
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    next(error);
  }
});

router.delete('/subjects/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const deletedSubject = await Subject.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { isActive: false },
      { new: true }
    );

    if (!deletedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// School Contacts
// ============================================
router.get('/contacts', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const contacts = await SchoolContact.find({
      tenantId,
      isActive: true
    }).sort({ department: 1 });

    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

router.post('/contacts', async (req, res, next) => {
  try {
    const { department, name, designation, phone, email } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const contactData = {
      tenantId,
      department,
      name,
      designation,
      phone,
      email,
      isActive: true
    };

    const newContact = new SchoolContact(contactData);
    await newContact.save();

    res.status(201).json({ success: true, data: { id: newContact._id } });
  } catch (error) {
    next(error);
  }
});

router.put('/contacts/:id', async (req, res, next) => {
  try {
    const { department, name, designation, phone, email } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const updatedContact = await SchoolContact.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { department, name, designation, phone, email },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/contacts/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const deletedContact = await SchoolContact.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { isActive: false },
      { new: true }
    );

    if (!deletedContact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Exam Timetable Management
// ============================================

/**
 * @route   GET /api/admin/exams
 * @desc    Get all exam timetables for admin's school
 * @access  Admin only
 */
router.get('/exams', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Exam = require('../models/Exam');

    const exams = await Exam.find({ tenantId })
      .populate('classId', 'name section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Exam.countDocuments({ tenantId });

    const examData = exams.map(exam => {
      // Extract fileUrl from description if it exists
      // Description format: "Exam timetable file: /uploads/exam/xxx.pdf"
      let fileUrl = null;
      if (exam.description && exam.description.includes('Exam timetable file:')) {
        fileUrl = exam.description.replace('Exam timetable file: ', '').trim();
      }

      return {
        id: exam._id,
        title: exam.name,
        classId: exam.classId?._id,
        class: exam.classId ? {
          id: exam.classId._id,
          name: exam.classId.name,
          section: exam.classId.section
        } : null,
        // Use startDate as the date field for frontend compatibility
        date: exam.startDate,
        startDate: exam.startDate,
        endDate: exam.endDate,
        isPublished: exam.isPublished,
        description: exam.description,
        fileUrl: fileUrl,
        academicYear: exam.academicYear,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        exams: examData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/content/exams
 * @desc    Create new exam timetable
 * @body    { title, classId, fileUrl }
 * @access  Admin only
 */
router.post('/content/exams', async (req, res, next) => {
  try {
    const { title, classId, fileUrl } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Exam title is required' }
      });
    }

    const Exam = require('../models/Exam');

    const exam = new Exam({
      name: title.trim(),
      classId: classId || null,
      tenantId,
      startDate: new Date(),
      endDate: new Date(),
      description: fileUrl ? `Exam timetable file: ${fileUrl}` : null,
      isPublished: true,
      academicYear: new Date().getFullYear().toString()
    });

    await exam.save();

    // If there's a file URL, create an exam schedule entry for it
    if (fileUrl) {
      const ExamSchedule = require('../models/ExamSchedule');
      await ExamSchedule.create({
        title: title.trim(),
        subject: 'Timetable',
        examId: exam._id,
        classId: classId || null,
        tenantId,
        date: new Date(),
        startTime: '09:00',
        endTime: '12:00',
        duration: 180,
        isPublished: true,
        fileUrl
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: exam._id,
        title: exam.name,
        classId: exam.classId,
        isPublished: exam.isPublished,
        createdAt: exam.createdAt
      },
      message: 'Exam timetable created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/content/exams/:id
 * @desc    Update exam timetable
 * @access  Admin only
 */
router.put('/content/exams/:id', async (req, res, next) => {
  try {
    const { title, classId, isPublished } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;
    const Exam = require('../models/Exam');

    const updates = {};
    if (title !== undefined) updates.name = title;
    if (classId !== undefined) updates.classId = classId || null;
    if (isPublished !== undefined) updates.isPublished = isPublished;

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' }
      });
    }

    res.json({
      success: true,
      data: {
        id: exam._id,
        title: exam.name,
        classId: exam.classId,
        isPublished: exam.isPublished,
        updatedAt: exam.updatedAt
      },
      message: 'Exam timetable updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/content/exams/:id
 * @desc    Delete exam timetable
 * @access  Admin only
 */
router.delete('/content/exams/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user.schoolId;
    const Exam = require('../models/Exam');
    const ExamSchedule = require('../models/ExamSchedule');

    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      tenantId
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' }
      });
    }

    // Delete associated exam schedules
    await ExamSchedule.deleteMany({ examId: req.params.id });

    res.json({
      success: true,
      message: 'Exam timetable deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Reset Class Code Counter
// ============================================
router.post('/reset-class-code-counter', async (req, res, next) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    const tenantId = req.user.tenantId || req.user.schoolId;
    
    console.log('[ResetClassCodeCounter] Looking for admin with:', {
      adminId: req.user.id,
      tenantId: tenantId,
      role: 'School Admin',
      email: req.user.email
    });
    
    // Get the admin user to verify password - Admins are stored in Admin collection
    const Admin = require('../models/Admin');
    const admin = await Admin.findOne({ 
      _id: req.user.id, 
      tenantId,
      role: 'School Admin',
      isActive: true
    }).select('+password');
    
    console.log('[ResetClassCodeCounter] Admin found:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      // Try without tenantId as fallback
      const adminFallback = await Admin.findOne({ 
        _id: req.user.id, 
        role: 'School Admin',
        isActive: true
      }).select('+password');
      
      console.log('[ResetClassCodeCounter] Admin found without tenantId:', adminFallback ? 'Yes' : 'No');
      
      if (!adminFallback) {
        return res.status(404).json({ 
          success: false, 
          message: 'Admin not found',
          debug: {
            adminId: req.user.id,
            tenantId: tenantId,
            email: req.user.email
          }
        });
      }
      
      // Use the fallback admin
      const isPasswordValid = await adminFallback.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
      
      // Delete all classes for this tenant
      const deleteResult = await Class.deleteMany({ tenantId: adminFallback.tenantId });
      
      console.log('[ResetClassCodeCounter] Deleted classes:', deleteResult.deletedCount);
      
      res.json({ 
        success: true, 
        message: `Deleted ${deleteResult.deletedCount} classes. Note: Class codes (CLS-001, etc.) are globally unique, so new classes will use the next available code. To truly reset to CLS-001, all classes across all tenants must be deleted.`,
        deletedCount: deleteResult.deletedCount
      });
      return;
    }
    
    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    
    // Delete all classes for this tenant
    const deleteResult = await Class.deleteMany({ tenantId });
    
    console.log('[ResetClassCodeCounter] Deleted classes:', deleteResult.deletedCount);
    
    res.json({ 
      success: true, 
      message: `Deleted ${deleteResult.deletedCount} classes. Note: Class codes (CLS-001, etc.) are globally unique, so new classes will use the next available code. To truly reset to CLS-001, all classes across all tenants must be deleted.`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Class Password Reset
// ============================================
router.post('/classes/:id/reset-password', async (req, res, next) => {
  try {
    const { password } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;
    const classId = req.params.id;

    // Validation
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find the class and verify it belongs to this tenant
    const classData = await Class.findOne({
      _id: classId,
      tenantId
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Update the password (will be hashed by the model's pre-save hook)
    classData.password = password;
    await classData.save();

    res.json({
      success: true,
      message: 'Class password updated successfully',
      data: {
        classCode: classData.classCode
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
