/**
 * Admin Controller
 * Handles all school admin operations
 */

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

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
 * Access Control: Only Admin users and the assigned Incharge Teacher can access
 */
const getClassDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userId = req.user.id;

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

    // Access Control: Check if user has permission to view this class dashboard
    // Admin can view all classes, Teachers can only view their assigned class
    if (userRole === 'TEACHER') {
      // Teacher must be the assigned incharge of this class to access it
      if (classData.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only view the dashboard of your assigned class.',
          },
        });
      }
    }
    // Note: ADMIN role can view all classes (no restriction needed)

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
    const tenantId = req.user.tenantId;

    // First verify the class exists and belongs to this tenant
    const existingClass = await prisma.class.findFirst({
      where: { id, tenantId },
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    // Strict whitelisting - only allow these specific fields to be updated
    const strictUpdateData = {};
    
    if (req.body.name !== undefined) {
      // Validate name
      const trimmedName = req.body.name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Class name cannot be empty',
          },
        });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Class name must be less than 100 characters',
          },
        });
      }
      strictUpdateData.name = trimmedName;
    }

    if (req.body.section !== undefined) {
      const trimmedSection = req.body.section?.trim() || '';
      if (trimmedSection.length > 10) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Section must be less than 10 characters',
          },
        });
      }
      strictUpdateData.section = trimmedSection || null;
    }

    // Handle teacherId if provided
    if (req.body.teacherId !== undefined) {
      const newTeacherId = req.body.teacherId;
      
      if (newTeacherId) {
        // Verify the new teacher exists and belongs to this tenant
        const teacher = await prisma.user.findFirst({
          where: { id: newTeacherId, tenantId, role: 'TEACHER' },
        });

        if (!teacher) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Teacher not found',
            },
          });
        }

        // Check if this teacher is already assigned to another class
        const existingTeacherAssignment = await prisma.class.findFirst({
          where: { teacherId: newTeacherId, id: { not: id } },
        });

        if (existingTeacherAssignment) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'This teacher is already assigned to another class',
            },
          });
        }

        // Remove teacher reference from old class if there was one
        if (existingClass.teacherId) {
          await prisma.class.update({
            where: { id: existingClass.teacherId === existingClass.teacherId ? id : existingClass.id },
            data: { teacherId: null },
          });
        }

        strictUpdateData.teacherId = newTeacherId;
      } else {
        // If teacherId is set to null, just remove the reference
        strictUpdateData.teacherId = null;
      }
    }

    // Execute the update using ONLY the verified data object
    const updatedClass = await prisma.class.update({
      where: { id },
      data: strictUpdateData,
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

    res.status(200).json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully',
    });
  } catch (error) {
    console.error('UpdateClass Error:', error);
    next(error);
  }
};

/**
 * Delete a class
 * DELETE /api/admin/classes/:id
 * 
 * Safety notes:
 * - Students and teacher assigned to this class will have their classId set to null (SetNull)
 * - Homework and Exam Schedules will be cascade deleted
 * - Returns info about affected records for transparency
 */
