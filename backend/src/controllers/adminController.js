/**
 * Admin Controller
 * Handles all school admin operations
 */

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get all classes for admin's school
 * GET /api/admin/classes
 */
const getAllClasses = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const classes = await prisma.class.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            students: true,
            homeworks: true,
            examSchedules: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get class dashboard data
 * GET /api/admin/classes/:id/dashboard
 */
const getClassDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Get class details with teacher info
    const classData = await prisma.class.findFirst({
      where: { id, tenantId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    // Get student count for this class
    const studentCount = await prisma.user.count({
      where: { classId: id, role: 'STUDENT' },
    });

    // Get recent homework for this class
    const recentHomework = await prisma.homework.findMany({
      where: { classId: id, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        assignedByUser: {
          select: { id: true, name: true },
        },
      },
    });

    // Get upcoming exam schedules for this class
    const upcomingExams = await prisma.examSchedule.findMany({
      where: { 
        classId: id, 
        isPublished: true,
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' },
      take: 5,
    });

    // Get recent news/announcements from the tenant
    const recentAnnouncements = await prisma.news.findMany({
      where: { tenantId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        postedByUser: {
          select: { id: true, name: true },
        },
      },
    });

    // Calculate attendance rate (mock data for now - can be enhanced with actual attendance tracking)
    const attendanceRate = Math.floor(Math.random() * 20) + 80; // Mock: 80-100%

    res.status(200).json({
      success: true,
      data: {
        class: classData,
        metrics: {
          totalStudents: studentCount,
          attendanceRate,
        },
        recentHomework,
        upcomingExams,
        recentAnnouncements,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single class with students
 * GET /api/admin/classes/:id
 */
const getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const classData = await prisma.class.findFirst({
      where: { id, tenantId },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            createdAt: true,
          }
        },
        homeworks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        examSchedules: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: classData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new class
 * POST /api/admin/classes
 */
const createClass = async (req, res, next) => {
  try {
    const { name, section, teacherId } = req.body;
    const tenantId = req.user.tenantId;

    // If teacherId is provided, verify the teacher exists and belongs to this tenant
    if (teacherId) {
      const teacher = await prisma.user.findFirst({
        where: { id: teacherId, tenantId, role: 'TEACHER' },
      });

      if (!teacher) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Teacher not found',
          },
        });
      }
    }

    // Create class with optional teacher reference
    const classData = await prisma.class.create({
      data: {
        name,
        section,
        tenantId,
        teacherId: teacherId || null,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: classData,
      message: 'Class created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a class
 * PUT /api/admin/classes/:id
 */
const updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, section } = req.body;
    const tenantId = req.user.tenantId;

    const classData = await prisma.class.updateMany({
      where: { id, tenantId },
      data: { name, section },
    });

    if (classData.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Class updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a class
 * DELETE /api/admin/classes/:id
 */
const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const classData = await prisma.class.deleteMany({
      where: { id, tenantId },
    });

    if (classData.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Student Management
// ============================================

/**
 * Get all students for admin's school
 * GET /api/admin/students
 */
const getAllStudents = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, search, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId, role: 'STUDENT' };

    if (classId) {
      where.classId = classId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.user.count({ where });

    const students = await prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single student details
 * GET /api/admin/students/:id
 */
const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const student = await prisma.user.findFirst({
      where: { id, tenantId, role: 'STUDENT' },
      include: {
        class: true,
        marks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    // Remove password
    const { password, ...studentWithoutPassword } = student;

    res.status(200).json({
      success: true,
      data: studentWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new student
 * POST /api/admin/students
 */
const createStudent = async (req, res, next) => {
  try {
    const { name, email, password, studentId, classId } = req.body;
    const tenantId = req.user.tenantId;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Student with this email already exists',
        },
      });
    }

    // Check if studentId already exists
    const existingStudentId = await prisma.user.findUnique({
      where: { studentId },
    });

    if (existingStudentId) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Student ID already exists. Please use a unique ID.',
        },
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const student = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
        tenantId,
        studentId,
        classId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        classId: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a student
 * PUT /api/admin/students/:id
 */
const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, classId } = req.body;
    const tenantId = req.user.tenantId;

    const student = await prisma.user.updateMany({
      where: { id, tenantId, role: 'STUDENT' },
      data: { name, email, classId },
    });

    if (student.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a student
 * DELETE /api/admin/students/:id
 */
const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const student = await prisma.user.deleteMany({
      where: { id, tenantId, role: 'STUDENT' },
    });

    if (student.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Homework Management
// ============================================

/**
 * Get all homework for admin's school
 * GET /api/admin/homework
 */
const getAllHomework = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };

    if (classId) {
      where.classId = classId;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const total = await prisma.homework.count({ where });

    const homeworks = await prisma.homework.findMany({
      where,
      skip,
      take,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          }
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        homeworks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single homework
 * GET /api/admin/homework/:id
 */
const getHomeworkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const homework = await prisma.homework.findFirst({
      where: { id, tenantId },
      include: {
        class: true,
        assignedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    if (!homework) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: homework,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new homework
 * POST /api/admin/homework
 */
const createHomework = async (req, res, next) => {
  try {
    const { title, description, subject, classId, dueDate } = req.body;
    const tenantId = req.user.tenantId;
    const assignedBy = req.user.id;

    const homework = await prisma.homework.create({
      data: {
        title,
        description,
        subject,
        classId,
        tenantId,
        assignedBy,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        class: true,
      },
    });

    res.status(201).json({
      success: true,
      data: homework,
      message: 'Homework created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update homework
 * PUT /api/admin/homework/:id
 */
const updateHomework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, subject, classId, dueDate, isPublished } = req.body;
    const tenantId = req.user.tenantId;

    const homework = await prisma.homework.updateMany({
      where: { id, tenantId },
      data: {
        title,
        description,
        subject,
        classId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isPublished,
      },
    });

    if (homework.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Homework updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete homework
 * DELETE /api/admin/homework/:id
 */
const deleteHomework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const homework = await prisma.homework.deleteMany({
      where: { id, tenantId },
    });

    if (homework.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Homework deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Marks Management
// ============================================

/**
 * Get all marks for admin's school
 * GET /api/admin/marks
 */
const getAllMarks = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { studentId, examType, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };

    if (studentId) {
      where.studentId = studentId;
    }

    if (examType) {
      where.examType = examType;
    }

    const total = await prisma.mark.count({ where });

    const marks = await prisma.mark.findMany({
      where,
      skip,
      take,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
            class: {
              select: {
                name: true,
                section: true,
              }
            },
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        marks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new marks entry
 * POST /api/admin/marks
 */
const createMark = async (req, res, next) => {
  try {
    const { studentId, subject, marksObtained, totalMarks, examType, examDate, remarks } = req.body;
    const tenantId = req.user.tenantId;

    // Calculate percentage
    const percentage = (marksObtained / totalMarks) * 100;

    // Determine grade
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    const mark = await prisma.mark.create({
      data: {
        studentId,
        subject,
        marksObtained,
        totalMarks,
        percentage,
        grade,
        examType,
        examDate: examDate ? new Date(examDate) : null,
        tenantId,
        remarks,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
          }
        },
      },
    });

    res.status(201).json({
      success: true,
      data: mark,
      message: 'Marks added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update marks
 * PUT /api/admin/marks/:id
 */
const updateMark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { marksObtained, totalMarks, grade, remarks, isPublished } = req.body;
    const tenantId = req.user.tenantId;

    const updateData = {};

    if (marksObtained !== undefined && totalMarks !== undefined) {
      updateData.marksObtained = marksObtained;
      updateData.totalMarks = totalMarks;
      updateData.percentage = (marksObtained / totalMarks) * 100;

      // Auto-calculate grade
      const percentage = updateData.percentage;
      if (percentage >= 90) updateData.grade = 'A+';
      else if (percentage >= 80) updateData.grade = 'A';
      else if (percentage >= 70) updateData.grade = 'B+';
      else if (percentage >= 60) updateData.grade = 'B';
      else if (percentage >= 50) updateData.grade = 'C';
      else if (percentage >= 40) updateData.grade = 'D';
      else updateData.grade = 'F';
    } else if (marksObtained !== undefined) {
      updateData.marksObtained = marksObtained;
    }

    if (grade) updateData.grade = grade;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const mark = await prisma.mark.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (mark.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Marks updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete marks
 * DELETE /api/admin/marks/:id
 */
const deleteMark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const mark = await prisma.mark.deleteMany({
      where: { id, tenantId },
    });

    if (mark.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Marks deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// News Management
// ============================================

/**
 * Get all news for admin's school
 * GET /api/admin/news
 */
const getAllNews = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { category, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };

    if (category) {
      where.category = category;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const total = await prisma.news.count({ where });

    const news = await prisma.news.findMany({
      where,
      skip,
      take,
      include: {
        postedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        news,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new news
 * POST /api/admin/news
 */
const createNews = async (req, res, next) => {
  try {
    const { title, content, summary, category, imageUrl } = req.body;
    const tenantId = req.user.tenantId;
    const postedBy = req.user.id;

    const news = await prisma.news.create({
      data: {
        title,
        content,
        summary,
        category,
        imageUrl,
        tenantId,
        postedBy,
      },
      include: {
        postedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    res.status(201).json({
      success: true,
      data: news,
      message: 'News created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update news
 * PUT /api/admin/news/:id
 */
const updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, isPublished } = req.body;
    const tenantId = req.user.tenantId;

    const news = await prisma.news.updateMany({
      where: { id, tenantId },
      data: { title, content, isPublished },
    });

    if (news.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'News not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'News updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete news
 * DELETE /api/admin/news/:id
 */
const deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const news = await prisma.news.deleteMany({
      where: { id, tenantId },
    });

    if (news.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'News not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'News deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Circular Management
// ============================================

/**
 * Get all circulars for admin's school
 * GET /api/admin/circulars
 */
const getAllCirculars = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const total = await prisma.circular.count({ where });

    const circulars = await prisma.circular.findMany({
      where,
      skip,
      take,
      include: {
        issuedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        circulars,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new circular
 * POST /api/admin/circulars
 */
const createCircular = async (req, res, next) => {
  try {
    const { title, content, circularNo } = req.body;
    const tenantId = req.user.tenantId;
    const issuedBy = req.user.id;

    const circular = await prisma.circular.create({
      data: {
        title,
        content,
        circularNo,
        tenantId,
        issuedBy,
      },
      include: {
        issuedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    res.status(201).json({
      success: true,
      data: circular,
      message: 'Circular created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete circular
 * DELETE /api/admin/circulars/:id
 */
const deleteCircular = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const circular = await prisma.circular.deleteMany({
      where: { id, tenantId },
    });

    if (circular.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Circular not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Circular deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Exam Schedule Management
// ============================================

/**
 * Get all exam schedules for admin's school
 * GET /api/admin/exam-schedules
 */
const getAllExamSchedules = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };

    if (classId) {
      where.classId = classId;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished === 'true';
    }

    const total = await prisma.examSchedule.count({ where });

    const examSchedules = await prisma.examSchedule.findMany({
      where,
      skip,
      take,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          }
        },
      },
      orderBy: { date: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: {
        examSchedules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new exam schedule
 * POST /api/admin/exam-schedules
 */
const createExamSchedule = async (req, res, next) => {
  try {
    const { title, subject, date, time, classId, duration, roomNo } = req.body;
    const tenantId = req.user.tenantId;

    const examSchedule = await prisma.examSchedule.create({
      data: {
        title,
        subject,
        date: new Date(date),
        time,
        classId,
        tenantId,
        duration,
        roomNo,
      },
      include: {
        class: true,
      },
    });

    res.status(201).json({
      success: true,
      data: examSchedule,
      message: 'Exam schedule created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete exam schedule
 * DELETE /api/admin/exam-schedules/:id
 */
const deleteExamSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const examSchedule = await prisma.examSchedule.deleteMany({
      where: { id, tenantId },
    });

    if (examSchedule.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam schedule not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam schedule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Teacher Management
// ============================================

/**
 * Get all teachers for admin's school
 * GET /api/admin/teachers
 */
const getAllTeachers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, search, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId, role: 'TEACHER' };

    if (classId) {
      where.classId = classId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const total = await prisma.user.count({ where });

    const teachers = await prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        teachers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('GetAllTeachers Error:', error);
    next(error);
  }
};

/**
 * Get single teacher details
 * GET /api/admin/teachers/:id
 */
const getTeacherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const teacher = await prisma.user.findFirst({
      where: { id, tenantId, role: 'TEACHER' },
      include: {
        class: {
          include: {
            students: {
              select: {
                id: true,
                name: true,
                studentId: true,
              }
            },
          }
        },
        homeworks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        marks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Teacher not found',
        },
      });
    }

    // Remove password
    const { password, ...teacherWithoutPassword } = teacher;

    res.status(200).json({
      success: true,
      data: teacherWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new teacher
 * POST /api/admin/teachers
 */
const createTeacher = async (req, res, next) => {
  try {
    const { name, email, password, phone, classId } = req.body;
    const tenantId = req.user.tenantId;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'A user with this email already exists',
        },
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const teacher = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'TEACHER',
        tenantId,
        phone,
        classId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        classId: true,
        createdAt: true,
      },
    });

    // If assigned to a class, update class teacher reference
    if (classId) {
      await prisma.class.update({
        where: { id: classId },
        data: { teacherId: teacher.id },
      });
    }

    res.status(201).json({
      success: true,
      data: teacher,
      message: 'Teacher created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a teacher
 * PUT /api/admin/teachers/:id
 */
const updateTeacher = async (req, res, next) => {
  try {
    const teacherId = req.params.id;
    const { name, email, phone, classId } = req.body;
    const tenantId = req.user.tenantId;

    // First verify the teacher exists and belongs to this tenant
    const existingTeacher = await prisma.user.findFirst({
      where: { id: teacherId, tenantId, role: 'TEACHER' },
    });

    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Teacher not found',
        },
      });
    }

    // Hardcode ONLY the allowed fields into a completely clean dictionary object
    const strictUpdateData = {};
    if (name !== undefined) strictUpdateData.name = name;
    if (email !== undefined) strictUpdateData.email = email;
    if (phone !== undefined) strictUpdateData.phone = phone;
    if (classId !== undefined) strictUpdateData.classId = classId;

    // Now execute the update using ONLY this verified data object
    await prisma.user.update({
      where: { id: teacherId },
      data: strictUpdateData,
    });

    // Update class teacher reference if classId was provided
    if (classId !== undefined) {
      // Remove teacher reference from old class
      await prisma.class.updateMany({
        where: { teacherId: teacherId },
        data: { teacherId: null },
      });

      // Set teacher reference on new class
      if (classId) {
        await prisma.class.update({
          where: { id: classId },
          data: { teacherId: teacherId },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a teacher
 * DELETE /api/admin/teachers/:id
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const teacher = await prisma.user.deleteMany({
      where: { id, tenantId, role: 'TEACHER' },
    });

    if (teacher.count === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Teacher not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Class
  getAllClasses,
  getClassDashboard,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  // Student
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  // Homework
  getAllHomework,
  getHomeworkById,
  createHomework,
  updateHomework,
  deleteHomework,
  // Marks
  getAllMarks,
  createMark,
  updateMark,
  deleteMark,
  // News
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  // Circular
  getAllCirculars,
  createCircular,
  deleteCircular,
  // Exam Schedule
  getAllExamSchedules,
  createExamSchedule,
  deleteExamSchedule,
  // Teacher
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
