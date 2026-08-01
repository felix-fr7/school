/**
 * Admin Controller
 * Handles all school admin operations using raw SQL queries
 */

const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const db = require('../config/db');

/**
 * Get all classes for admin's school
 * GET /api/admin/classes
 */
const getAllClasses = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // If admin has no tenantId, return empty array (development/testing mode)
    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Admin not associated with a school. Please assign a school to this admin.'
      });
    }

    const classesQuery = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM "User" u WHERE u."classId" = c.id AND u.role = 'STUDENT') as "studentCount",
        (SELECT COUNT(*) FROM "Homework" h WHERE h."class_id" = c.id) as "homeworkCount",
        COALESCE((SELECT COUNT(*) FROM "Exam" e WHERE e."class_id" = c.id), 0) as "examCount"
      FROM "Class" c
      WHERE c."tenantId" = $1
      ORDER BY c.name ASC
    `;

    const classesResult = await db.query(classesQuery, [tenantId]);

    const classes = classesResult.rows.map(classItem => ({
      ...classItem,
      _count: {
        students: parseInt(classItem.studentCount),
        homeworks: parseInt(classItem.homeworkCount),
        exams: parseInt(classItem.examCount),
      }
    }));

    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("CRITICAL DB ERROR IN getAllClasses:", error.message);
    console.error("Full error details:", JSON.stringify(error, null, 2));
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

    // Validate classId - must be a valid UUID, not 'create' or other strings
    if (!id || id === 'create' || id.length < 36) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Class ID provided. Expected a valid UUID.',
        },
      });
    }

    // Get class details with teacher info
    const classQuery = `
      SELECT 
        c.*,
        t.id as "teacherId",
        t.name as "teacherName",
        t.email as "teacherEmail",
        t.phone as "teacherPhone"
      FROM "Class" c
      LEFT JOIN "User" t ON c."teacherId" = t.id
      WHERE c.id = $1 AND c."tenantId" = $2
    `;

    const classResult = await db.query(classQuery, [id, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    const classData = classResult.rows[0];

    // Access Control: Check if user has permission to view this class dashboard
    if (userRole === 'TEACHER') {
      if (classData.teacherId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only view the dashboard of your assigned class.',
          },
        });
      }
    }

    // Get student count for this class
    const studentCountQuery = `
      SELECT COUNT(*) as count FROM "User" WHERE "classId" = $1 AND role = 'STUDENT'
    `;
    const studentCountResult = await db.query(studentCountQuery, [id]);
    const studentCount = parseInt(studentCountResult.rows[0].count);

    // Get recent homework for this class
    const recentHomeworkQuery = `
      SELECT h.*, u.id as "assignedById", u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "User" u ON h."assigned_by" = u.id
      WHERE h."class_id" = $1 AND h."is_published" = true
      ORDER BY h."created_at" DESC
      LIMIT 5
    `;
    const recentHomeworkResult = await db.query(recentHomeworkQuery, [id]);

    // Get upcoming exams for this class
    const upcomingExamsQuery = `
      SELECT * FROM "Exam"
      WHERE "class_id" = $1 AND "created_at" >= NOW()
      ORDER BY "created_at" ASC
      LIMIT 5
    `;
    const upcomingExamsResult = await db.query(upcomingExamsQuery, [id]);

    // Get recent news/announcements from the tenant
    const recentAnnouncementsQuery = `
      SELECT n.*, u.id as "postedById", u.name as "postedByName"
      FROM "News" n
      LEFT JOIN "User" u ON n."postedBy" = u.id
      WHERE n."tenantId" = $1 AND n."isPublished" = true
      ORDER BY n."created_at" DESC
      LIMIT 5
    `;
    const recentAnnouncementsResult = await db.query(recentAnnouncementsQuery, [tenantId]);

    // Calculate attendance rate (mock data for now)
    const attendanceRate = Math.floor(Math.random() * 20) + 80;

    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData.id,
          classCode: classData.class_code,
          name: classData.name,
          section: classData.section,
          tenantId: classData.tenantId,
          teacherId: classData.teacherId,
          teacher: classData.teacherId ? {
            id: classData.teacherId,
            name: classData.teacherName,
            email: classData.teacherEmail,
            phone: classData.teacherPhone,
          } : null,
        },
        metrics: {
          totalStudents: studentCount,
          attendanceRate,
        },
        recentHomework: recentHomeworkResult.rows,
        upcomingExams: upcomingExamsResult.rows,
        recentAnnouncements: recentAnnouncementsResult.rows,
      },
    });
  } catch (error) {
    console.error("CRITICAL DB ERROR IN getClassDashboard (adminController):", error.message);
    console.error("Full error details:", JSON.stringify(error, null, 2));
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

    const classQuery = `
      SELECT * FROM "Class" WHERE id = $1 AND "tenantId" = $2
    `;
    const classResult = await db.query(classQuery, [id, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    const classData = classResult.rows[0];

    // Get students
    const studentsQuery = `
      SELECT id, name, email, "studentId", "created_at"
      FROM "User"
      WHERE "classId" = $1 AND role = 'STUDENT'
    `;
    const studentsResult = await db.query(studentsQuery, [id]);

    // Get recent homework
    const homeworksQuery = `
      SELECT * FROM "Homework"
      WHERE "class_id" = $1
      ORDER BY "created_at" DESC
      LIMIT 10
    `;
    const homeworksResult = await db.query(homeworksQuery, [id]);

    // Get upcoming exam schedules
    const examSchedulesQuery = `
      SELECT * FROM "ExamSchedule"
      WHERE "classId" = $1 AND date >= NOW()
      ORDER BY date ASC
    `;
    const examSchedulesResult = await db.query(examSchedulesQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...classData,
        students: studentsResult.rows,
        homeworks: homeworksResult.rows,
        examSchedules: examSchedulesResult.rows,
      },
    });
  } catch (error) {
    console.error("DB Error inside getClassById:", error);
    next(error);
  }
};

/**
 * Create a new class
 * POST /api/admin/classes
 * @body { name, section, password, assignedTeacherId }
 */
const createClass = async (req, res, next) => {
  try {
    const { name, section, password, assignedTeacherId } = req.body;
    let tenantId = req.user.tenantId;

    // Fallback: Allow SUPER_ADMIN to specify tenantId in body
    if (!tenantId && req.user.role === 'SUPER_ADMIN' && req.body.tenantId) {
      tenantId = req.body.tenantId;
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Tenant ID is required to create a class. Either log in as a tenant user or provide tenantId in the request body (for SUPER_ADMIN users).',
        },
      });
    }

    // Validate password if provided
    let hashedPassword = null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 6 characters long',
          },
        });
      }
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }

    // If assignedTeacherId is provided, verify the teacher exists and belongs to this tenant
    // Note: Now checking both User table (for legacy teachers) and TeacherDirectory
    if (assignedTeacherId) {
      // Check in User table first
      let teacherCheckQuery = `
        SELECT id, 'USER' as source FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = 'TEACHER'
      `;
      let teacherCheckResult = await db.query(teacherCheckQuery, [assignedTeacherId, tenantId]);

      // If not found in User, check TeacherDirectory
      if (teacherCheckResult.rows.length === 0) {
        teacherCheckQuery = `
          SELECT id, 'DIRECTORY' as source FROM "TeacherDirectory" WHERE id = $1 AND "tenantId" = $2
        `;
        teacherCheckResult = await db.query(teacherCheckQuery, [assignedTeacherId, tenantId]);
      }

      if (teacherCheckResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Teacher not found',
          },
        });
      }
    }

    // Create class (class_code will be auto-generated by trigger)
    const createQuery = `
      INSERT INTO "Class" (name, section, "tenantId", "teacherId", "password", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    const createResult = await db.query(createQuery, [name, section || null, tenantId, assignedTeacherId || null, hashedPassword]);

    const classData = createResult.rows[0];

    // Get teacher info if exists
    let teacher = null;
    if (assignedTeacherId) {
      // Check User table
      let teacherQuery = `
        SELECT id, name, email FROM "User" WHERE id = $1 AND role = 'TEACHER'
      `;
      let teacherResult = await db.query(teacherQuery, [assignedTeacherId]);
      
      // If not found, check TeacherDirectory
      if (teacherResult.rows.length === 0) {
        teacherQuery = `
          SELECT id, name, email FROM "TeacherDirectory" WHERE id = $1
        `;
        teacherResult = await db.query(teacherQuery, [assignedTeacherId]);
      }
      
      if (teacherResult.rows.length > 0) {
        teacher = teacherResult.rows[0];
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: classData.id,
        classCode: classData.class_code, // Auto-generated
        name: classData.name,
        section: classData.section,
        teacher,
        passwordSet: !!hashedPassword,
      },
      message: 'Class created successfully. Class code has been auto-generated.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset class password
 * POST /api/admin/classes/:id/reset-password
 * @body { password }
 */
const resetClassPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const tenantId = req.user.tenantId;

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long',
        },
      });
    }

    // First verify the class exists and belongs to this tenant
    const checkQuery = `SELECT * FROM "Class" WHERE id = $1 AND "tenantId" = $2`;
    const checkResult = await db.query(checkQuery, [id, tenantId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    // Hash the new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update the password
    const updateQuery = `
      UPDATE "Class" 
      SET "password" = $1, "updated_at" = NOW()
      WHERE id = $2 AND "tenantId" = $3
      RETURNING id, "class_code", name, section
    `;
    const updateResult = await db.query(updateQuery, [hashedPassword, id, tenantId]);

    const updatedClass = updateResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: updatedClass.id,
        classCode: updatedClass.class_code,
        name: updatedClass.name,
        section: updatedClass.section,
      },
      message: 'Class password has been reset successfully',
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
    const checkQuery = `SELECT * FROM "Class" WHERE id = $1 AND "tenantId" = $2`;
    const checkResult = await db.query(checkQuery, [id, tenantId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    const existingClass = checkResult.rows[0];

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (req.body.name !== undefined) {
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
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(trimmedName);
      paramIndex++;
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
      updateFields.push(`section = $${paramIndex}`);
      updateParams.push(trimmedSection || null);
      paramIndex++;
    }

    // Handle teacherId if provided
    if (req.body.teacherId !== undefined) {
      const newTeacherId = req.body.teacherId;

      if (newTeacherId) {
        // Verify the new teacher exists and belongs to this tenant
        const teacherCheckQuery = `
          SELECT id FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = 'TEACHER'
        `;
        const teacherCheckResult = await db.query(teacherCheckQuery, [newTeacherId, tenantId]);

        if (teacherCheckResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Teacher not found',
            },
          });
        }

        // Check if this teacher is already assigned to another class
        const existingAssignmentQuery = `
          SELECT id FROM "Class" WHERE "teacherId" = $1 AND id != $2
        `;
        const existingAssignmentResult = await db.query(existingAssignmentQuery, [newTeacherId, id]);

        if (existingAssignmentResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'This teacher is already assigned to another class',
            },
          });
        }

        updateFields.push(`"teacherId" = $${paramIndex}`);
        updateParams.push(newTeacherId);
        paramIndex++;
      } else {
        updateFields.push(`"teacherId" = $${paramIndex}`);
        updateParams.push(null);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(200).json({
        success: true,
        data: existingClass,
        message: 'No changes to update',
      });
    }

    updateFields.push(`"updated_at" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "Class"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);
    const updatedClass = updateResult.rows[0];

    // Get teacher info if exists
    let teacher = null;
    if (updatedClass.teacherId) {
      const teacherQuery = `
        SELECT id, name, email FROM "User" WHERE id = $1
      `;
      const teacherResult = await db.query(teacherQuery, [updatedClass.teacherId]);
      if (teacherResult.rows.length > 0) {
        teacher = teacherResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...updatedClass,
        teacher,
      },
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
 */
const deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // First, verify the class exists and belongs to this tenant
    const checkQuery = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM "User" u WHERE u."classId" = c.id AND u.role = 'STUDENT') as "studentCount",
        (SELECT COUNT(*) FROM "Homework" h WHERE h."class_id" = c.id) as "homeworkCount",
        (SELECT COUNT(*) FROM "Exam" e WHERE e."class_id" = c.id) as "examCount",
        t.name as "teacherName"
      FROM "Class" c
      LEFT JOIN "User" t ON c."teacherId" = t.id
      WHERE c.id = $1 AND c."tenantId" = $2
    `;

    const checkResult = await db.query(checkQuery, [id, tenantId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Class not found',
        },
      });
    }

    const existingClass = checkResult.rows[0];

    const dependencyInfo = {
      studentCount: parseInt(existingClass.studentCount),
      homeworkCount: parseInt(existingClass.homeworkCount),
      examCount: parseInt(existingClass.examCount),
      hasTeacher: !!existingClass.teacherId,
    };

    // Perform the deletion in a transaction
    await db.transaction(async (query) => {
      // Step 1: Detach students from this class
      if (dependencyInfo.studentCount > 0) {
        await query('UPDATE "User" SET "classId" = NULL WHERE "classId" = $1 AND role = $2', [id, 'STUDENT']);
      }

      // Step 2: Delete associated homework
      if (dependencyInfo.homeworkCount > 0) {
        await query('DELETE FROM "Homework" WHERE "class_id" = $1', [id]);
      }

      // Step 3: Delete associated exams
      if (dependencyInfo.examCount > 0) {
        await query('DELETE FROM "Exam" WHERE "class_id" = $1', [id]);
      }

      // Step 4: Delete the class itself
      await query('DELETE FROM "Class" WHERE id = $1', [id]);
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

    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete class: It has related records. Please remove dependencies first.',
          code: 'FOREIGN_KEY_CONSTRAINT',
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

    // Build where clause
    let whereClause = 'u."tenantId" = $1 AND u.role = $2';
    let params = [tenantId, 'STUDENT'];
    let paramIndex = 3;

    if (classId) {
      params.push(classId);
      whereClause += ` AND u."classId" = $${paramIndex}`;
      paramIndex++;
    }

    if (search) {
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u."studentId" ILIKE $${paramIndex})`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "User" u WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get students
    const studentsQuery = `
      SELECT 
        u.id, u.name, u.email, u."studentId", u."created_at",
        c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE ${whereClause}
      ORDER BY u."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const studentsParams = [...params, take, skip];
    const studentsResult = await db.query(studentsQuery, studentsParams);

    const students = studentsResult.rows.map(student => ({
      ...student,
      class: student.classId ? {
        id: student.classId,
        name: student.className,
        section: student.classSection,
      } : null,
    }));

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

    const studentQuery = `
      SELECT 
        u.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE u.id = $1 AND u."tenantId" = $2 AND u.role = $3
    `;

    const studentResult = await db.query(studentQuery, [id, tenantId, 'STUDENT']);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    const { password, ...studentWithoutPassword } = studentResult.rows[0];

    // Get recent marks
    const marksQuery = `
      SELECT * FROM "Mark"
      WHERE "studentId" = $1
      ORDER BY "created_at" DESC
      LIMIT 10
    `;
    const marksResult = await db.query(marksQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...studentWithoutPassword,
        class: studentWithoutPassword.classId ? {
          id: studentWithoutPassword.classId,
          name: studentWithoutPassword.className,
          section: studentWithoutPassword.classSection,
        } : null,
        marks: marksResult.rows,
      },
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
    const emailCheckQuery = 'SELECT id FROM "User" WHERE email = $1';
    const emailCheckResult = await db.query(emailCheckQuery, [email]);

    if (emailCheckResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Student with this email already exists',
        },
      });
    }

    // Check if studentId already exists
    const studentIdCheckQuery = 'SELECT id FROM "User" WHERE "studentId" = $1';
    const studentIdCheckResult = await db.query(studentIdCheckQuery, [studentId]);

    if (studentIdCheckResult.rows.length > 0) {
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

    // Create student
    const createQuery = `
      INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", "classId", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, name, "studentId", "classId", "created_at"
    `;

    const createResult = await db.query(createQuery, [email, hashedPassword, name, 'STUDENT', tenantId, studentId, classId || null]);
    const student = createResult.rows[0];

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
    const { name, email, phone, classId } = req.body;
    const tenantId = req.user.tenantId;

    // First verify the student exists and belongs to this tenant
    const checkQuery = 'SELECT * FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = $3';
    const checkResult = await db.query(checkQuery, [id, tenantId, 'STUDENT']);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    const existingStudent = checkResult.rows[0];

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          error: { message: 'Student name cannot be empty' },
        });
      }
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(trimmedName);
      paramIndex++;
    }

    if (email !== undefined) {
      const trimmedEmail = email.trim();
      if (trimmedEmail !== existingStudent.email) {
        const emailExistsQuery = 'SELECT id FROM "User" WHERE email = $1 AND id != $2';
        const emailExistsResult = await db.query(emailExistsQuery, [trimmedEmail, id]);
        if (emailExistsResult.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: { message: 'Email already exists' },
          });
        }
      }
      updateFields.push(`email = $${paramIndex}`);
      updateParams.push(trimmedEmail);
      paramIndex++;
    }

    if (phone !== undefined) {
      const trimmedPhone = phone?.trim() || '';
      updateFields.push(`phone = $${paramIndex}`);
      updateParams.push(trimmedPhone || null);
      paramIndex++;
    }

    if (classId !== undefined) {
      if (classId) {
        const classExistsQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
        const classExistsResult = await db.query(classExistsQuery, [classId, tenantId]);
        if (classExistsResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { message: 'Class not found in your school' },
          });
        }
        updateFields.push(`"classId" = $${paramIndex}`);
        updateParams.push(classId);
        paramIndex++;
      } else {
        updateFields.push(`"classId" = $${paramIndex}`);
        updateParams.push(null);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(200).json({
        success: true,
        data: existingStudent,
        message: 'No changes to update',
      });
    }

    updateFields.push(`"updated_at" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "User"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, phone, "studentId", "classId", "updated_at"
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
 * Delete a student
 * DELETE /api/admin/students/:id
 */
const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // First verify the student exists and belongs to this tenant
    const checkQuery = 'SELECT * FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = $3';
    const checkResult = await db.query(checkQuery, [id, tenantId, 'STUDENT']);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    const existingStudent = checkResult.rows[0];

    // Delete the student
    const deleteQuery = 'DELETE FROM "User" WHERE id = $1';
    await db.query(deleteQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: {
        deletedStudentId: id,
        studentName: existingStudent.name,
        studentEmail: existingStudent.email,
      },
    });
  } catch (error) {
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete student: It has related records. Please remove dependencies first.',
          code: 'FOREIGN_KEY_CONSTRAINT',
        },
      });
    }
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

    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: { homeworks: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        message: 'Admin not associated with a school. Please assign a school to this admin.'
      });
    }

    const { classId, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'h."tenant_id" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND h."class_id" = $${paramIndex}`;
      paramIndex++;
    }

    if (isPublished !== undefined) {
      params.push(isPublished === 'true');
      whereClause += ` AND h."is_published" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Homework" h WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get homework
    const homeworksQuery = `
      SELECT 
        h.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection",
        u.id as "assignedById",
        u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "Class" c ON h."class_id" = c.id
      LEFT JOIN "User" u ON h."assigned_by" = u.id
      WHERE ${whereClause}
      ORDER BY h."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const homeworksParams = [...params, take, skip];
    const homeworksResult = await db.query(homeworksQuery, homeworksParams);

    const homeworks = homeworksResult.rows.map(hw => ({
      id: hw.id,
      title: hw.title,
      description: hw.description,
      subject: hw.subject,
      classId: hw.class_id,
      tenantId: hw.tenant_id,
      assignedBy: hw.assigned_by,
      dueDate: hw.due_date,
      isPublished: hw.is_published,
      created_at: hw.created_at,
      updated_at: hw.updated_at,
      class: hw.class_id ? {
        id: hw.classId,
        name: hw.className,
        section: hw.classSection,
      } : null,
      assignedByUser: hw.assigned_by ? {
        id: hw.assignedById,
        name: hw.assignedByName,
      } : null,
    }));

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

    const homeworkQuery = `
      SELECT 
        h.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection",
        u.id as "assignedById",
        u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "Class" c ON h."class_id" = c.id
      LEFT JOIN "User" u ON h."assigned_by" = u.id
      WHERE h.id = $1 AND h."tenant_id" = $2
    `;

    const homeworkResult = await db.query(homeworkQuery, [id, tenantId]);

    if (homeworkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found',
        },
      });
    }

    const hw = homeworkResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...hw,
        class: hw.class_id ? {
          id: hw.classId,
          name: hw.className,
          section: hw.classSection,
        } : null,
        assignedByUser: hw.assigned_by ? {
          id: hw.assignedById,
          name: hw.assignedByName,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new homework
 * POST /api/admin/homework
 * Also handles POST /api/class-controller/homework (class-based login)
 */
const createHomework = async (req, res, next) => {
  try {
    const { title, description, subject, classId, dueDate } = req.body;
    const tenantId = req.user.tenantId;
    
    // Determine assigned_by user ID
    let assignedBy;
    
    if (req.user.id) {
      // Regular user login - use the user's ID
      assignedBy = req.user.id;
    } else if (req.user.classId) {
      // Class-based login - look up the class's assigned teacher
      const classQuery = `SELECT "teacherId" FROM "Class" WHERE id = $1 AND "tenantId" = $2`;
      const classResult = await db.query(classQuery, [req.user.classId, tenantId]);
      
      if (classResult.rows.length > 0 && classResult.rows[0].teacherId) {
        // Use the class's assigned teacher ID
        assignedBy = classResult.rows[0].teacherId;
      } else {
        // Fallback: Use a system approach - find any teacher in the tenant
        const fallbackQuery = `SELECT id FROM "User" WHERE "tenantId" = $1 AND role = 'TEACHER' LIMIT 1`;
        const fallbackResult = await db.query(fallbackQuery, [tenantId]);
        
        if (fallbackResult.rows.length > 0) {
          assignedBy = fallbackResult.rows[0].id;
        } else {
          return res.status(400).json({
            success: false,
            error: {
              message: 'No valid teacher found to assign homework. Please assign a teacher to your class.',
            },
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Authentication required to create homework',
        },
      });
    }

    const createQuery = `
      INSERT INTO "Homework" (title, description, subject, "class_id", "tenant_id", "assigned_by", "due_date", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      title, description, subject, classId, tenantId, assignedBy, dueDate ? new Date(dueDate) : null
    ]);

    const homework = createResult.rows[0];

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

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(title);
      paramIndex++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateParams.push(description);
      paramIndex++;
    }
    if (subject !== undefined) {
      updateFields.push(`subject = $${paramIndex}`);
      updateParams.push(subject);
      paramIndex++;
    }
    if (classId !== undefined) {
      updateFields.push(`"class_id" = $${paramIndex}`);
      updateParams.push(classId);
      paramIndex++;
    }
    if (dueDate !== undefined) {
      updateFields.push(`"due_date" = $${paramIndex}`);
      updateParams.push(dueDate ? new Date(dueDate) : null);
      paramIndex++;
    }
    if (isPublished !== undefined) {
      updateFields.push(`"is_published" = $${paramIndex}`);
      updateParams.push(isPublished);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateParams.push(id);
    updateParams.push(tenantId);

    const updateQuery = `
      UPDATE "Homework"
      SET ${updateFields.join(', ')}, "updated_at" = NOW()
      WHERE id = $${paramIndex} AND "tenant_id" = $${paramIndex + 1}
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
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

    const deleteQuery = 'DELETE FROM "Homework" WHERE id = $1 AND "tenant_id" = $2';
    const deleteResult = await db.query(deleteQuery, [id, tenantId]);

    if (deleteResult.rowCount === 0) {
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

    // Build where clause
    let whereClause = 'm."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (studentId) {
      params.push(studentId);
      whereClause += ` AND m."studentId" = $${paramIndex}`;
      paramIndex++;
    }

    if (examType) {
      params.push(examType);
      whereClause += ` AND m."examType" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Mark" m WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get marks
    const marksQuery = `
      SELECT 
        m.*,
        u.id as "studentUserId",
        u.name as "studentName",
        u."studentId" as "studentRollNumber",
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "Mark" m
      LEFT JOIN "User" u ON m."studentId" = u.id
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE ${whereClause}
      ORDER BY m."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const marksParams = [...params, take, skip];
    const marksResult = await db.query(marksQuery, marksParams);

    const marks = marksResult.rows.map(mark => ({
      ...mark,
      student: mark.studentUserId ? {
        id: mark.studentUserId,
        name: mark.studentName,
        studentId: mark.studentRollNumber,
        class: mark.classId ? {
          id: mark.classId,
          name: mark.className,
          section: mark.classSection,
        } : null,
      } : null,
    }));

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

    const createQuery = `
      INSERT INTO "Mark" ("studentId", subject, "marksObtained", "totalMarks", percentage, grade, "examType", "examDate", "tenantId", remarks, "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      studentId, subject, marksObtained, totalMarks, percentage, grade, examType, examDate ? new Date(examDate) : null, tenantId, remarks || null
    ]);

    const mark = createResult.rows[0];

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

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (marksObtained !== undefined && totalMarks !== undefined) {
      const percentage = (marksObtained / totalMarks) * 100;
      let calculatedGrade = 'F';
      if (percentage >= 90) calculatedGrade = 'A+';
      else if (percentage >= 80) calculatedGrade = 'A';
      else if (percentage >= 70) calculatedGrade = 'B+';
      else if (percentage >= 60) calculatedGrade = 'B';
      else if (percentage >= 50) calculatedGrade = 'C';
      else if (percentage >= 40) calculatedGrade = 'D';

      updateFields.push(`"marksObtained" = $${paramIndex}`);
      updateParams.push(marksObtained);
      paramIndex++;
      updateFields.push(`"totalMarks" = $${paramIndex}`);
      updateParams.push(totalMarks);
      paramIndex++;
      updateFields.push(`percentage = $${paramIndex}`);
      updateParams.push(percentage);
      paramIndex++;
      updateFields.push(`grade = $${paramIndex}`);
      updateParams.push(calculatedGrade);
      paramIndex++;
    } else if (marksObtained !== undefined) {
      updateFields.push(`"marksObtained" = $${paramIndex}`);
      updateParams.push(marksObtained);
      paramIndex++;
    }

    if (grade !== undefined) {
      updateFields.push(`grade = $${paramIndex}`);
      updateParams.push(grade);
      paramIndex++;
    }
    if (remarks !== undefined) {
      updateFields.push(`remarks = $${paramIndex}`);
      updateParams.push(remarks);
      paramIndex++;
    }
    if (isPublished !== undefined) {
      updateFields.push(`"isPublished" = $${paramIndex}`);
      updateParams.push(isPublished);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateParams.push(id);
    updateParams.push(tenantId);

    const updateQuery = `
      UPDATE "Mark"
      SET ${updateFields.join(', ')}, "updated_at" = NOW()
      WHERE id = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
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

    const deleteQuery = 'DELETE FROM "Mark" WHERE id = $1 AND "tenantId" = $2';
    const deleteResult = await db.query(deleteQuery, [id, tenantId]);

    if (deleteResult.rowCount === 0) {
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

    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: { news: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        message: 'Admin not associated with a school. Please assign a school to this admin.'
      });
    }

    const { category, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'n."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (category) {
      params.push(category);
      whereClause += ` AND n.category = $${paramIndex}`;
      paramIndex++;
    }

    if (isPublished !== undefined) {
      params.push(isPublished === 'true');
      whereClause += ` AND n."isPublished" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "News" n WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get news
    const newsQuery = `
      SELECT 
        n.*,
        u.id as "postedById",
        u.name as "postedByName"
      FROM "News" n
      LEFT JOIN "User" u ON n."postedBy" = u.id
      WHERE ${whereClause}
      ORDER BY n."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const newsParams = [...params, take, skip];
    const newsResult = await db.query(newsQuery, newsParams);

    const news = newsResult.rows.map(item => ({
      ...item,
      postedByUser: item.postedById ? {
        id: item.postedById,
        name: item.postedByName,
      } : null,
    }));

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

    const createQuery = `
      INSERT INTO "News" (title, content, summary, category, "imageUrl", "tenantId", "postedBy", "isPublished", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      title, content, summary || null, category || null, imageUrl || null, tenantId, postedBy, true
    ]);

    const news = createResult.rows[0];

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

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(title);
      paramIndex++;
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      updateParams.push(content);
      paramIndex++;
    }
    if (isPublished !== undefined) {
      updateFields.push(`"isPublished" = $${paramIndex}`);
      updateParams.push(isPublished);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateParams.push(id);
    updateParams.push(tenantId);

    const updateQuery = `
      UPDATE "News"
      SET ${updateFields.join(', ')}, "updated_at" = NOW()
      WHERE id = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
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

    const deleteQuery = 'DELETE FROM "News" WHERE id = $1 AND "tenantId" = $2';
    const deleteResult = await db.query(deleteQuery, [id, tenantId]);

    if (deleteResult.rowCount === 0) {
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

    // Build where clause
    let whereClause = 'c."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (isPublished !== undefined) {
      params.push(isPublished === 'true');
      whereClause += ` AND c."isPublished" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Circular" c WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get circulars
    const circularsQuery = `
      SELECT 
        c.*,
        u.id as "issuedById",
        u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE ${whereClause}
      ORDER BY c."issueDate" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const circularsParams = [...params, take, skip];
    const circularsResult = await db.query(circularsQuery, circularsParams);

    const circulars = circularsResult.rows.map(item => ({
      ...item,
      issuedByUser: item.issuedById ? {
        id: item.issuedById,
        name: item.issuedByName,
      } : null,
    }));

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
    const { title, content } = req.body;
    const tenantId = req.user.tenantId;
    const issuedBy = req.user.id;

    const createQuery = `
      INSERT INTO "Circular" (title, content, "tenantId", "issuedBy", "issueDate", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [title, content, tenantId, issuedBy]);

    const circular = createResult.rows[0];

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

    const deleteQuery = 'DELETE FROM "Circular" WHERE id = $1 AND "tenantId" = $2';
    const deleteResult = await db.query(deleteQuery, [id, tenantId]);

    if (deleteResult.rowCount === 0) {
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

    // Build where clause
    let whereClause = 'es."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND es."classId" = $${paramIndex}`;
      paramIndex++;
    }

    if (isPublished !== undefined) {
      params.push(isPublished === 'true');
      whereClause += ` AND es."isPublished" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "ExamSchedule" es WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get exam schedules
    const examSchedulesQuery = `
      SELECT 
        es.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "ExamSchedule" es
      LEFT JOIN "Class" c ON es."classId" = c.id
      WHERE ${whereClause}
      ORDER BY es.date ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const examSchedulesParams = [...params, take, skip];
    const examSchedulesResult = await db.query(examSchedulesQuery, examSchedulesParams);

    const examSchedules = examSchedulesResult.rows.map(item => ({
      ...item,
      class: item.classId ? {
        id: item.classId,
        name: item.className,
        section: item.classSection,
      } : null,
    }));

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
 * Create new exam schedule (legacy - JSON body)
 * POST /api/admin/exam-schedules
 */
const createExamSchedule = async (req, res, next) => {
  try {
    const { title, subject, date, time, classId, duration, roomNo } = req.body;
    const tenantId = req.user.tenantId;

    const createQuery = `
      INSERT INTO "ExamSchedule" (title, subject, date, time, "classId", "tenantId", duration, "roomNo", "isPublished", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      title, subject, new Date(date), time, classId, tenantId, duration || null, roomNo || null, true
    ]);

    const examSchedule = createResult.rows[0];

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
 * Create new exam schedule with file upload (PDF/Image)
 * POST /api/admin/exam-schedules (multipart/form-data)
 */
const createExamScheduleWithFile = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    let { classId, title } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded. Please upload a PDF or image file.' },
      });
    }

    // Validate title - required field
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Timetable title is required.' },
      });
    }

    title = title.trim();

    // Get file info from memory storage (originalname is available, filename is not)
    const fileName = req.file.originalname;
    const fileUrl = `/uploads/${fileName}`;

    // Validate classId - must be a valid UUID or null/empty for school-wide
    const isValidUUID = (value) => {
      if (!value || typeof value !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    };

    // If classId is not a valid UUID, set it to null (school-wide)
    if (!isValidUUID(classId)) {
      classId = null;
    }

    // Verify class exists if classId is provided
    if (classId) {
      const classExistsQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
      const classExistsResult = await db.query(classExistsQuery, [classId, tenantId]);

      if (classExistsResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Class not found in your school' },
        });
      }
    }

    // Create exam schedule record with file URL
    const createQuery = `
      INSERT INTO "ExamSchedule" (title, subject, date, time, "classId", "tenantId", "fileUrl", "isPublished", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const subject = 'Timetable';
    const date = new Date();
    const time = '00:00:00';

    const createResult = await db.query(createQuery, [
      title, subject, date, time, classId || null, tenantId, fileUrl, true
    ]);

    const examSchedule = createResult.rows[0];

    res.status(201).json({
      success: true,
      data: examSchedule,
      message: 'Exam timetable uploaded successfully',
    });
  } catch (error) {
    console.error('CreateExamScheduleWithFile Error:', error);
    next(error);
  }
};

/**
 * Update exam schedule
 * PUT /api/admin/exam-schedules/:id
 */
const updateExamSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, classId } = req.body;
    const tenantId = req.user.tenantId;

    // Verify the exam schedule exists and belongs to this tenant
    const checkQuery = 'SELECT * FROM "ExamSchedule" WHERE id = $1 AND "tenantId" = $2';
    const checkResult = await db.query(checkQuery, [id, tenantId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam schedule not found',
        },
      });
    }

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Title cannot be empty' },
        });
      }
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(title.trim());
      paramIndex++;
    }

    if (classId !== undefined) {
      // Validate classId - must be a valid UUID or null for school-wide
      const isValidUUID = (value) => {
        if (value === null || value === undefined || value === '') return true;
        if (typeof value !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      };

      if (!isValidUUID(classId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid class ID format' },
        });
      }

      // If classId is provided, verify it exists in this tenant
      if (classId) {
        const classExistsQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
        const classExistsResult = await db.query(classExistsQuery, [classId, tenantId]);
        if (classExistsResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { message: 'Class not found in your school' },
          });
        }
      }

      updateFields.push(`"classId" = $${paramIndex}`);
      updateParams.push(classId || null);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateFields.push(`"updated_at" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "ExamSchedule"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
    `;

    await db.query(updateQuery, updateParams);

    res.status(200).json({
      success: true,
      message: 'Exam schedule updated successfully',
    });
  } catch (error) {
    console.error('UpdateExamSchedule Error:', error);
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

    const deleteQuery = 'DELETE FROM "ExamSchedule" WHERE id = $1 AND "tenantId" = $2';
    const deleteResult = await db.query(deleteQuery, [id, tenantId]);

    if (deleteResult.rowCount === 0) {
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
 */
const getAvailableTeachers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, search, page = 1, limit = 100 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'u."tenantId" = $1 AND u.role = $2';
    let params = [tenantId, 'TEACHER'];
    let paramIndex = 3;

    if (classId) {
      // Include teachers who have no class OR are assigned to this specific class
      whereClause += ` AND (u."classId" IS NULL OR u."classId" = $${paramIndex})`;
      params.push(classId);
      paramIndex++;
    } else {
      // If no classId provided, only show unassigned teachers
      whereClause += ` AND u."classId" IS NULL`;
    }

    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "User" u WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get teachers
    const teachersQuery = `
      SELECT 
        u.id, u.name, u.email, u.phone, u."classId", u."created_at",
        c.id as "cId", c.name as "cName", c.section as "cSection"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE ${whereClause}
      ORDER BY u.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const teachersParams = [...params, take, skip];
    const teachersResult = await db.query(teachersQuery, teachersParams);

    const teachers = teachersResult.rows.map(teacher => ({
      ...teacher,
      class: teacher.cId ? {
        id: teacher.cId,
        name: teacher.cName,
        section: teacher.cSection,
      } : null,
      // Remove redundant fields
      cId: undefined,
      cName: undefined,
      cSection: undefined,
    }));

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

    // Build where clause
    let whereClause = 'u."tenantId" = $1 AND u.role = $2';
    let params = [tenantId, 'TEACHER'];
    let paramIndex = 3;

    if (classId) {
      params.push(classId);
      whereClause += ` AND u."classId" = $${paramIndex}`;
      paramIndex++;
    }

    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "User" u WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get teachers
    const teachersQuery = `
      SELECT 
        u.id, u.name, u.email, u.phone, u."classId", u."created_at",
        c.id as "cId", c.name as "cName", c.section as "cSection"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE ${whereClause}
      ORDER BY u."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const teachersParams = [...params, take, skip];
    const teachersResult = await db.query(teachersQuery, teachersParams);

    const teachers = teachersResult.rows.map(teacher => ({
      ...teacher,
      class: teacher.cId ? {
        id: teacher.cId,
        name: teacher.cName,
        section: teacher.cSection,
      } : null,
      cId: undefined,
      cName: undefined,
      cSection: undefined,
    }));

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

    const teacherQuery = `
      SELECT 
        u.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      WHERE u.id = $1 AND u."tenantId" = $2 AND u.role = $3
    `;

    const teacherResult = await db.query(teacherQuery, [id, tenantId, 'TEACHER']);

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Teacher not found',
        },
      });
    }

    const { password, ...teacherWithoutPassword } = teacherResult.rows[0];

    // Get class students
    if (teacherWithoutPassword.classId) {
      const studentsQuery = `
        SELECT id, name, "studentId" FROM "User"
        WHERE "classId" = $1 AND role = 'STUDENT'
      `;
      const studentsResult = await db.query(studentsQuery, [teacherWithoutPassword.classId]);
      teacherWithoutPassword.class = {
        ...teacherWithoutPassword.class,
        students: studentsResult.rows,
      };
    }

    // Get recent homework
    const homeworksQuery = `
      SELECT * FROM "Homework"
      WHERE "assigned_by" = $1
      ORDER BY "created_at" DESC
      LIMIT 10
    `;
    const homeworksResult = await db.query(homeworksQuery, [id]);

    // Get recent marks
    const marksQuery = `
      SELECT * FROM "Mark"
      WHERE "studentId" IN (
        SELECT id FROM "User" WHERE "classId" = (
          SELECT "classId" FROM "User" WHERE id = $1
        ) AND role = 'STUDENT'
      )
      ORDER BY "created_at" DESC
      LIMIT 10
    `;
    const marksResult = await db.query(marksQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...teacherWithoutPassword,
        homeworks: homeworksResult.rows,
        marks: marksResult.rows,
      },
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
    const { name, email, password, phone, age, gender, qualification } = req.body;
    const User = require('../models/User');
    const School = require('../models/School');
    
    // Get tenantId from user's schoolId (MongoDB)
    const schoolId = req.user.schoolId;
    
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Admin must be associated with a school' }
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'A user with this email already exists' }
      });
    }

    // Create teacher using Mongoose
    const teacher = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      phone: phone?.trim() || undefined,
      age: age ? parseInt(age) : undefined,
      gender: gender || undefined,
      qualification: qualification?.trim() || undefined,
      role: 'Teacher', // MongoDB uses 'Teacher' not 'TEACHER'
      schoolId: schoolId,
      isActive: true
    });

    await teacher.save();

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    res.status(201).json({
      success: true,
      data: teacherResponse,
      message: 'Teacher created successfully'
    });
  } catch (error) {
    console.error('CreateTeacher Error:', error);
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
    const checkQuery = 'SELECT * FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = $3';
    const checkResult = await db.query(checkQuery, [teacherId, tenantId, 'TEACHER']);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Teacher not found',
        },
      });
    }

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name !== undefined && name !== null && name.trim() !== '') {
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(name.trim());
      paramIndex++;
    }
    if (email !== undefined && email !== null && email.trim() !== '') {
      updateFields.push(`email = $${paramIndex}`);
      updateParams.push(email.trim());
      paramIndex++;
    }
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      updateFields.push(`phone = $${paramIndex}`);
      updateParams.push(phone.trim());
      paramIndex++;
    }
    if (classId !== undefined) {
      if (classId !== null && classId !== '' && typeof classId === 'string') {
        updateFields.push(`"classId" = $${paramIndex}`);
        updateParams.push(classId.trim());
        paramIndex++;
      } else {
        updateFields.push(`"classId" = $${paramIndex}`);
        updateParams.push(null);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes to update',
      });
    }

    updateFields.push(`"updated_at" = NOW()`);
    updateParams.push(teacherId);

    const updateQuery = `
      UPDATE "User"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.query(updateQuery, updateParams);

    // Update class teacher reference if classId was explicitly provided
    if (req.body.classId !== undefined) {
      // Remove teacher reference from old class
      await db.query('UPDATE "Class" SET "teacherId" = NULL, "updated_at" = NOW() WHERE "teacherId" = $1', [teacherId]);

      // Set teacher reference on new class only if a valid classId was provided
      if (classId !== undefined && classId !== null && typeof classId === 'string' && classId.trim() !== '') {
        await db.query('UPDATE "Class" SET "teacherId" = $1, "updated_at" = NOW() WHERE id = $2', [classId.trim(), teacherId]);
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

    const deleteQuery = 'DELETE FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = $3';
    const deleteResult = await db.query(deleteQuery, [id, tenantId, 'TEACHER']);

    if (deleteResult.rowCount === 0) {
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
    const existingRollNumberQuery = 'SELECT id FROM "User" WHERE "studentId" = $1';
    const existingRollNumberResult = await db.query(existingRollNumberQuery, [rollNumber]);

    if (existingRollNumberResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { message: `Student with roll number "${rollNumber}" already exists` },
      });
    }

    // Check for existing userId (email)
    const existingUserIdQuery = 'SELECT id FROM "User" WHERE email = $1';
    const existingUserIdResult = await db.query(existingUserIdQuery, [userId]);

    if (existingUserIdResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { message: `User ID "${userId}" already exists` },
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Parse classAndSection and find class
    let classId = null;
    if (classAndSection && className) {
      const [class_name, section] = classAndSection.split('-');
      const classQuery = `
        SELECT id FROM "Class"
        WHERE name = $1 AND (section = $2 OR section IS NULL) AND "tenantId" = $3
        LIMIT 1
      `;
      const classResult = await db.query(classQuery, [class_name.trim(), section?.trim() || null, tenantId]);
      if (classResult.rows.length > 0) {
        classId = classResult.rows[0].id;
      }
    }

    // Create student
    const createQuery = `
      INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", "classId", phone, "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, email, name, "studentId", "classId", "created_at"
    `;

    const createResult = await db.query(createQuery, [
      userId, hashedPassword, studentName, 'STUDENT', tenantId, rollNumber, classId, parentMobile || null
    ]);

    const student = createResult.rows[0];

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
    const existingRollNumbersQuery = `
      SELECT "studentId" FROM "User" WHERE "studentId" = ANY($1)
    `;
    const existingRollNumbersResult = await db.query(existingRollNumbersQuery, [studentsToCreate.map(s => s.rollNumber)]);
    const existingRollNumbers = new Set(existingRollNumbersResult.rows.map(r => r.studentId));

    const existingUserIdsQuery = `
      SELECT email FROM "User" WHERE email = ANY($1)
    `;
    const existingUserIdsResult = await db.query(existingUserIdsQuery, [studentsToCreate.map(s => s.userId)]);
    const existingUserIds = new Set(existingUserIdsResult.rows.map(u => u.email));

    // Filter out duplicates
    const validStudents = studentsToCreate.filter(s => {
      if (existingRollNumbers.has(s.rollNumber)) {
        errors.push({ row: s.rollNumber, error: `Duplicate roll number: ${s.rollNumber}` });
        return false;
      }
      if (existingUserIds.has(s.userId)) {
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

    // Create students in batch
    const createdStudents = [];
    for (const student of validStudents) {
      const hashedPassword = await bcrypt.hash(student.password, saltRounds);
      const createQuery = `
        INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", phone, "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, email, name, "studentId", "created_at"
      `;
      const result = await db.query(createQuery, [
        student.userId, hashedPassword, student.studentName, 'STUDENT', tenantId, student.rollNumber, student.parentMobile
      ]);
      createdStudents.push(result.rows[0]);
    }

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
    const classExistsQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
    const classExistsResult = await db.query(classExistsQuery, [classId, tenantId]);

    if (classExistsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Class not found in your school' },
      });
    }

    // Parse CSV file using xlsx (read from buffer, not path)
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
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

    if (studentsToCreate.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No valid student records found' },
      });
    }

    // Check for existing emails and studentIds
    const emails = studentsToCreate.map(s => s.email);
    const studentIds = studentsToCreate.map(s => s.studentId);

    const existingEmailsQuery = `
      SELECT email FROM "User" WHERE email = ANY($1)
    `;
    const existingEmailsResult = await db.query(existingEmailsQuery, [emails]);
    const existingEmailSet = new Set(existingEmailsResult.rows.map(e => e.email));

    const existingStudentIdsQuery = `
      SELECT "studentId" FROM "User" WHERE "studentId" = ANY($1) AND "tenantId" = $2
    `;
    const existingStudentIdsResult = await db.query(existingStudentIdsQuery, [studentIds, tenantId]);
    const existingStudentIdSet = new Set(existingStudentIdsResult.rows.map(s => s.studentId));

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
    const createdStudents = [];
    for (const student of finalStudents) {
      const hashedPassword = await bcrypt.hash(student.password, saltRounds);
      const createQuery = `
        INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", phone, "classId", "created_at", "updated_at")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, email, name, "studentId", "created_at"
      `;
      const result = await db.query(createQuery, [
        student.email, hashedPassword, student.name, 'STUDENT', tenantId, student.studentId, student.phone, classId
      ]);
      createdStudents.push(result.rows[0]);
    }

    // No file cleanup needed - using memory storage

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

/**
 * Get current admin's school/tenant details
 * GET /api/admin/school
 */
const getMySchool = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Admin not associated with any school',
        },
      });
    }

    const tenantQuery = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM "User" u WHERE u."tenantId" = t.id) as "totalUsers",
        (SELECT COUNT(*) FROM "User" u WHERE u."tenantId" = t.id AND u.role = 'STUDENT') as "totalStudents",
        (SELECT COUNT(*) FROM "User" u WHERE u."tenantId" = t.id AND u.role = 'TEACHER') as "totalTeachers",
        (SELECT COUNT(*) FROM "Class" c WHERE c."tenantId" = t.id) as "totalClasses"
      FROM "Tenant" t
      WHERE t.id = $1
    `;

    const tenantResult = await db.query(tenantQuery, [tenantId]);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    const tenant = tenantResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...tenant,
        stats: {
          totalUsers: parseInt(tenant.totalUsers),
          totalStudents: parseInt(tenant.totalStudents),
          totalTeachers: parseInt(tenant.totalTeachers),
          totalClasses: parseInt(tenant.totalClasses),
        },
      },
    });
  } catch (error) {
    console.error('GetMySchool Error:', error);
    next(error);
  }
};