const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // First, verify the class exists and belongs to this tenant
    const existingClass = await prisma.class.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            students: true,
            homeworks: true,
            examSchedules: true,
          }
        },
        teacher: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!existingClass) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    // Gather dependency info for the response
    const dependencyInfo = {
      studentCount: existingClass._count.students,
      homeworkCount: existingClass._count.homeworks,
      examScheduleCount: existingClass._count.examSchedules,
      hasTeacher: !!existingClass.teacherId,
    };

    // Perform the deletion in a transaction for safety
    await prisma.$transaction(async (tx) => {
      // Step 1: Detach students from this class (set their classId to null)
      if (dependencyInfo.studentCount > 0) {
        await tx.user.updateMany({
          where: { classId: id, role: 'STUDENT' },
          data: { classId: null },
        });
      }

      // Step 2: Remove teacher reference from this class (if exists)
      // This is handled by SetNull cascade, but we do it explicitly for clarity
      if (dependencyInfo.hasTeacher) {
        await tx.class.update({
          where: { id },
          data: { teacherId: null },
        });
      }

      // Step 3: Delete associated homework (cascade will handle this, but being explicit)
      if (dependencyInfo.homeworkCount > 0) {
        await tx.homework.deleteMany({
          where: { classId: id },
        });
      }

      // Step 4: Delete associated exam schedules (cascade will handle this, but being explicit)
      if (dependencyInfo.examScheduleCount > 0) {
        await tx.examSchedule.deleteMany({
          where: { classId: id },
        });
      }

      // Step 5: Finally, delete the class itself
      await tx.class.delete({
        where: { id },
      });
    });

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully',
      data: {
        deletedClassId: id,
        className: existingClass.name,
        section: existingClass.section,
        dependenciesHandled: dependencyInfo,
      },
    });
  } catch (error) {
    console.error('DeleteClass Error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete class: It has related records. Please remove dependencies first.',
          code: 'FOREIGN_KEY_CONSTRAINT',
        },
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

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
 * Get available teachers for class assignment
 * GET /api/admin/teachers/available
 * Returns teachers who are either unassigned or assigned to the specified class
 */
const getAvailableTeachers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, search, page = 1, limit = 100 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause: teachers who are either unassigned OR assigned to the specific class
    const where = { tenantId, role: 'TEACHER' };

    if (classId) {
      // Include teachers who have no class OR are assigned to this specific class
      where.OR = [
        { classId: null },
        { classId: classId }
      ];
    } else {
      // If no classId provided, only show unassigned teachers
      where.classId = null;
    }

    if (search) {
      // Add search to the existing where conditions
      const searchFilter = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      };
      
      // Combine with existing conditions
      if (classId) {
        where.AND = searchFilter;
      } else {
        Object.assign(where, searchFilter);
      }
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
      orderBy: { name: 'asc' },
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
    console.error('GetAvailableTeachers Error:', error);
    next(error);
  }
};

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
    if (name !== undefined && name !== null && name.trim() !== '') {
      strictUpdateData.name = name.trim();
    }
    if (email !== undefined && email !== null && email.trim() !== '') {
      strictUpdateData.email = email.trim();
    }
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      strictUpdateData.phone = phone.trim();
    }
    // Only include classId if it's a valid non-empty string
    if (classId !== undefined && classId !== null && typeof classId === 'string' && classId.trim() !== '') {
      strictUpdateData.classId = classId.trim();
    }

    // SAFETY: Explicitly remove any invalid keys that don't exist in the User schema
    // This prevents Prisma runtime errors from unexpected fields
    // Use bracket notation for 'new' since it's a reserved keyword
    if (strictUpdateData && typeof strictUpdateData === 'object') {
      delete strictUpdateData['new'];
      delete strictUpdateData['password']; // Password updates should go through dedicated endpoint
    }

    // Now execute the update using ONLY this verified data object
    await prisma.user.update({
      where: { id: teacherId },
      data: strictUpdateData,
    });

    // Update class teacher reference if classId was explicitly provided (including null/empty to clear assignment)
    if (req.body.classId !== undefined) {
      // Remove teacher reference from old class
      await prisma.class.updateMany({
        where: { teacherId: teacherId },
        data: { teacherId: null },
      });

      // Set teacher reference on new class only if a valid classId was provided
      if (classId !== undefined && classId !== null && typeof classId === 'string' && classId.trim() !== '') {
        await prisma.class.update({
          where: { id: classId.trim() },
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

// ============================================
// Student Bulk Import (Excel)
// ============================================

/**
 * Get student import template
 * GET /api/admin/students/template
 */
const getStudentTemplate = (req, res) => {
  const template = {
    columns: ['rollNumber', 'studentName', 'classAndSection', 'parentMobile', 'bloodGroup', 'studentAddress', 'userId', 'password'],
    sampleData: [
      { rollNumber: 'STU001', studentName: 'John Doe', classAndSection: '10-A', parentMobile: '9876543210', bloodGroup: 'A+', studentAddress: '123 Main St', userId: 'john@school.com', password: 'Password@123' },
      { rollNumber: 'STU002', studentName: 'Jane Smith', classAndSection: '10-A', parentMobile: '9876543211', bloodGroup: 'B+', studentAddress: '456 Oak Ave', userId: 'jane@school.com', password: 'Password@123' },
    ]
  };
  
  res.status(200).json({
    success: true,
    data: template,
    message: 'Use these column headers for Excel import. All fields are required.'
  });
};

/**
 * Create student manually with extended fields
 * POST /api/admin/students/manual
 */
const createStudentManual = async (req, res, next) => {
  try {
    const { rollNumber, studentName, classAndSection, parentMobile, bloodGroup, studentAddress, userId, password, className } = req.body;
    const tenantId = req.user.tenantId;

    // Validation
    if (!rollNumber || !studentName || !userId || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'rollNumber, studentName, userId, and password are required' },
      });
    }

    // Check for existing rollNumber (studentId)
    const existingRollNumber = await prisma.user.findUnique({
      where: { studentId: rollNumber },
    });

    if (existingRollNumber) {
      return res.status(409).json({
        success: false,
        error: { message: `Student with roll number "${rollNumber}" already exists` },
      });
    }

    // Check for existing userId (email)
    const existingUserId = await prisma.user.findUnique({
      where: { email: userId },
    });

    if (existingUserId) {
      return res.status(409).json({
        success: false,
        error: { message: `User ID "${userId}" already exists` },
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Parse classAndSection (e.g., "10-A" -> name: "10", section: "A")
    let classId = null;
    if (classAndSection && className) {
      const [class_name, section] = classAndSection.split('-');
      const classRecord = await prisma.class.findFirst({
        where: { name: class_name.trim(), section: section?.trim() || null, tenantId },
      });
      classId = classRecord?.id || null;
    }

    // Create student in transaction
    const student = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email: userId,
          password: hashedPassword,
          name: studentName,
          role: 'STUDENT',
          tenantId,
          studentId: rollNumber,
          classId,
          phone: parentMobile || null,
          // Additional metadata stored in a profile table or JSON if schema supports
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
    });

    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  } catch (error) {
    console.error('CreateStudentManual Error:', error);
    next(error);
  }
};

/**
 * Bulk import students from Excel
 * POST /api/admin/students/bulk
 */
const bulkImportStudents = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded. Please upload an Excel file (.xlsx or .csv)' },
      });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Required columns
    const requiredColumns = ['rollNumber', 'studentName', 'classAndSection', 'parentMobile', 'bloodGroup', 'studentAddress', 'userId', 'password'];
    
    // Get headers from first row
    const headers = jsonData[0]?.map(h => String(h).trim().toLowerCase()) || [];
    
    // Validate headers
    const missingColumns = requiredColumns.filter(col => !headers.includes(col.toLowerCase()));
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          message: `Missing required columns: ${missingColumns.join(', ')}. Required columns are: ${requiredColumns.join(', ')}` 
        },
      });
    }

    // Map headers to indices
    const headerIndex = {};
    headers.forEach((header, index) => {
      headerIndex[header] = index;
    });

    // Process rows (skip header row)
    const studentsToCreate = [];
    const errors = [];
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row || row.length === 0) continue;

      const rollNumber = row[headerIndex.rollnumber];
      const studentName = row[headerIndex.studentname];
      const classAndSection = row[headerIndex.classandsection];
      const parentMobile = row[headerIndex.parentmobile];
      const bloodGroup = row[headerIndex.bloodgroup];
      const studentAddress = row[headerIndex.studentaddress];
      const userId = row[headerIndex.userid];
      const password = row[headerIndex.password];

      // Validate required fields
      if (!rollNumber || !studentName || !userId || !password) {
        errors.push({ row: i + 1, error: 'Missing required fields (rollNumber, studentName, userId, password)' });
        continue;
      }

      studentsToCreate.push({
        rollNumber: String(rollNumber).trim(),
        studentName: String(studentName).trim(),
        classAndSection: classAndSection ? String(classAndSection).trim() : null,
        parentMobile: parentMobile ? String(parentMobile).trim() : null,
        bloodGroup: bloodGroup ? String(bloodGroup).trim() : null,
        studentAddress: studentAddress ? String(studentAddress).trim() : null,
        userId: String(userId).trim(),
        password: String(password).trim(),
      });
    }

    if (studentsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No valid student records found in the file' },
      });
    }

    // Check for duplicates in database
    const existingRollNumbers = await prisma.user.findMany({
      where: {
        studentId: { in: studentsToCreate.map(s => s.rollNumber) },
      },
      select: { studentId: true },
    });

    const existingUserIds = await prisma.user.findMany({
      where: {
        email: { in: studentsToCreate.map(s => s.userId) },
      },
      select: { email: true },
    });

    // Filter out duplicates
    const duplicateRollNumbers = new Set(existingRollNumbers.map(r => r.studentId));
    const duplicateUserIds = new Set(existingUserIds.map(u => u.email));

    const validStudents = studentsToCreate.filter(s => {
      if (duplicateRollNumbers.has(s.rollNumber)) {
        errors.push({ row: s.rollNumber, error: `Duplicate roll number: ${s.rollNumber}` });
        return false;
      }
      if (duplicateUserIds.has(s.userId)) {
        errors.push({ row: s.userId, error: `Duplicate user ID: ${s.userId}` });
        return false;
      }
      return true;
    });

    if (validStudents.length === 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'All students in the file already exist', errors },
      });
    }

    // Create students in batch using transaction
    const createdStudents = await prisma.$transaction(
      validStudents.map(student => 
        prisma.user.create({
          data: {
            email: student.userId,
            password: bcrypt.hashSync(student.password, saltRounds),
            name: student.studentName,
            role: 'STUDENT',
            tenantId,
            studentId: student.rollNumber,
            phone: student.parentMobile,
            classId: null, // Can be assigned later
          },
          select: {
            id: true,
            email: true,
            name: true,
            studentId: true,
            createdAt: true,
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      data: {
        totalProcessed: studentsToCreate.length,
        successfullyCreated: createdStudents.length,
        duplicates: errors.length,
        students: createdStudents,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${createdStudents.length} students. ${errors.length} duplicates skipped.`,
    });
  } catch (error) {
    console.error('BulkImportStudents Error:', error);
    next(error);
  }
};

/**
 * Bulk upload students from CSV file
 * POST /api/admin/students/bulk-upload
 * Accepts CSV file and classId
 */
const bulkUploadStudentsCSV = async (req, res, next) => {
  try {
    const { classId } = req.body;
    const tenantId = req.user.tenantId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded. Please upload a CSV file.' },
      });
    }

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Class ID is required' },
      });
    }

    // Verify class exists and belongs to this tenant
    const classExists = await prisma.class.findFirst({
      where: { id: classId, tenantId },
    });

    if (!classExists) {
      return res.status(404).json({
        success: false,
        error: { message: 'Class not found in your school' },
      });
    }

    // Parse CSV file using xlsx
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'CSV file is empty or invalid' },
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const errors = [];
    const studentsToCreate = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row numbers start at 1, +1 for header

      // Validate required fields
      if (!row.name || !row.name.trim()) {
        errors.push({ row: rowNumber, error: 'Missing student name' });
        continue;
      }

      if (!row.studentId && !row.rollNo && !row.rollNumber) {
        errors.push({ row: rowNumber, error: 'Missing student ID/roll number' });
        continue;
      }

      const studentId = row.studentId || row.rollNo || row.rollNumber;
      const email = row.email || `${studentId}@school.local`;
      const phone = row.phone || row.parentPhone || row.contact || null;
      const password = row.password || 'Student@123';

      studentsToCreate.push({
        name: row.name.trim(),
        email: email.trim().toLowerCase(),
        studentId: String(studentId).trim(),
        phone: phone ? String(phone).trim() : null,
        password: password,
      });
    }

    // Check for existing emails and studentIds
    const emails = studentsToCreate.map(s => s.email);
    const studentIds = studentsToCreate.map(s => s.studentId);

    const existingEmails = await prisma.user.findMany({
      where: {
        email: { in: emails },
        OR: [{ tenantId }, { tenantId: null }],
      },
      select: { email: true },
    });

    const existingStudentIds = await prisma.user.findMany({
      where: {
        studentId: { in: studentIds },
        tenantId,
      },
      select: { studentId: true },
    });

    const existingEmailSet = new Set(existingEmails.map(e => e.email));
    const existingStudentIdSet = new Set(existingStudentIds.map(s => s.studentId));

    // Filter out duplicates
    const validStudents = studentsToCreate.filter(s => {
      if (existingEmailSet.has(s.email)) {
        errors.push({ row: s.name, error: `Email already exists: ${s.email}` });
        return false;
      }
      if (existingStudentIdSet.has(s.studentId)) {
        errors.push({ row: s.name, error: `Student ID already exists: ${s.studentId}` });
        return false;
      }
      return true;
    });

    // Check for duplicates within the file
    const fileEmails = new Set();
    const fileStudentIds = new Set();
    const finalStudents = validStudents.filter(s => {
      if (fileEmails.has(s.email)) {
        errors.push({ row: s.name, error: `Duplicate email in file: ${s.email}` });
        return false;
      }
      if (fileStudentIds.has(s.studentId)) {
        errors.push({ row: s.name, error: `Duplicate student ID in file: ${s.studentId}` });
        return false;
      }
      fileEmails.add(s.email);
      fileStudentIds.add(s.studentId);
      return true;
    });

    if (finalStudents.length === 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'All students already exist or have errors', errors },
      });
    }

    // Create students in batch
    const createdStudents = await prisma.$transaction(
      finalStudents.map(student =>
        prisma.user.create({
          data: {
            email: student.email,
            password: bcrypt.hashSync(student.password, saltRounds),
            name: student.name,
            role: 'STUDENT',
            tenantId,
            studentId: student.studentId,
            phone: student.phone,
            classId,
          },
          select: {
            id: true,
            email: true,
            name: true,
            studentId: true,
            createdAt: true,
          },
        })
      )
    );

    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      data: {
        totalProcessed: data.length,
        successfullyCreated: createdStudents.length,
        duplicates: errors.length,
        students: createdStudents,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${createdStudents.length} students to class. ${errors.length} rows had errors.`,
    });
  } catch (error) {
    console.error('BulkUploadStudentsCSV Error:', error);
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
  createStudentManual,
  bulkImportStudents,
  bulkUploadStudentsCSV,
  getStudentTemplate,
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
  getAvailableTeachers,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
