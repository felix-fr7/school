/**
 * Content Controller
 * Handles read-only access to News, Circulars, and Exams for Students and Teachers
 * Implements role-based visibility filtering
 */

const db = require('../config/db');

/**
 * Get all news with visibility filtering based on user role AND class isolation
 * - Students: See school-wide news (class_id IS NULL) + their class's specific news with visibility='ALL'
 * - Teachers: See school-wide news + their class's specific news (including TEACHERS_ONLY)
 * - Admins: See all news (no class filtering)
 */
const getNews = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userClassId = req.user.classId;
    const { category, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause with proper tenant and class isolation
    let whereClause = `n."tenantId" = $1 AND n."isPublished" = true`;
    let params = [tenantId];
    let paramIndex = 2;

    // Apply visibility filtering for students - they only see 'ALL' visibility content
    if (userRole === 'STUDENT') {
      whereClause += ` AND (n."visibility" IS NULL OR n."visibility" = 'ALL')`;
    }
    // Teachers and Class Controllers see all visibility levels

    // Apply class-based isolation for students, teachers, and class controllers
    // Class controllers (CLS-X login) always have a classId and should see class-specific content
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      // Students, Teachers, and Class Controllers see school-wide news + their class's specific news only
      params.push(userClassId);
      whereClause += ` AND (n."class_id" IS NULL OR n."class_id" = $${paramIndex})`;
      paramIndex++;
    }
    // Admins see all news (no class filtering)

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
 * Get single news with visibility filtering AND class-based access control
 */
const getNewsById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userClassId = req.user.classId;

    // Build where clause with tenant, publication, and class isolation
    let whereClause = `n.id = $1 AND n."tenantId" = $2 AND n."isPublished" = true`;
    let params = [id, tenantId];
    let paramIndex = 3;

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      params.push(userClassId);
      whereClause += ` AND (n."class_id" IS NULL OR n."class_id" = $${paramIndex})`;
      paramIndex++;
    }
    // Admins can access any news (no class filtering)

    const newsQuery = `
      SELECT n.*, u.id as "postedById", u.name as "postedByName"
      FROM "News" n
      LEFT JOIN "User" u ON n."postedBy" = u.id
      WHERE ${whereClause}
    `;

    const newsResult = await db.query(newsQuery, params);

    if (newsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'News not found or access denied',
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
 * Get all circulars with visibility filtering based on user role AND class isolation
 * - Students: See school-wide circulars (class_id IS NULL) + their class's specific circulars with visibility='ALL'
 * - Teachers: See school-wide circulars + their class's specific circulars (including TEACHERS_ONLY)
 * - Admins: See all circulars (no class filtering)
 */
const getCirculars = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userClassId = req.user.classId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause with proper tenant and class isolation
    let whereClause = `c."tenantId" = $1 AND c."isPublished" = true`;
    let params = [tenantId];
    let paramIndex = 2;

    // Apply visibility filtering for students - they only see 'ALL' visibility content
    // Students should NOT see class-specific content (visibility = 'TEACHERS_ONLY')
    if (userRole === 'STUDENT') {
      // Strict filtering: Students only see content explicitly marked as 'ALL' or legacy NULL content
      whereClause += ` AND (c."visibility" = 'ALL' OR c."visibility" IS NULL)`;
    }
    // Teachers and Class Controllers see all visibility levels

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      // Students, Teachers, and Class Controllers see school-wide circulars + their class's specific circulars only
      params.push(userClassId);
      whereClause += ` AND (c."class_id" IS NULL OR c."class_id" = $${paramIndex})`;
      paramIndex++;
    }
    // Admins see all circulars (no class filtering)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM "Circular" c WHERE ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get circulars
    const circularsQuery = `
      SELECT c.*, u.id as "issuedById", u.name as "issuedByName"
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
 * Get single circular with visibility filtering AND class-based access control
 */
const getCircularById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userClassId = req.user.classId;

    // Build where clause with tenant, publication, and class isolation
    let whereClause = `c.id = $1 AND c."tenantId" = $2 AND c."isPublished" = true`;
    let params = [id, tenantId];
    let paramIndex = 3;

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      params.push(userClassId);
      whereClause += ` AND (c."class_id" IS NULL OR c."class_id" = $${paramIndex})`;
      paramIndex++;
    }
    // Admins can access any circular (no class filtering)

    const circularQuery = `
      SELECT c.*, u.id as "issuedById", u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE ${whereClause}
    `;

    const circularResult = await db.query(circularQuery, params);

    if (circularResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Circular not found or access denied',
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
 * Get all exams with visibility filtering based on user role AND class isolation
 * - Students: See school-wide exams + their class's specific exams with visibility='ALL'
 * - Teachers: See school-wide exams + their class's specific exams (including TEACHERS_ONLY)
 * - Admins: See all exams (no class filtering)
 */
// Helper to map DB row to API response model
const mapExamRow = (row) => {
  if (!row) return null;
  const examName = row.title || row.examName || row.name || 'Exam Timetable';
  const fileUrl = row.file_url || row.pdfUrl || row.imageUrl;
  return {
    id: row.id,
    title: examName,
    examName: examName, // backward compatibility
    classId: row.class_id,
    tenantId: row.tenant_id,
    fileUrl: fileUrl,
    pdfUrl: fileUrl, // fallback
    imageUrl: fileUrl, // fallback
    dueDate: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    class: row.classId ? {
      id: row.classId,
      name: row.className,
      section: row.classSection,
    } : null,
  };
};

const getExams = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userClassId = req.user.classId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause with proper isolation
    // Students, teachers, and class controllers only see: school-wide (class_id IS NULL) OR their class's content
    let whereClause = 'e."tenant_id" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      // Students, Teachers, and Class Controllers see school-wide exams + their class's specific exams
      params.push(userClassId);
      whereClause += ` AND (e."class_id" IS NULL OR e."class_id" = $${paramIndex})`;
      paramIndex++;
    }
    // Admins see all exams (no class filtering)

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Exam" e WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get exams
    const examsQuery = `
      SELECT e.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE ${whereClause}
      ORDER BY e."created_at" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const examsParams = [...params, take, skip];
    const examsResult = await db.query(examsQuery, examsParams);

    const exams = examsResult.rows.map(mapExamRow);

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
    next(error);
  }
};

