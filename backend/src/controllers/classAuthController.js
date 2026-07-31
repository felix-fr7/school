/**
 * Class Authentication Controller
 * Handles class-based login system where classes login with class_code and password
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Class Login
 * POST /api/auth/class-login
 * @body { classCode, password }
 */
const classLogin = async (req, res, next) => {
  try {
    const { classCode, password } = req.body;

    // Validation
    if (!classCode || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Class code and password are required',
        },
      });
    }

    // Find class by class_code
    const classQuery = `
      SELECT 
        c.*,
        t.name as "teacherName",
        t.email as "teacherEmail"
      FROM "Class" c
      LEFT JOIN "TeacherDirectory" t ON c.id = t."assignedClassId"
      WHERE c."class_code" = $1
      LIMIT 1
    `;
    
    const classResult = await db.query(classQuery, [classCode.toUpperCase()]);

    if (classResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class code or password',
        },
      });
    }

    const classData = classResult.rows[0];

    // Check if password is set
    if (!classData.password) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Class password not set. Please contact your administrator.',
        },
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, classData.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class code or password',
        },
      });
    }

    // Get class statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM "User" WHERE "classId" = $1 AND role = 'STUDENT') as "studentCount",
        (SELECT COUNT(*) FROM "Homework" WHERE "class_id" = $1) as "homeworkCount",
        (SELECT COUNT(*) FROM "ExamSchedule" WHERE "classId" = $1 AND "isPublished" = true) as "examCount"
    `;
    const statsResult = await db.query(statsQuery, [classData.id]);
    const stats = statsResult.rows[0];

    // Create JWT token with class context
    const token = jwt.sign(
      {
        classId: classData.id,
        classCode: classData.class_code,
        tenantId: classData.tenantId,
        type: 'CLASS', // Distinguish from user tokens
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return class dashboard data
    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData.id,
          classCode: classData.class_code,
          name: classData.name,
          section: classData.section,
          teacher: classData.teacherName ? {
            name: classData.teacherName,
            email: classData.teacherEmail,
          } : null,
          studentCount: parseInt(stats.studentCount),
          homeworkCount: parseInt(stats.homeworkCount),
          examCount: parseInt(stats.examCount),
        },
        token,
      },
      message: 'Class login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Class Dashboard Data
 * GET /api/class/dashboard
 * Protected route for logged-in classes
 */
const getClassDashboard = async (req, res, next) => {
  try {
    // classId comes from the JWT token (set by classLogin middleware)
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

    if (!classId) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid class session',
        },
      });
    }

    // Get class details
    const classQuery = `
      SELECT 
        c.*,
        t.name as "teacherName",
        t.email as "teacherEmail",
        t.phone as "teacherPhone",
        t.qualification,
        t.subject_specialization as "subjectSpecialization"
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

    // Get students in this class
    const studentsQuery = `
      SELECT id, name, email, "studentId", "created_at"
      FROM "User"
      WHERE "classId" = $1 AND role = 'STUDENT'
      ORDER BY name ASC
    `;
    const studentsResult = await db.query(studentsQuery, [classId]);

    // Get recent homework
    const homeworkQuery = `
      SELECT 
        h.*,
        u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "User" u ON h."assigned_by" = u.id
      WHERE h."class_id" = $1 AND h."is_published" = true
      ORDER BY h."created_at" DESC
      LIMIT 10
    `;
    const homeworkResult = await db.query(homeworkQuery, [classId]);

    // Get upcoming exams
    const examsQuery = `
      SELECT * FROM "ExamSchedule"
      WHERE "classId" = $1 AND "isPublished" = true AND date >= NOW()
      ORDER BY date ASC, time ASC
      LIMIT 10
    `;
    const examsResult = await db.query(examsQuery, [classId]);

    // Get recent news/announcements
    const newsQuery = `
      SELECT 
        n.*,
        u.name as "postedByName"
      FROM "News" n
      LEFT JOIN "User" u ON n."postedBy" = u.id
      WHERE n."tenantId" = $1 AND n."isPublished" = true
      ORDER BY n."created_at" DESC
      LIMIT 5
    `;
    const newsResult = await db.query(newsQuery, [tenantId]);

    // Get recent circulars
    const circularsQuery = `
      SELECT * FROM "Circular"
      WHERE "tenantId" = $1 AND "isPublished" = true
      ORDER BY "created_at" DESC
      LIMIT 5
    `;
    const circularsResult = await db.query(circularsQuery, [tenantId]);

    // Get weekly lessons
    const weeklyLessonsQuery = `
      SELECT 
        w.*,
        (SELECT json_agg(json_build_object('day', d.day, 'lessons', d.lessons))
         FROM (
           SELECT 
             wl."weekday" as day,
             json_agg(json_build_object(
               'subject', wl.subject,
               'classwork', wl."classworkText",
               'homework', wl."homeworkText"
             )) as lessons
           FROM "WeeklyLessonLog" wl
           WHERE wl."classId" = $1
           GROUP BY wl."weekday"
           ORDER BY wl."weekday"
         ) d
        ) as weeklySchedule
      FROM "WeeklyLessonLog" w
      WHERE w."classId" = $1
      LIMIT 1
    `;
    const weeklyLessonsResult = await db.query(weeklyLessonsQuery, [classId]);

    res.status(200).json({
      success: true,
      data: {
        class: {
          id: classData.id,
          classCode: classData.class_code,
          name: classData.name,
          section: classData.section,
          teacher: classData.teacherName ? {
            name: classData.teacherName,
            email: classData.teacherEmail,
            phone: classData.teacherPhone,
            qualification: classData.qualification,
            subjectSpecialization: classData.subjectSpecialization,
          } : null,
        },
        students: studentsResult.rows,
        homework: homeworkResult.rows,
        exams: examsResult.rows,
        news: newsResult.rows,
        circulars: circularsResult.rows,
        weeklyLessons: weeklyLessonsResult.rows.length > 0 ? weeklyLessonsResult.rows[0].weeklySchedule : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  classLogin,
  getClassDashboard,
};