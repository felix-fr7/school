/**
 * Class Controller
 * Handles all class-based login user operations (Class ID login - CLS-X)
 * Full management of their specific class only
 */

const bcrypt = require('bcrypt');
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
          createdAt: row.createdAt,
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
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 50, search = '' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause (CORE TABLE uses CamelCase with double quotes)
    let whereClause = 'u."classId" = $1 AND u.role = $2';
    let params = [classId, 'STUDENT'];
    let paramIndex = 3;

    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u."studentId" ILIKE $${paramIndex})`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "User" u WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get students (CORE TABLE uses CamelCase with double quotes)
    const studentsQuery = `
      SELECT u.id, u.name, u.email, u."studentId", u."createdAt"
      FROM "User" u
      WHERE ${whereClause}
      ORDER BY u.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const studentsParams = [...params, take, skip];
    const studentsResult = await db.query(studentsQuery, studentsParams);

    const students = studentsResult.rows;

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
    const countQuery = `SELECT COUNT(*) as count FROM "User" WHERE role = 'STUDENT'`;
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    
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
    const countQuery = `SELECT COUNT(*) as count FROM "User" WHERE role = 'STUDENT'`;
    const countResult = await db.query(countQuery);
    const totalCount = parseInt(countResult.rows[0].count);
    const nextNumber = totalCount + 1;
    const finalStudentId = `STU-${String(nextNumber).padStart(4, '0')}`;

    // Generate dummy email to satisfy DB NOT NULL constraint
    // Format: stu-{studentId}-{timestamp}@school.internal
    const dummyEmail = `stu-${finalStudentId}-${Date.now().toString().slice(-6)}@school.internal`;

    // Use provided password or default temporary password
    const finalPassword = password || 'Student@123';
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(finalPassword, saltRounds);

    // Create student (CORE TABLE uses CamelCase with double quotes)
    const createQuery = `
      INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", "classId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, name, "studentId", "classId", "createdAt"
    `;

    const createResult = await db.query(createQuery, [
      dummyEmail, 
      hashedPassword, 
      name.trim(), 
      'STUDENT', 
      tenantId, 
      finalStudentId, 
      classId
    ]);
    
    const student = createResult.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        createdAt: student.createdAt,
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

    // Verify student exists and belongs to this class (CORE TABLE uses CamelCase)
    const checkQuery = `
      SELECT * FROM "User" 
      WHERE id = $1 AND "classId" = $2 AND role = 'STUDENT'
    `;
    const checkResult = await db.query(checkQuery, [id, classId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class',
        },
      });
    }

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(name.trim());
      paramIndex++;
    }

    if (email !== undefined) {
      // Check email uniqueness
      const emailExistsQuery = 'SELECT id FROM "User" WHERE email = $1 AND id != $2';
      const emailExistsResult = await db.query(emailExistsQuery, [email.trim(), id]);
      if (emailExistsResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already exists' },
        });
      }
      updateFields.push(`email = $${paramIndex}`);
      updateParams.push(email.trim());
      paramIndex++;
    }

    if (studentId !== undefined) {
      // Check studentId uniqueness
      const studentIdExistsQuery = 'SELECT id FROM "User" WHERE "studentId" = $1 AND id != $2';
      const studentIdExistsResult = await db.query(studentIdExistsQuery, [studentId, id]);
      if (studentIdExistsResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'Student ID already exists' },
        });
      }
      updateFields.push(`"studentId" = $${paramIndex}`);
      updateParams.push(studentId);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes to update',
      });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "User"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, "studentId", "updatedAt"
    `;

    const updateResult = await db.query(updateQuery, updateParams);
    const updatedStudent = updateResult.rows[0];

    res.status(200).json({
      success: true,
      data: updatedStudent,
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

    // Verify student exists and belongs to this class (CORE TABLE uses CamelCase)
    const checkQuery = `
      SELECT * FROM "User" 
      WHERE id = $1 AND "classId" = $2 AND role = 'STUDENT'
    `;
    const checkResult = await db.query(checkQuery, [id, classId]);

    if (checkResult.rows.length === 0) {
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

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password (CORE TABLE uses CamelCase)
    const updateQuery = `
      UPDATE "User"
      SET password = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING id, name, "studentId"
    `;

    await db.query(updateQuery, [hashedPassword, id]);

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

    // Verify student exists and belongs to this class (CORE TABLE uses CamelCase)
    const checkQuery = `
      SELECT * FROM "User" 
      WHERE id = $1 AND "classId" = $2 AND role = 'STUDENT'
    `;
    const checkResult = await db.query(checkQuery, [id, classId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class',
        },
      });
    }

    // Delete student
    const deleteQuery = `DELETE FROM "User" WHERE id = $1`;
    await db.query(deleteQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
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
};
