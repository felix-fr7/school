/**
 * Student Controller
 * Handles all student-specific operations
 */

const db = require('../config/db');

/**
 * Get student dashboard statistics
 * GET /api/student/dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const classId = req.user.classId;

    // Get counts using subqueries (Students only see 'ALL' visibility for News/Circulars)
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM "Homework" WHERE "classId" = $1 AND "isPublished" = true) as "totalHomework",
        (SELECT COUNT(*) FROM "Mark" WHERE "studentId" = $2 AND "isPublished" = true) as "totalMarks",
        (SELECT COUNT(*) FROM "News" WHERE "tenantId" = $3 AND "isPublished" = true AND visibility = 'ALL') as "totalNews",
        (SELECT COUNT(*) FROM "Circular" WHERE "tenantId" = $4 AND "isPublished" = true AND visibility = 'ALL') as "totalCirculars",
        (SELECT COUNT(*) FROM "ExamSchedule" WHERE ("classId" = $5 OR "classId" IS NULL) AND "isPublished" = true AND date >= NOW()) as "upcomingExams"
    `;

    const statsResult = await db.query(statsQuery, [classId, studentId, tenantId, tenantId, classId]);
    const stats = statsResult.rows[0];

    // Get recent homework
    let recentHomework = [];
    if (classId) {
      const homeworkQuery = `
        SELECT h.*, c.name as "className", c.section as "classSection"
        FROM "Homework" h
        LEFT JOIN "Class" c ON h."classId" = c.id
        WHERE h."classId" = $1 AND h."isPublished" = true
        ORDER BY h."created_at" DESC
        LIMIT 3
      `;
      const homeworkResult = await db.query(homeworkQuery, [classId]);
      recentHomework = homeworkResult.rows;
    }

    // Get recent news (Students only see 'ALL' visibility)
    const newsQuery = `
      SELECT * FROM "News"
      WHERE "tenantId" = $1 AND "isPublished" = true AND visibility = 'ALL'
      ORDER BY "created_at" DESC
      LIMIT 3
    `;
    const newsResult = await db.query(newsQuery, [tenantId]);
    const recentNews = newsResult.rows;

    // Get upcoming exams
    let upcomingExamList = [];
    if (classId) {
      const examsQuery = `
        SELECT es.*, c.id as "classId", c.name as "className", c.section as "classSection"
        FROM "ExamSchedule" es
        LEFT JOIN "Class" c ON es."classId" = c.id
        WHERE (es."classId" = $1 OR es."classId" IS NULL) AND es."isPublished" = true AND es.date >= NOW()
        ORDER BY es.date ASC
        LIMIT 3
      `;
      const examsResult = await db.query(examsQuery, [classId]);
      upcomingExamList = examsResult.rows.map(item => ({
        ...item,
        class: item.classId ? {
          id: item.classId,
          name: item.className,
          section: item.classSection,
        } : null
      }));
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalHomework: parseInt(stats.totalHomework),
          totalMarks: parseInt(stats.totalMarks),
          totalNews: parseInt(stats.totalNews),
          totalCirculars: parseInt(stats.totalCirculars),
          upcomingExams: parseInt(stats.upcomingExams),
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

    // Build where clause
    let whereClause = 'h."class_id" = $1 AND h."is_published" = true';
    let params = [classId];
    let paramIndex = 2;

    if (subject) {
      params.push(subject);
      whereClause += ` AND h.subject = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Homework" h WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get homework
    const homeworkQuery = `
      SELECT 
        h.*,
        c.id as "classId", c.name as "className", c.section as "classSection",
        u.id as "assignedById", u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "Class" c ON h."class_id" = c.id
      LEFT JOIN "User" u ON h."assigned_by" = u.id
      WHERE ${whereClause}
      ORDER BY h."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const homeworkParams = [...params, take, skip];
    const homeworkResult = await db.query(homeworkQuery, homeworkParams);

    const homeworks = homeworkResult.rows.map(hw => ({
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
 * Get single homework details
 * GET /api/student/homework/:id
 */
const getHomeworkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classId = req.user.classId;

    const homeworkQuery = `
      SELECT 
        h.*,
        c.id as "classId", c.name as "className", c.section as "classSection",
        u.id as "assignedById", u.name as "assignedByName"
      FROM "Homework" h
      LEFT JOIN "Class" c ON h."class_id" = c.id
      LEFT JOIN "User" u ON h."assigned_by" = u.id
      WHERE h.id = $1 AND h."class_id" = $2 AND h."is_published" = true
    `;

    const homeworkResult = await db.query(homeworkQuery, [id, classId]);

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
      },
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

    // Build where clause
    let whereClause = 'm."studentId" = $1 AND m."isPublished" = true';
    let params = [studentId];
    let paramIndex = 2;

    if (subject) {
      params.push(subject);
      whereClause += ` AND m.subject = $${paramIndex}`;
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
      SELECT * FROM "Mark"
      WHERE ${whereClause}
      ORDER BY "created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const marksParams = [...params, take, skip];
    const marksResult = await db.query(marksQuery, marksParams);
    const marks = marksResult.rows;

    // Calculate overall statistics
    const totalMarksObtained = marks.reduce((sum, m) => sum + parseFloat(m.marksObtained), 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + parseFloat(m.totalMarks), 0);
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

    const markQuery = `
      SELECT * FROM "Mark"
      WHERE id = $1 AND "studentId" = $2 AND "isPublished" = true
    `;

    const markResult = await db.query(markQuery, [id, studentId]);

    if (markResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Mark entry not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: markResult.rows[0],
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

    // Build where clause (Students only see 'ALL' visibility)
    let whereClause = 'n."tenantId" = $1 AND n."isPublished" = true AND n.visibility = $2';
    let params = [tenantId, 'ALL'];
    let paramIndex = 3;

    if (category) {
      params.push(category);
      whereClause += ` AND n.category = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "News" n WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get news
    const newsQuery = `
      SELECT n.*, u.id as "postedById", u.name as "postedByName"
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
 * Get single news details
 * GET /api/student/news/:id
 */
const getNewsById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Students only see 'ALL' visibility news
    const newsQuery = `
      SELECT n.*, u.id as "postedById", u.name as "postedByName"
      FROM "News" n
      LEFT JOIN "User" u ON n."postedBy" = u.id
      WHERE n.id = $1 AND n."tenantId" = $2 AND n."isPublished" = true AND n.visibility = 'ALL'
    `;

    const newsResult = await db.query(newsQuery, [id, tenantId]);

    if (newsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'News not found',
        },
      });
    }

    const news = newsResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...news,
        postedByUser: news.postedById ? {
          id: news.postedById,
          name: news.postedByName,
        } : null,
      },
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

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM "Circular"
      WHERE "tenantId" = $1 AND "isPublished" = true
    `;
    const countResult = await db.query(countQuery, [tenantId]);
    const total = parseInt(countResult.rows[0].total);

    // Get circulars
    // Students only see 'ALL' visibility circulars
    const circularsQuery = `
      SELECT c.*, u.id as "issuedById", u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE c."tenantId" = $1 AND c."isPublished" = true AND c.visibility = 'ALL'
      ORDER BY c."issueDate" DESC
      LIMIT $2 OFFSET $3
    `;

    const circularsResult = await db.query(circularsQuery, [tenantId, take, skip]);

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
 * Get single circular details
 * GET /api/student/circulars/:id
 */
const getCircularById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    // Students only see 'ALL' visibility circulars
    const circularQuery = `
      SELECT c.*, u.id as "issuedById", u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE c.id = $1 AND c."tenantId" = $2 AND c."isPublished" = true AND c.visibility = 'ALL'
    `;

    const circularResult = await db.query(circularQuery, [id, tenantId]);

    if (circularResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Circular not found',
        },
      });
    }

    const circular = circularResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...circular,
        issuedByUser: circular.issuedById ? {
          id: circular.issuedById,
          name: circular.issuedByName,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all exam schedules for student's class (Legacy ExamSchedule table)
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

    // Get total count - include both class-specific AND global (NULL class_id) exams
    const countQuery = `
      SELECT COUNT(*) as total FROM "ExamSchedule"
      WHERE ("classId" = $1 OR "classId" IS NULL) AND "isPublished" = true
    `;
    const countResult = await db.query(countQuery, [classId]);
    const total = parseInt(countResult.rows[0].total);

    // Get exam schedules - include global exams (class_id IS NULL)
    const examsQuery = `
      SELECT es.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "ExamSchedule" es
      LEFT JOIN "Class" c ON es."classId" = c.id
      WHERE (es."classId" = $1 OR es."classId" IS NULL) AND es."isPublished" = true
      ORDER BY es.date ASC
      LIMIT $2 OFFSET $3
    `;

    const examsResult = await db.query(examsQuery, [classId, take, skip]);

    const examSchedules = examsResult.rows.map(item => ({
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
 * Get single exam schedule details (Legacy ExamSchedule table)
 * GET /api/student/exam-schedules/:id
 */
const getExamScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classId = req.user.classId;

    const examQuery = `
      SELECT es.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "ExamSchedule" es
      LEFT JOIN "Class" c ON es."classId" = c.id
      WHERE es.id = $1 AND (es."classId" = $2 OR es."classId" IS NULL) AND es."isPublished" = true
    `;

    const examResult = await db.query(examQuery, [id, classId]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam schedule not found',
        },
      });
    }

    const exam = examResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...exam,
        class: exam.classId ? {
          id: exam.classId,
          name: exam.className,
          section: exam.classSection,
        } : null,
      },
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
 * Get all exams for student's class (New Exam table with PDF/Image support)
 * GET /api/student/exams
 * Simplified: Fetches all published exams for the tenant
 */
const getExams = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get total count - fetch all published exams
    const countQuery = `
      SELECT COUNT(*) as total FROM "Exam"
      WHERE "is_published" = true
    `;
    const countResult = await db.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    // Get exams - fetch all published exams, ordered by creation date
    const examsQuery = `
      SELECT 
        e.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE e."is_published" = true
      ORDER BY e."created_at" DESC
      LIMIT $1 OFFSET $2
    `;

    const examsResult = await db.query(examsQuery, [take, skip]);

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
    console.error('Error in getExams (studentController):', error);
    next(error);
  }
};

/**
 * Get single exam details (New Exam table with PDF/Image support)
 * GET /api/student/exams/:id
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classId = req.user.classId;
    const tenantId = req.user.tenantId;

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
    console.error('Error in getExamById (studentController):', error);
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

    const studentQuery = `
      SELECT 
        u.*,
        c.id as "classId", c.name as "className", c.section as "classSection",
        t.id as "tenantId", t.name as "tenantName", t.code as "tenantCode"
      FROM "User" u
      LEFT JOIN "Class" c ON u."classId" = c.id
      LEFT JOIN "Tenant" t ON u."tenantId" = t.id
      WHERE u.id = $1
    `;

    const studentResult = await db.query(studentQuery, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Student not found',
        },
      });
    }

    const student = studentResult.rows[0];
    const { password, ...studentWithoutPassword } = student;

    res.status(200).json({
      success: true,
      data: {
        ...studentWithoutPassword,
        class: student.classId ? {
          id: student.classId,
          name: student.className,
          section: student.classSection,
        } : null,
        tenant: student.tenantId ? {
          id: student.tenantId,
          name: student.tenantName,
          code: student.tenantCode,
        } : null,
      },
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

    // Get basic stats (Students only see 'ALL' visibility for News/Circulars)
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM "Homework" WHERE "classId" = $1 AND "isPublished" = true) as "totalHomework",
        (SELECT COUNT(*) FROM "Mark" WHERE "studentId" = $2 AND "isPublished" = true) as "totalMarks",
        (SELECT COUNT(*) FROM "News" WHERE "tenantId" = $3 AND "isPublished" = true AND visibility = 'ALL') as "totalNews",
        (SELECT COUNT(*) FROM "Circular" WHERE "tenantId" = $4 AND "isPublished" = true AND visibility = 'ALL') as "totalCirculars",
        (SELECT COUNT(*) FROM "ExamSchedule" WHERE "classId" = $5 AND "isPublished" = true AND date >= NOW()) as "upcomingExams"
    `;

    const statsResult = await db.query(statsQuery, [classId, studentId, tenantId, tenantId, classId]);
    const stats = statsResult.rows[0];

    // Get attendance stats
    const attendanceQuery = `
      SELECT status FROM "Attendance"
      WHERE "studentId" = $1 AND "tenantId" = $2
    `;
    const attendanceResult = await db.query(attendanceQuery, [studentId, tenantId]);
    const attendance = attendanceResult.rows;

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    // Get fee data
    const feeQuery = `
      SELECT "totalAmount", "paidAmount", "balanceAmount", status, "dueDate"
      FROM "Fee"
      WHERE "studentId" = $1 AND "tenantId" = $2
      LIMIT 1
    `;
    const feeResult = await db.query(feeQuery, [studentId, tenantId]);
    const fee = feeResult.rows.length > 0 ? feeResult.rows[0] : null;

    // Get recent homework
    let recentHomework = [];
    if (classId) {
      const homeworkQuery = `
        SELECT * FROM "Homework"
        WHERE "classId" = $1 AND "isPublished" = true
        ORDER BY "created_at" DESC
        LIMIT 3
      `;
      const homeworkResult = await db.query(homeworkQuery, [classId]);
      recentHomework = homeworkResult.rows;
    }

    // Get recent news (Students only see 'ALL' visibility)
    const newsQuery = `
      SELECT * FROM "News"
      WHERE "tenantId" = $1 AND "isPublished" = true AND visibility = 'ALL'
      ORDER BY "created_at" DESC
      LIMIT 3
    `;
    const newsResult = await db.query(newsQuery, [tenantId]);
    const recentNews = newsResult.rows;

    // Get upcoming exams
    let upcomingExamList = [];
    if (classId) {
      const examsQuery = `
        SELECT * FROM "ExamSchedule"
        WHERE "classId" = $1 AND "isPublished" = true AND date >= NOW()
        ORDER BY date ASC
        LIMIT 3
      `;
      const examsResult = await db.query(examsQuery, [classId]);
      upcomingExamList = examsResult.rows;
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalHomework: parseInt(stats.totalHomework),
          totalMarks: parseInt(stats.totalMarks),
          totalNews: parseInt(stats.totalNews),
          totalCirculars: parseInt(stats.totalCirculars),
          upcomingExams: parseInt(stats.upcomingExams),
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

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(name);
      paramIndex++;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateParams.push(phone);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update' },
      });
    }

    updateFields.push(`"updated_at" = NOW()`);
    updateParams.push(studentId);

    const updateQuery = `
      UPDATE "User"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, phone, "studentId", "created_at", "updated_at"
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
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
  // New Exam table endpoints (PDF/Image based timetables)
  getExams,
  getExamById,
  getProfile,
  updateProfile,
};