/**
 * Get all exams (PDF/Image based timetables) for admin's school
 * GET /api/admin/exams
 */
const getAllExams = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM "Exam"
      WHERE "tenant_id" = $1
    `;
    const countResult = await db.query(countQuery, [tenantId]);
    const total = parseInt(countResult.rows[0].total);

    // Get exams
    const examsQuery = `
      SELECT 
        e.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE e."tenant_id" = $1
      ORDER BY e."created_at" DESC
      LIMIT $2 OFFSET $3
    `;

    const examsResult = await db.query(examsQuery, [tenantId, take, skip]);

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
      class: item.class_id ? {
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
    console.error('Error in getAllExams (adminController):', error);
    next(error);
  }
};

/**
 * Get current admin's school statistics
 * GET /api/admin/school/stats
 */
const getMySchoolStats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Admin not associated with any school',
        },
      });
    }

    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM "User" WHERE "tenantId" = $1 AND role = 'STUDENT') as "totalStudents",
        (SELECT COUNT(*) FROM "User" WHERE "tenantId" = $1 AND role = 'TEACHER') as "totalTeachers",
        (SELECT COUNT(*) FROM "User" WHERE "tenantId" = $1 AND role = 'ADMIN') as "totalAdmins",
        (SELECT COUNT(*) FROM "Class" WHERE "tenantId" = $1) as "totalClasses",
        (SELECT COUNT(*) FROM "Homework" WHERE "tenantId" = $1) as "totalHomeworks",
        (SELECT COUNT(*) FROM "Mark" WHERE "tenantId" = $1) as "totalMarks",
        (SELECT COUNT(*) FROM "News" WHERE "tenantId" = $1) as "totalNews",
        (SELECT COUNT(*) FROM "Circular" WHERE "tenantId" = $1) as "totalCirculars",
        (SELECT COUNT(*) FROM "ExamSchedule" WHERE "tenantId" = $1) as "totalExamSchedules",
        (SELECT COUNT(*) FROM "Attendance" WHERE "tenantId" = $1) as "totalAttendance",
        (SELECT COUNT(*) FROM "Fee" WHERE "tenantId" = $1) as "totalFees"
    `;

    const statsResult = await db.query(statsQuery, [tenantId]);
    const stats = statsResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        totalStudents: parseInt(stats.totalStudents),
        totalTeachers: parseInt(stats.totalTeachers),
        totalAdmins: parseInt(stats.totalAdmins),
        totalClasses: parseInt(stats.totalClasses),
        totalHomeworks: parseInt(stats.totalHomeworks),
        totalMarks: parseInt(stats.totalMarks),
        totalNews: parseInt(stats.totalNews),
        totalCirculars: parseInt(stats.totalCirculars),
        totalExamSchedules: parseInt(stats.totalExamSchedules),
        totalAttendance: parseInt(stats.totalAttendance),
        totalFees: parseInt(stats.totalFees),
      },
    });
  } catch (error) {
    console.error('GetMySchoolStats Error:', error);
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
  resetClassPassword,
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
  createExamScheduleWithFile,
  updateExamSchedule,
  deleteExamSchedule,
  // Teacher
  getAvailableTeachers,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  // School/Tenant Info
  getMySchool,
  getMySchoolStats,
  // Exam (New Exam table - PDF/Image based timetables)
  getAllExams,
};
