/**
 * Teacher Controller
 * Handles all teacher-specific operations for managing their assigned class
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get teacher's assigned class and related data
 * GET /api/teacher/my-class
 */
const getMyClass = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;

    // Find the class this teacher is assigned to
    const classData = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            createdAt: true,
          },
          orderBy: { name: 'asc' },
        },
        homeworks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            assignedByUser: {
              select: { id: true, name: true },
            },
          },
        },
        examSchedules: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 10,
        },
        _count: {
          select: {
            students: true,
            homeworks: true,
            examSchedules: true,
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: classData,
    });
  } catch (error) {
    console.error('GetMyClass Error:', error);
    next(error);
  }
};

/**
 * Get students in teacher's class
 * GET /api/teacher/students
 */
const getMyStudents = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { search, page = 1, limit = 10 } = req.query;

    // First find the teacher's class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { classId: teacherClass.id, role: 'STUDENT' };

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
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
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
    console.error('GetMyStudents Error:', error);
    next(error);
  }
};

/**
 * Create homework for teacher's class
 * POST /api/teacher/homework
 */
const createHomework = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { title, description, subject, dueDate } = req.body;

    // Find the teacher's class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const homework = await prisma.homework.create({
      data: {
        title,
        description,
        subject,
        classId: teacherClass.id,
        tenantId,
        assignedBy: teacherId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: homework,
      message: 'Homework created successfully',
    });
  } catch (error) {
    console.error('CreateHomework Error:', error);
    next(error);
  }
};

/**
 * Get homework for teacher's class
 * GET /api/teacher/homework
 */
const getHomework = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 10 } = req.query;

    // Find the teacher's class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const total = await prisma.homework.count({ where: { classId: teacherClass.id } });

    const homeworks = await prisma.homework.findMany({
      where: { classId: teacherClass.id },
      skip,
      take,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            section: true,
          },
        },
        assignedByUser: {
          select: { id: true, name: true },
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
    console.error('GetHomework Error:', error);
    next(error);
  }
};

/**
 * Create marks for students in teacher's class
 * POST /api/teacher/marks
 */
const createMarks = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { marksData } = req.body; // Array of mark entries

    if (!Array.isArray(marksData) || marksData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Marks data is required',
        },
      });
    }

    // Find the teacher's class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    // Validate all students belong to this class
    const studentIds = marksData.map(m => m.studentId);
    const validStudents = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        classId: teacherClass.id,
        role: 'STUDENT',
      },
      select: { id: true },
    });

    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Some students do not belong to your class',
        },
      });
    }

    // Create marks in transaction
    const createdMarks = await prisma.$transaction(
      marksData.map(mark => {
        const percentage = (mark.marksObtained / mark.totalMarks) * 100;
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        return prisma.mark.create({
          data: {
            studentId: mark.studentId,
            subject: mark.subject,
            marksObtained: mark.marksObtained,
            totalMarks: mark.totalMarks,
            percentage,
            grade,
            examType: mark.examType,
            examDate: mark.examDate ? new Date(mark.examDate) : null,
            tenantId,
            remarks: mark.remarks,
          },
        });
      })
    );

    res.status(201).json({
      success: true,
      data: createdMarks,
      message: `${createdMarks.length} marks created successfully`,
    });
  } catch (error) {
    console.error('CreateMarks Error:', error);
    next(error);
  }
};

/**
 * Get marks for teacher's class students
 * GET /api/teacher/marks
 */
const getMarks = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { studentId, examType, page = 1, limit = 10 } = req.query;

    // Find the teacher's class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { tenantId };

    // Filter by students in this class
    where.studentId = { in: (await prisma.user.findMany({
      where: { classId: teacherClass.id, role: 'STUDENT' },
      select: { id: true },
    })).map(s => s.id) };

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
          },
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
    console.error('GetMarks Error:', error);
    next(error);
  }
};

module.exports = {
  getMyClass,
  getMyStudents,
  createHomework,
  getHomework,
  createMarks,
  getMarks,
};