/**
 * Get single exam
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const examQuery = `
      SELECT e.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE e.id = $1 AND e."tenant_id" = $2
    `;

    const examResult = await db.query(examQuery, [id, tenantId]);

    if (examResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found',
        },
      });
    }

    const exam = mapExamRow(examResult.rows[0]);

    res.status(200).json({
      success: true,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam schedules (legacy ExamSchedule table)
 */
const getExamSchedules = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // For students, filter by their class
    let whereClause = 'es."tenantId" = $1 AND es."isPublished" = true';
    let params = [tenantId];
    let paramIndex = 2;

    if (userRole === 'student' && req.user.classId) {
      params.push(req.user.classId);
      whereClause += ` AND es."classId" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "ExamSchedule" es WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get exam schedules
    const examsQuery = `
      SELECT es.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "ExamSchedule" es
      LEFT JOIN "Class" c ON es."classId" = c.id
      WHERE ${whereClause}
      ORDER BY es.date ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const examsParams = [...params, take, skip];
    const examsResult = await db.query(examsQuery, examsParams);

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
 * Get single exam schedule
 */
const getExamScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const examQuery = `
      SELECT es.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "ExamSchedule" es
      LEFT JOIN "Class" c ON es."classId" = c.id
      WHERE es.id = $1 AND es."tenantId" = $2 AND es."isPublished" = true
    `;

    const examResult = await db.query(examQuery, [id, tenantId]);

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

module.exports = {
  getNews,
  getNewsById,
  getCirculars,
  getCircularById,
  getExams,
  getExamById,
  getExamSchedules,
  getExamScheduleById,
};