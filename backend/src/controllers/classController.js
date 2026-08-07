/**
 * Class Controller
 * Handles all class-based login user operations (Class ID login - CLS-X)
 * Full management of their specific class only
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Class = require('../models/Class');
const Homework = require('../models/Homework');
const Exam = require('../models/Exam');
const db = require('../config/db');

/**
 * Get Class Controller Dashboard Data
 * GET /api/class-controller/dashboard
 * Returns stats and overview for the logged-in class
 */
const getClassDashboard = async (req, res, next) => {
  try {
    // Extract class info from JWT token (set by protect middleware)
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    if (!classId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class session. Please login again.',
        },
      });
    }

    // Get class details (CORE TABLE uses CamelCase with double quotes)
    const classQuery = `
      SELECT 
        c.id, c.class_code as "classCode", c.name, c.section,
        t.name as "teacherName", t.email as "teacherEmail"
      FROM "Class" c
      LEFT JOIN "TeacherDirectory" t ON c.id = t."assignedClassId"
      WHERE c.id = $1 AND c."tenantId" = $2
      LIMIT 1
    `;
    const classResult = await db.query(classQuery, [classId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    const classData = classResult.rows[0];

    // Get student count (CORE TABLE uses CamelCase with double quotes)
    const studentCountQuery = `
      SELECT COUNT(*) as count FROM "User" 
      WHERE "classId" = $1 AND role = 'STUDENT'
    `;
    const studentCountResult = await db.query(studentCountQuery, [classId]);
    const totalStudents = parseInt(studentCountResult.rows[0].count);

    // Get homework count (Homework table uses snake_case: class_id, is_published)
    const homeworkCountQuery = `
      SELECT COUNT(*) as count FROM "Homework" 
      WHERE "class_id" = $1 AND "is_published" = true
    `;
    const homeworkCountResult = await db.query(homeworkCountQuery, [classId]);
    const totalHomework = parseInt(homeworkCountResult.rows[0].count);

    // Get upcoming exams count (Exam table uses snake_case: class_id, created_at)
    // Note: Exam table does NOT have is_published column, so we don't filter by it
    const examsCountQuery = `
      SELECT COUNT(*) as count FROM "Exam" 
      WHERE "class_id" = $1 AND "created_at" >= NOW()
    `;
    const examsCountResult = await db.query(examsCountQuery, [classId]);
    const upcomingExams = parseInt(examsCountResult.rows[0].count);

    // Calculate attendance rate (mock for now - will be real when attendance is implemented)
    const attendanceRate = Math.floor(Math.random() * 20) + 80;

    // Get recent activity (combine recent homework, exams, etc.)
    // Homework and Exam tables use snake_case
    // Note: Exam table does NOT have is_published column
    const recentActivityQuery = `
      (SELECT h.id, 'homework' as type, h.title, h.subject as description, h."created_at" 
       FROM "Homework" h WHERE h."class_id" = $1 ORDER BY h."created_at" DESC LIMIT 3)
      UNION ALL
      (SELECT e.id, 'exam' as type, e."exam_name" as title, '' as description, e."created_at" 
       FROM "Exam" e WHERE e."class_id" = $1 ORDER BY e."created_at" DESC LIMIT 2)
      ORDER BY "created_at" DESC LIMIT 5
    `;
    const activityResult = await db.query(recentActivityQuery, [classId]);

    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData.id,
          classCode: classData.classCode,
          name: classData.name,
          section: classData.section,
          teacher: classData.teacherName ? {
            name: classData.teacherName,
            email: classData.teacherEmail,
          } : null,
        },
        stats: {
          totalStudents,
          totalHomework,
          upcomingExams,
          attendanceRate,
        },
        recentActivity: activityResult.rows.map(row => ({
          id: row.id,
          type: row.type,
          title: row.title,
          description: row.description,
          created_at: row.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("CRITICAL DB ERROR IN getClassDashboard (classController):", error.message);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    next(error);
  }
};

/**
 * Get all students for the logged-in class
 * GET /api/class-controller/students
 */
const getClassStudents = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const { page = 1, limit = 50, search = '' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build MongoDB query
    let query = {
      classId: classId,
      role: 'Student'
    };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Get students
    const students = await User.find(query)
      .select('name email studentId createdAt')
      .sort({ name: 1 })
      .skip(skip)
      .limit(take);

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
 * Get next available student ID (auto-generated sequentially)
 * GET /api/class-controller/students/next-id
 */
const getNextStudentId = async (req, res, next) => {
  try {
    // Get total count of students in the database
    const totalCount = await User.countDocuments({ role: 'Student' });
    
    // Generate next sequential ID (STU-0001, STU-0002, etc.)
    const nextNumber = totalCount + 1;
    const nextStudentId = `STU-${String(nextNumber).padStart(4, '0')}`;

    res.status(200).json({
      success: true,
      data: {
        nextStudentId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new student to the class (with auto-generated ID)
 * POST /api/class-controller/students
 * Note: Email is no longer required. A dummy email is auto-generated for DB constraints.
 */
const addClassStudent = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;
    const { name, password } = req.body;

    // Validate required fields - only name is required now
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Student name is required',
        },
      });
    }

    // Auto-generate student ID sequentially
    const totalCount = await User.countDocuments({ role: 'Student' });
    const nextNumber = totalCount + 1;
    const finalStudentId = `STU-${String(nextNumber).padStart(4, '0')}`;

    // Generate dummy email to satisfy DB NOT NULL constraint
    // Format: stu-{studentId}-{timestamp}@school.internal
    const dummyEmail = `stu-${finalStudentId}-${Date.now().toString().slice(-6)}@school.internal`;

    // Use provided password or default temporary password
    const finalPassword = password || 'Student@123';

    // Create student using MongoDB
    const student = new User({
      email: dummyEmail,
      password: finalPassword,
      name: name.trim(),
      role: 'Student',
      schoolId: tenantId,
      studentId: finalStudentId,
      classId: classId,
    });

    await student.save();

    res.status(201).json({
      success: true,
      data: {
        id: student._id.toString(),
        name: student.name,
        studentId: student.studentId,
        created_at: student.createdAt,
        password: finalPassword, // Return the password used (either provided or default)
      },
      message: 'Student created successfully. Please save the student ID and password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a student in the class
 * PUT /api/class-controller/students/:id
 */
const updateStudent = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const { id } = req.params;
    const { name, email, studentId } = req.body;

    // Verify student exists and belongs to this class
    const student = await User.findOne({
      _id: id,
      classId: classId,
      role: 'Student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class',
        },
      });
    }

    // Update fields
    if (name !== undefined) {
      student.name = name.trim();
    }

    if (email !== undefined) {
      // Check email uniqueness
      const existingEmail = await User.findOne({ email: email.trim(), _id: { $ne: id } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already exists' },
        });
      }
      student.email = email.trim();
    }

    if (studentId !== undefined) {
      // Check studentId uniqueness
      const existingStudentId = await User.findOne({ studentId: studentId, _id: { $ne: id } });
      if (existingStudentId) {
        return res.status(409).json({
          success: false,
          error: { message: 'Student ID already exists' },
        });
      }
      student.studentId = studentId;
    }

    await student.save();

    res.status(200).json({
      success: true,
      data: student,
      message: 'Student updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset student password (with custom or default password)
 * PUT /api/class-controller/students/:id/reset-password
 * Body: password (optional) - if not provided, defaults to 'Student@123'
 */
const resetStudentPassword = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const { id } = req.params;
    const { password } = req.body;

    // Verify student exists and belongs to this class
    const student = await User.findOne({
      _id: id,
      classId: classId,
      role: 'Student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class',
        },
      });
    }

    // Use provided password or default temporary password
    const newPassword = password || 'Student@123';

    // Validate password strength if custom password is provided
    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long',
        },
      });
    }

    // Update password (Mongoose pre-save hook will hash it)
    student.password = newPassword;
    await student.save();

    res.status(200).json({
      success: true,
      data: {
        password: newPassword,
      },
      message: `Password reset successfully. New password: ${newPassword}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a student from the class
 * DELETE /api/class-controller/students/:id
 */
const deleteStudent = async (req, res, next) => {
  try {
    const classId = req.user.classId;
    const { id } = req.params;

    // Verify student exists and belongs to this class
    const student = await User.findOne({
      _id: id,
      classId: classId,
      role: 'Student'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class',
        },
      });
    }

    // Delete student
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// New Exam Table (PDF/Image based timetables)
// Global publishing support: class_id IS NULL
// ============================================

/**
 * Get all exams for the class (New Exam table with PDF/Image support)
 * GET /api/class-controller/exams
 * Simplified: Fetches all published exams
 */
const getExams = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    if (!classId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class session. Please login again.',
        },
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count - fetch published exams for this class (including school-wide)
    const countQuery = `
      SELECT COUNT(*) as total FROM "Exam"
      WHERE "is_published" = true AND "tenant_id" = $1 AND ("class_id" = $2 OR "class_id" IS NULL)
    `;
    const countResult = await db.query(countQuery, [tenantId, classId]);
    const total = parseInt(countResult.rows[0].total);

    // Get exams - fetch published exams for this class (including school-wide), ordered by creation date
    const examsQuery = `
      SELECT 
        e.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE e."is_published" = true AND e."tenant_id" = $1 AND (e."class_id" = $2 OR e."class_id" IS NULL)
      ORDER BY e."created_at" DESC
      LIMIT $3 OFFSET $4
    `;

    const examsResult = await db.query(examsQuery, [tenantId, classId, take, skip]);

    const exams = examsResult.rows.map(item => ({
      id: item.id,
      title: item.title || item.exam_name || 'Exam',
      examName: item.title || item.exam_name || 'Exam',
      classId: item.class_id,
      tenantId: item.tenant_id,
      fileUrl: item.file_url || item.pdf_url || item.image_url,
      pdfUrl: item.pdf_url || item.file_url,
      imageUrl: item.image_url || item.file_url,
      dueDate: item.due_date,
      isPublished: item.is_published,
      created_at: item.created_at,
      updated_at: item.updated_at,
      class: item.classId ? {
        id: item.classId,
        name: item.className,
        section: item.classSection,
      } : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        exams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error in getExams (classController):', error);
    next(error);
  }
};

/**
 * Get single exam details (New Exam table with PDF/Image support)
 * GET /api/class-controller/exams/:id
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    if (!classId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class session. Please login again.',
        },
      });
    }

    // Get exam - include global exams (class_id IS NULL)
    const examQuery = `
      SELECT 
        e.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE e.id = $1 AND e."tenant_id" = $2 AND (e."class_id" = $3 OR e."class_id" IS NULL) AND e."is_published" = true
    `;

    const examResult = await db.query(examQuery, [id, tenantId, classId]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found',
        },
      });
    }

    const item = examResult.rows[0];

    const exam = {
      id: item.id,
      title: item.title || item.exam_name || 'Exam',
      examName: item.title || item.exam_name || 'Exam',
      classId: item.class_id,
      tenantId: item.tenant_id,
      fileUrl: item.file_url || item.pdf_url || item.image_url,
      pdfUrl: item.pdf_url || item.file_url,
      imageUrl: item.image_url || item.file_url,
      dueDate: item.due_date,
      isPublished: item.is_published,
      created_at: item.created_at,
      updated_at: item.updated_at,
      class: item.classId ? {
        id: item.classId,
        name: item.className,
        section: item.classSection,
      } : null,
    };

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error('Error in getExamById (classController):', error);
    next(error);
  }
};

module.exports = {
  getClassDashboard,
  getClassStudents,
  getNextStudentId,
  addClassStudent,
  updateStudent,
  resetStudentPassword,
  deleteStudent,
  // New Exam table endpoints (PDF/Image based timetables)
  getExams,
  getExamById,
};
