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
 * Update homework for teacher's class
 * PUT /api/teacher/homework/:id
 */
const updateHomework = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { title, description, subject, dueDate, isPublished } = req.body;

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

    // Verify the homework exists and belongs to the teacher's class
    const existingHomework = await prisma.homework.findFirst({
      where: { id, classId: teacherClass.id },
    });

    if (!existingHomework) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found or you do not have permission to update it.',
        },
      });
    }

    // Build update data object with only provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Update homework
    const updatedHomework = await prisma.homework.update({
      where: { id },
      data: updateData,
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

    res.status(200).json({
      success: true,
      data: updatedHomework,
      message: 'Homework updated successfully',
    });
  } catch (error) {
    console.error('UpdateHomework Error:', error);
    next(error);
  }
};

/**
 * Delete homework for teacher's class
 * DELETE /api/teacher/homework/:id
 */
const deleteHomework = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

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

    // Verify the homework exists and belongs to the teacher's class
    const existingHomework = await prisma.homework.findFirst({
      where: { id, classId: teacherClass.id },
    });

    if (!existingHomework) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found or you do not have permission to delete it.',
        },
      });
    }

    // Delete homework
    await prisma.homework.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Homework deleted successfully',
    });
  } catch (error) {
    console.error('DeleteHomework Error:', error);
    next(error);
  }
};

/**
 * Update marks for students in teacher's class
 * PUT /api/teacher/marks/:id
 */
const updateMark = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { marksObtained, totalMarks, examType, examDate, remarks, isPublished } = req.body;

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

    // Verify the mark exists and the student belongs to the teacher's class
    const existingMark = await prisma.mark.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: { id: true, classId: true },
        },
      },
    });

    if (!existingMark) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found or you do not have permission to update it.',
        },
      });
    }

    // Verify the student belongs to the teacher's class
    if (existingMark.student.classId !== teacherClass.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'This student does not belong to your class. Cannot update marks.',
        },
      });
    }

    // Build update data
    const updateData = {};
    if (marksObtained !== undefined) updateData.marksObtained = marksObtained;
    if (totalMarks !== undefined) updateData.totalMarks = totalMarks;
    if (examType !== undefined) updateData.examType = examType;
    if (examDate !== undefined) updateData.examDate = examDate ? new Date(examDate) : null;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    // Recalculate percentage and grade if marks changed
    if (marksObtained !== undefined || totalMarks !== undefined) {
      const obtained = marksObtained !== undefined ? marksObtained : existingMark.marksObtained;
      const total = totalMarks !== undefined ? totalMarks : existingMark.totalMarks;
      const percentage = total > 0 ? (obtained / total) * 100 : 0;
      updateData.percentage = percentage;

      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else if (percentage >= 40) grade = 'D';
      updateData.grade = grade;
    }

    // Update mark
    const updatedMark = await prisma.mark.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedMark,
      message: 'Mark updated successfully',
    });
  } catch (error) {
    console.error('UpdateMark Error:', error);
    next(error);
  }
};

/**
 * Delete marks for students in teacher's class
 * DELETE /api/teacher/marks/:id
 */
const deleteMark = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

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

    // Verify the mark exists and the student belongs to the teacher's class
    const existingMark = await prisma.mark.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: { id: true, classId: true },
        },
      },
    });

    if (!existingMark) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found or you do not have permission to delete it.',
        },
      });
    }

    // Verify the student belongs to the teacher's class
    if (existingMark.student.classId !== teacherClass.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'This student does not belong to your class. Cannot delete marks.',
        },
      });
    }

    // Delete mark
    await prisma.mark.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Mark deleted successfully',
    });
  } catch (error) {
    console.error('DeleteMark Error:', error);
    next(error);
  }
};

/**
 * Update student information in teacher's class
 * PUT /api/teacher/students/:id
 */
const updateStudent = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { name, email, studentId } = req.body;

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

    // Verify the student exists and belongs to the teacher's class
    const existingStudent = await prisma.user.findFirst({
      where: { id, classId: teacherClass.id, role: 'STUDENT' },
    });

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class or you do not have permission to update them.',
        },
      });
    }

    // Check for duplicate email if email is being updated
    if (email && email !== existingStudent.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email already exists. Please use a different email.',
          },
        });
      }
    }

    // Check for duplicate studentId if studentId is being updated
    if (studentId && studentId !== existingStudent.studentId) {
      const studentIdExists = await prisma.user.findUnique({
        where: { studentId },
      });
      if (studentIdExists) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Student ID already exists. Please use a unique ID.',
          },
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (studentId !== undefined) updateData.studentId = studentId;

    // Update student (cannot change class - that's admin only)
    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
    });
  } catch (error) {
    console.error('UpdateStudent Error:', error);
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

/**
 * Create a student manually for teacher's class
 * POST /api/teacher/students/manual
 * Teachers can only create students in their assigned class
 */
const createStudentManual = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { name, email, studentId, phone, password } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student name is required' },
      });
    }

    if (!studentId || !String(studentId).trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student ID (roll number) is required' },
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student email is required' },
      });
    }

    // Find the teacher's assigned class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. You can only create students in your assigned class.' },
      });
    }

    const classId = teacherClass.id;

    // Check for existing email
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email already exists. Please use a different email.' },
      });
    }

    // Check for existing studentId
    const existingStudentId = await prisma.user.findUnique({
      where: { studentId: String(studentId).trim() },
    });

    if (existingStudentId) {
      return res.status(409).json({
        success: false,
        error: { message: 'Student ID already exists. Please use a unique ID.' },
      });
    }

    // Hash password (default: Student@123)
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password || 'Student@123', saltRounds);

    // Create the student
    const student = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        role: 'STUDENT',
        tenantId,
        studentId: String(studentId).trim(),
        phone: phone ? String(phone).trim() : null,
        classId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        studentId: true,
        phone: true,
        createdAt: true,
      },
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
 * Bulk upload students from CSV file for teacher's class
 * POST /api/teacher/students/bulk-upload
 * Automatically assigns students to the teacher's assigned class
 */
const bulkUploadStudents = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded. Please upload a CSV file.' },
      });
    }

    // Find the teacher's assigned class
    const teacherClass = await prisma.class.findFirst({
      where: { teacherId, tenantId },
      select: { id: true },
    });

    if (!teacherClass) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. You can only upload students to your assigned class.' },
      });
    }

    const classId = teacherClass.id;

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

    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const errors = [];
    const studentsToCreate = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

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
      message: `Successfully imported ${createdStudents.length} students to your class. ${errors.length} rows had errors.`,
    });
  } catch (error) {
    console.error('TeacherBulkUploadStudents Error:', error);
    next(error);
  }
};

module.exports = {
  getMyClass,
  getMyStudents,
  createHomework,
  getHomework,
  updateHomework,
  deleteHomework,
  createMarks,
  getMarks,
  updateMark,
  deleteMark,
  updateStudent,
  createStudentManual,
  bulkUploadStudents,
};
