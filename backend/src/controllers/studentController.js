/**
 * Student Controller
 * Handles all student-specific operations
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get student dashboard statistics
 * GET /api/student/dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const classId = req.user.classId;

    // Get counts for various items
    const [
      totalHomework,
      totalMarks,
      totalNews,
      totalCirculars,
      upcomingExams,
    ] = await Promise.all([
      classId 
        ? prisma.homework.count({ where: { classId, isPublished: true } })
        : 0,
      prisma.mark.count({ where: { studentId, isPublished: true } }),
      prisma.news.count({ where: { tenantId, isPublished: true } }),
      prisma.circular.count({ where: { tenantId, isPublished: true } }),
      classId
        ? prisma.examSchedule.count({ 
            where: { 
              classId, 
              isPublished: true,
              date: { gte: new Date() }
            } 
          })
        : 0,
    ]);

    // Get recent homework
    const recentHomework = classId
      ? await prisma.homework.findMany({
          where: { classId, isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            class: {
              select: { name: true, section: true }
            }
          }
        })
      : [];

    // Get recent news
    const recentNews = await prisma.news.findMany({
      where: { tenantId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Get upcoming exams
    const upcomingExamList = classId
      ? await prisma.examSchedule.findMany({
          where: { 
            classId, 
            isPublished: true,
            date: { gte: new Date() }
          },
          orderBy: { date: 'asc' },
          take: 3,
          include: {
            class: {
              select: { name: true, section: true }
            }
          }
        })
      : [];

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalHomework,
          totalMarks,
          totalNews,
          totalCirculars,
          upcomingExams,
        },
        recentHomework,
        recentNews,
        upcomingExams: upcomingExamList,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all homework for student's class
 * GET /api/student/homework
 */
const getHomework = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const { subject, page = 1, limit = 10 } = req.query;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Student not assigned to any class',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { classId, isPublished: true };

    if (subject) {
      where.subject = subject;
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
 * Get single homework details
 * GET /api/student/homework/:id
 */
const getHomeworkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classId = req.user.classId;

    const homework = await prisma.homework.findFirst({
      where: { id, classId, isPublished: true },
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
 * Get all marks for the student
 * GET /api/student/marks
 */
const getMarks = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { subject, examType, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { studentId, isPublished: true };

    if (subject) {
      where.subject = subject;
    }

    if (examType) {
      where.examType = examType;
    }

    const total = await prisma.mark.count({ where });

    const marks = await prisma.mark.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    // Calculate overall statistics
    const totalMarksObtained = marks.reduce((sum, m) => sum + m.marksObtained, 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + m.totalMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        marks,
        statistics: {
          totalSubjects: marks.length,
          totalMarksObtained,
          totalMaxMarks,
          overallPercentage: Math.round(overallPercentage * 100) / 100,
        },
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
 * Get single mark details
 * GET /api/student/marks/:id
 */
const getMarkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const mark = await prisma.mark.findFirst({
      where: { id, studentId, isPublished: true },
    });

    if (!mark) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: mark,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all news from student's school
 * GET /api/student/news
 */
const getNews = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { category, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId, isPublished: true };

    if (category) {
      where.category = category;
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
 * Get single news details
 * GET /api/student/news/:id
 */
const getNewsById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const news = await prisma.news.findFirst({
      where: { id, tenantId, isPublished: true },
      include: {
        postedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'News not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all circulars from student's school
 * GET /api/student/circulars
 */
const getCirculars = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId, isPublished: true };

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
 * Get single circular details
 * GET /api/student/circulars/:id
 */
const getCircularById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const circular = await prisma.circular.findFirst({
      where: { id, tenantId, isPublished: true },
      include: {
        issuedByUser: {
          select: {
            id: true,
            name: true,
          }
        },
      },
    });

    if (!circular) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Circular not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: circular,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all exam schedules for student's class
 * GET /api/student/exam-schedules
 */
const getExamSchedules = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const { page = 1, limit = 10 } = req.query;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Student not assigned to any class',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { classId, isPublished: true };

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
 * Get single exam schedule details
 * GET /api/student/exam-schedules/:id
 */
const getExamScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classId = req.user.classId;

    const examSchedule = await prisma.examSchedule.findFirst({
      where: { id, classId, isPublished: true },
      include: {
        class: true,
      },
    });

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam schedule not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: examSchedule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student profile with class info
 * GET /api/student/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
          }
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

    // Remove sensitive data
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
 * Get extended dashboard with attendance and fee data
 * GET /api/student/dashboard-extended
 */
const getDashboardExtended = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const classId = req.user.classId;

    // Get basic dashboard stats
    const [
      totalHomework,
      totalMarks,
      totalNews,
      totalCirculars,
      upcomingExams,
    ] = await Promise.all([
      classId 
        ? prisma.homework.count({ where: { classId, isPublished: true } })
        : 0,
      prisma.mark.count({ where: { studentId, isPublished: true } }),
      prisma.news.count({ where: { tenantId, isPublished: true } }),
      prisma.circular.count({ where: { tenantId, isPublished: true } }),
      classId
        ? prisma.examSchedule.count({ 
            where: { 
              classId, 
              isPublished: true,
              date: { gte: new Date() }
            } 
          })
        : 0,
    ]);

    // Get attendance stats
    const attendance = await prisma.attendance.findMany({
      where: { studentId, tenantId },
      select: { status: true },
    });

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    // Get fee data
    const fee = await prisma.fee.findFirst({
      where: { studentId, tenantId },
      select: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        dueDate: true,
      },
    });

    // Get recent homework
    const recentHomework = classId
      ? await prisma.homework.findMany({
          where: { classId, isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })
      : [];

    // Get recent news
    const recentNews = await prisma.news.findMany({
      where: { tenantId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Get upcoming exams
    const upcomingExamList = classId
      ? await prisma.examSchedule.findMany({
          where: { classId, isPublished: true, date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 3,
        })
      : [];

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalHomework,
          totalMarks,
          totalNews,
          totalCirculars,
          upcomingExams,
        },
        attendance: {
          totalDays,
          presentDays,
          percentage: Math.round(attendancePercentage * 100) / 100,
        },
        fee: fee || null,
        recentHomework,
        recentNews,
        upcomingExams: upcomingExamList,
      },
    });
  } catch (error) {
    console.error('GetDashboardExtended Error:', error);
    next(error);
  }
};

/**
 * Update student profile
 * PUT /api/student/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { name, phone } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        studentId: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedStudent,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('UpdateProfile Error:', error);
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getDashboardExtended,
  getHomework,
  getHomeworkById,
  getMarks,
  getMarkById,
  getNews,
  getNewsById,
  getCirculars,
  getCircularById,
  getExamSchedules,
  getExamScheduleById,
  getProfile,
  updateProfile,
};
