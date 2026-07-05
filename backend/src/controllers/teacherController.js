/**
 * Teacher Controller
 * Handles all teacher-specific operations for managing their assigned class
 */

const db = require('../config/db');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');

/**
 * Get teacher's assigned class and related data
 * GET /api/teacher/my-class
 */
const getMyClass = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;

    // Find the class this teacher is assigned to
    const classQuery = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM "User" u WHERE u."classId" = c.id AND u.role = 'STUDENT') as "studentCount",
        (SELECT COUNT(*) FROM "Homework" h WHERE h."classId" = c.id) as "homeworkCount",
        (SELECT COUNT(*) FROM "ExamSchedule" es WHERE es."classId" = c.id) as "examScheduleCount"
      FROM "Class" c
      WHERE c."teacherId" = $1 AND c."tenantId" = $2
      LIMIT 1
    `;

    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      // Return 200 OK with empty data instead of 404
      // This indicates the route exists and teacher is authenticated,
      // but simply doesn't have a class assigned yet
      return res.status(200).json({
        success: true,
        data: {
          id: null,
          name: 'No Class Assigned',
          section: null,
          students: [],
          homeworks: [],
          examSchedules: [],
          _count: {
            students: 0,
            homeworks: 0,
            examSchedules: 0,
          },
        },
        message: 'No class assigned. Please contact your administrator.',
      });
    }

    const classData = classResult.rows[0];

    // Get students
    const studentsQuery = `
      SELECT id, name, email, "studentId", "createdAt"
      FROM "User"
      WHERE "classId" = $1 AND role = 'STUDENT'
      ORDER BY name ASC
    `;
    const studentsResult = await db.query(studentsQuery, [classData.id]);

    // Get recent homework
    const homeworksQuery = `
      SELECT h.*, u.id as "assignedById", u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "User" u ON h."assignedBy" = u.id
      WHERE h."classId" = $1
      ORDER BY h."createdAt" DESC
      LIMIT 10
    `;
    const homeworksResult = await db.query(homeworksQuery, [classData.id]);

    // Get upcoming exam schedules
    const examsQuery = `
      SELECT * FROM "ExamSchedule"
      WHERE "classId" = $1 AND date >= NOW()
      ORDER BY date ASC
      LIMIT 10
    `;
    const examsResult = await db.query(examsQuery, [classData.id]);

    res.status(200).json({
      success: true,
      data: {
        ...classData,
        _count: {
          students: parseInt(classData.studentCount),
          homeworks: parseInt(classData.homeworkCount),
          examSchedules: parseInt(classData.examScheduleCount),
        },
        students: studentsResult.rows,
        homeworks: homeworksResult.rows,
        examSchedules: examsResult.rows,
      },
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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
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

    // Get students
    const studentsQuery = `
      SELECT id, name, email, "studentId", "createdAt"
      FROM "User" u
      WHERE ${whereClause}
      ORDER BY u.name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const studentsParams = [...params, take, skip];
    const studentsResult = await db.query(studentsQuery, studentsParams);

    res.status(200).json({
      success: true,
      data: {
        students: studentsResult.rows,
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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Create homework
    const createQuery = `
      INSERT INTO "Homework" (title, description, subject, "classId", "tenantId", "assignedBy", "dueDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      title, description, subject, classId, tenantId, teacherId, dueDate ? new Date(dueDate) : null
    ]);

    const homework = createResult.rows[0];

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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Homework" WHERE "classId" = $1`;
    const countResult = await db.query(countQuery, [classId]);
    const total = parseInt(countResult.rows[0].total);

    // Get homework
    const homeworkQuery = `
      SELECT 
        h.*,
        c.id as "classId", c.name as "className", c.section as "classSection",
        u.id as "assignedById", u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "Class" c ON h."classId" = c.id
      LEFT JOIN "User" u ON h."assignedBy" = u.id
      WHERE h."classId" = $1
      ORDER BY h."createdAt" DESC
      LIMIT $2 OFFSET $3
    `;

    const homeworkResult = await db.query(homeworkQuery, [classId, take, skip]);

    const homeworks = homeworkResult.rows.map(hw => ({
      ...hw,
      class: {
        id: hw.classId,
        name: hw.className,
        section: hw.classSection,
      },
      assignedByUser: hw.assignedById ? {
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
    const { marksData } = req.body;

    if (!Array.isArray(marksData) || marksData.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Marks data is required',
        },
      });
    }

    // Find the teacher's class
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Validate all students belong to this class
    const studentIds = marksData.map(m => m.studentId);
    const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(',');
    const validStudentsQuery = `
      SELECT id FROM "User"
      WHERE id IN (${placeholders}) AND "classId" = $${studentIds.length + 1} AND role = $${studentIds.length + 2}
    `;
    const validStudentsResult = await db.query(validStudentsQuery, [...studentIds, classId, 'STUDENT']);

    if (validStudentsResult.rows.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Some students do not belong to your class',
        },
      });
    }

    // Create marks
    const createdMarks = [];
    for (const mark of marksData) {
      const percentage = (mark.marksObtained / mark.totalMarks) * 100;
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else if (percentage >= 40) grade = 'D';

      const createQuery = `
        INSERT INTO "Mark" ("studentId", subject, "marksObtained", "totalMarks", percentage, grade, "examType", "examDate", "tenantId", remarks, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;

      const result = await db.query(createQuery, [
        mark.studentId, mark.subject, mark.marksObtained, mark.totalMarks, percentage, grade,
        mark.examType, mark.examDate ? new Date(mark.examDate) : null, tenantId, mark.remarks || null
      ]);

      createdMarks.push(result.rows[0]);
    }

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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Verify the homework exists and belongs to the teacher's class
    const checkQuery = `SELECT * FROM "Homework" WHERE id = $1 AND "classId" = $2`;
    const checkResult = await db.query(checkQuery, [id, classId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found or you do not have permission to update it.',
        },
      });
    }

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
    if (isPublished !== undefined) {
      updateFields.push(`"isPublished" = $${paramIndex}`);
      updateParams.push(isPublished);
      paramIndex++;
    }
    if (dueDate !== undefined) {
      updateFields.push(`"dueDate" = $${paramIndex}`);
      updateParams.push(dueDate ? new Date(dueDate) : null);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "Homework"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Verify the homework exists and belongs to the teacher's class
    const checkQuery = `SELECT id FROM "Homework" WHERE id = $1 AND "classId" = $2`;
    const checkResult = await db.query(checkQuery, [id, classId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Homework not found or you do not have permission to delete it.',
        },
      });
    }

    // Delete homework
    await db.query('DELETE FROM "Homework" WHERE id = $1', [id]);

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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Verify the mark exists and get student info
    const markQuery = `
      SELECT m.*, u."classId" FROM "Mark" m
      JOIN "User" u ON m."studentId" = u.id
      WHERE m.id = $1 AND m."tenantId" = $2
    `;
    const markResult = await db.query(markQuery, [id, tenantId]);

    if (markResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found or you do not have permission to update it.',
        },
      });
    }

    const existingMark = markResult.rows[0];

    // Verify the student belongs to the teacher's class
    if (existingMark.classId !== classId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'This student does not belong to your class. Cannot update marks.',
        },
      });
    }

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (marksObtained !== undefined) {
      updateFields.push(`"marksObtained" = $${paramIndex}`);
      updateParams.push(marksObtained);
      paramIndex++;
    }
    if (totalMarks !== undefined) {
      updateFields.push(`"totalMarks" = $${paramIndex}`);
      updateParams.push(totalMarks);
      paramIndex++;
    }
    if (examType !== undefined) {
      updateFields.push(`"examType" = $${paramIndex}`);
      updateParams.push(examType);
      paramIndex++;
    }
    if (examDate !== undefined) {
      updateFields.push(`"examDate" = $${paramIndex}`);
      updateParams.push(examDate ? new Date(examDate) : null);
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

    // Recalculate percentage and grade if marks changed
    if (marksObtained !== undefined || totalMarks !== undefined) {
      const obtained = marksObtained !== undefined ? marksObtained : existingMark.marksObtained;
      const total = totalMarks !== undefined ? totalMarks : existingMark.totalMarks;
      const percentage = total > 0 ? (obtained / total) * 100 : 0;

      updateFields.push(`percentage = $${paramIndex}`);
      updateParams.push(percentage);
      paramIndex++;

      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else if (percentage >= 40) grade = 'D';

      updateFields.push(`grade = $${paramIndex}`);
      updateParams.push(grade);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "Mark"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Verify the mark exists and the student belongs to the teacher's class
    const markQuery = `
      SELECT m.id, u."classId" FROM "Mark" m
      JOIN "User" u ON m."studentId" = u.id
      WHERE m.id = $1 AND m."tenantId" = $2
    `;
    const markResult = await db.query(markQuery, [id, tenantId]);

    if (markResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found or you do not have permission to delete it.',
        },
      });
    }

    const mark = markResult.rows[0];

    // Verify the student belongs to the teacher's class
    if (mark.classId !== classId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'This student does not belong to your class. Cannot delete marks.',
        },
      });
    }

    // Delete mark
    await db.query('DELETE FROM "Mark" WHERE id = $1', [id]);

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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;

    // Verify the student exists and belongs to the teacher's class
    const studentCheckQuery = `
      SELECT * FROM "User" WHERE id = $1 AND "classId" = $2 AND role = $3
    `;
    const studentCheckResult = await db.query(studentCheckQuery, [id, classId, 'STUDENT']);

    if (studentCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found in your class or you do not have permission to update them.',
        },
      });
    }

    const existingStudent = studentCheckResult.rows[0];

    // Check for duplicate email if email is being updated
    if (email && email !== existingStudent.email) {
      const emailCheckQuery = 'SELECT id FROM "User" WHERE email = $1';
      const emailCheckResult = await db.query(emailCheckQuery, [email]);
      if (emailCheckResult.rows.length > 0) {
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
    }

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(name);
      paramIndex++;
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateParams.push(email);
      paramIndex++;
    }
    if (studentId !== undefined) {
      updateFields.push(`"studentId" = $${paramIndex}`);
      updateParams.push(studentId);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateFields.push(`"updatedAt" = NOW()`);
    updateParams.push(id);

    const updateQuery = `
      UPDATE "User"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.query(updateQuery, updateParams);

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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No class assigned. Please contact your administrator.',
        },
      });
    }

    const classId = classResult.rows[0].id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get student IDs in this class
    const studentIdsQuery = `
      SELECT id FROM "User" WHERE "classId" = $1 AND role = $2
    `;
    const studentIdsResult = await db.query(studentIdsQuery, [classId, 'STUDENT']);
    const studentIds = studentIdsResult.rows.map(s => s.id);

    if (studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { marks: [], pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 } },
      });
    }

    // Build where clause
    let whereClause = `m."tenantId" = $1 AND m."studentId" IN (${studentIds.map((_, i) => `$${i + 2}`).join(',')})`;
    let params = [tenantId, ...studentIds];
    let paramIndex = studentIds.length + 2;

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
        u.id as "studentId", u.name as "studentName", u."studentId" as "studentRollNumber"
      FROM "Mark" m
      JOIN "User" u ON m."studentId" = u.id
      WHERE ${whereClause}
      ORDER BY m."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const marksParams = [...params, take, skip];
    const marksResult = await db.query(marksQuery, marksParams);

    const marks = marksResult.rows.map(mark => ({
      ...mark,
      student: {
        id: mark.studentId,
        name: mark.studentName,
        studentId: mark.studentRollNumber,
      },
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
    console.error('GetMarks Error:', error);
    next(error);
  }
};

/**
 * Create a student manually for teacher's class
 * POST /api/teacher/students/manual
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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. You can only create students in your assigned class.' },
      });
    }

    const classId = classResult.rows[0].id;

    // Check for existing email
    const emailCheckQuery = 'SELECT id FROM "User" WHERE email = $1';
    const emailCheckResult = await db.query(emailCheckQuery, [email.trim().toLowerCase()]);

    if (emailCheckResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email already exists. Please use a different email.' },
      });
    }

    // Check for existing studentId
    const studentIdCheckQuery = 'SELECT id FROM "User" WHERE "studentId" = $1';
    const studentIdCheckResult = await db.query(studentIdCheckQuery, [String(studentId).trim()]);

    if (studentIdCheckResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { message: 'Student ID already exists. Please use a unique ID.' },
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password || 'Student@123', saltRounds);

    // Create the student
    const createQuery = `
      INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", phone, "classId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, email, name, "studentId", phone, "createdAt"
    `;

    const createResult = await db.query(createQuery, [
      email.trim().toLowerCase(), hashedPassword, name.trim(), 'STUDENT', tenantId,
      String(studentId).trim(), phone ? String(phone).trim() : null, classId
    ]);

    res.status(201).json({
      success: true,
      data: createResult.rows[0],
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
    const classQuery = `
      SELECT id FROM "Class" WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned. You can only upload students to your assigned class.' },
      });
    }

    const classId = classResult.rows[0].id;

    // Parse CSV file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

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

    const existingEmailsQuery = `SELECT email FROM "User" WHERE email = ANY($1)`;
    const existingEmailsResult = await db.query(existingEmailsQuery, [emails]);
    const existingEmailSet = new Set(existingEmailsResult.rows.map(e => e.email));

    const existingStudentIdsQuery = `SELECT "studentId" FROM "User" WHERE "studentId" = ANY($1) AND "tenantId" = $2`;
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

    // Create students
    const createdStudents = [];
    for (const student of finalStudents) {
      const hashedPassword = await bcrypt.hash(student.password, saltRounds);
      const createQuery = `
        INSERT INTO "User" (email, password, name, role, "tenantId", "studentId", phone, "classId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, email, name, "studentId", "createdAt"
      `;
      const result = await db.query(createQuery, [
        student.email, hashedPassword, student.name, 'STUDENT', tenantId,
        student.studentId, student.phone, classId
      ]);
      createdStudents.push(result.rows[0]);
    }

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
    console.error('BulkUploadStudents Error:', error);
    next(error);
  }
};

module.exports = {
  getMyClass,
  getMyStudents,
  createHomework,
  getHomework,
  createMarks,
  updateHomework,
  deleteHomework,
  updateMark,
  deleteMark,
  updateStudent,
  getMarks,
  createStudentManual,
  bulkUploadStudents,
};