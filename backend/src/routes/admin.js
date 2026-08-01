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

router.post('/classes', async (req, res, next) => {
  try {
    const { name, section, gradeLevel, classTeacherId, roomNumber, capacity } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const classData = {
      tenantId,
      name,
      section,
      gradeLevel,
      teacherId: classTeacherId,
      roomNumber,
      capacity,
      isActive: true
    };

    const newClass = new Class(classData);
    await newClass.save();

    res.status(201).json({ success: true, data: { id: newClass._id } });
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
    const deletedClass = await Class.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { isActive: false },
      { new: true }
    );

    if (!deletedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Students Management
// ============================================
router.get('/students', async (req, res, next) => {
  try {
    const { classId, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const tenantId = req.user.tenantId || req.user.schoolId;

    let query = {
      tenantId,
      role: 'STUDENT',
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
    const tenantId = req.user.tenantId || req.user.schoolId;
    const student = await User.findOne({
      _id: req.params.id,
      tenantId,
      role: 'STUDENT',
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
    const tenantId = req.user.tenantId || req.user.schoolId;

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
        tenantId,
        role: 'STUDENT'
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
    const tenantId = req.user.tenantId || req.user.schoolId;
    const deletedStudent = await User.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId,
        role: 'STUDENT'
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
// Teachers Management
// ============================================
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

    // Generate teacher ID
    const teacherCount = await Teacher.countDocuments({
      tenantId
    });
    const teacherId = `TCH-${String(teacherCount + 1).padStart(4, '0')}`;

    const teacherData = {
      tenantId,
      email: email.toLowerCase(),
      phone,
      password,
      name,
      qualification,
      experienceYears: experienceYears || (age ? parseInt(age) : undefined),
      gender,
      specialization,
      subjects,
      teacherId,
      isActive: true
    };

    const newTeacher = new Teacher(teacherData);
    await newTeacher.save();

    res.status(201).json({ success: true, data: { userId: newTeacher._id, teacherId } });
  } catch (error) {
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
    const deletedTeacher = await Teacher.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { isActive: false },
      { new: true }
    );

    if (!deletedTeacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({ success: true });
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

    const subjectData = {
      tenantId,
      name,
      code,
      description,
      isActive: true
    };

    const newSubject = new Subject(subjectData);
    await newSubject.save();

    res.status(201).json({ success: true, data: { id: newSubject._id } });
  } catch (error) {
    next(error);
  }
});

router.put('/subjects/:id', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const tenantId = req.user.tenantId || req.user.schoolId;

    const updatedSubject = await Subject.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenantId
      },
      { name, code, description },
      { new: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true });
  } catch (error) {
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

module.exports = router;