/**
 * Content Controller
 * Handles read-only access to News, Circulars, and Exams for Students and Teachers
 * Implements role-based visibility filtering
 */

const db = require('../config/db');

/**
 * Get all news with visibility filtering based on user role
 * Students see only 'ALL', Teachers see 'ALL' and 'TEACHERS_ONLY'
 */
const getNews = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const { category, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build visibility filter based on role
    let visibilityFilter = '';
    if (userRole === 'student') {
      visibilityFilter = "AND n.visibility = 'ALL'";
    } else if (userRole === 'teacher') {
      visibilityFilter = "AND n.visibility IN ('ALL', 'TEACHERS_ONLY')";
    }
    // Admins see all (no filter)

    // Build where clause
    let whereClause = `n."tenantId" = $1 AND n."isPublished" = true ${visibilityFilter}`;
    let params = [tenantId];
    let paramIndex = 2;

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
      ORDER BY n."createdAt" DESC
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
 * Get single news with visibility filtering
 */
const getNewsById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;

    // Build visibility filter based on role
    let visibilityFilter = '';
    if (userRole === 'student') {
      visibilityFilter = "AND n.visibility = 'ALL'";
    } else if (userRole === 'teacher') {
      visibilityFilter = "AND n.visibility IN ('ALL', 'TEACHERS_ONLY')";
    }

    const newsQuery = `
      SELECT n.*, u.id as "postedById", u.name as "postedByName"
      FROM "News" n
      LEFT JOIN "User" u ON n."postedBy" = u.id
      WHERE n.id = $1 AND n."tenantId" = $2 AND n."isPublished" = true ${visibilityFilter}
    `;

    const newsResult = await db.query(newsQuery, [id, tenantId]);

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
 * Get all circulars with visibility filtering based on user role
 */
const getCirculars = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build visibility filter based on role
    let visibilityFilter = '';
    if (userRole === 'student') {
      visibilityFilter = "AND c.visibility = 'ALL'";
    } else if (userRole === 'teacher') {
      visibilityFilter = "AND c.visibility IN ('ALL', 'TEACHERS_ONLY')";
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM "Circular"
      WHERE "tenantId" = $1 AND "isPublished" = true ${visibilityFilter}
    `;
    const countResult = await db.query(countQuery, [tenantId]);
    const total = parseInt(countResult.rows[0].total);

    // Get circulars
    const circularsQuery = `
      SELECT c.*, u.id as "issuedById", u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE c."tenantId" = $1 AND c."isPublished" = true ${visibilityFilter}
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
 * Get single circular with visibility filtering
 */
const getCircularById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;

    // Build visibility filter based on role
    let visibilityFilter = '';
    if (userRole === 'student') {
      visibilityFilter = "AND c.visibility = 'ALL'";
    } else if (userRole === 'teacher') {
      visibilityFilter = "AND c.visibility IN ('ALL', 'TEACHERS_ONLY')";
    }

    const circularQuery = `
      SELECT c.*, u.id as "issuedById", u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE c.id = $1 AND c."tenantId" = $2 AND c."isPublished" = true ${visibilityFilter}
    `;

    const circularResult = await db.query(circularQuery, [id, tenantId]);

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
 * Get all exams (public to all roles - no visibility filtering needed)
 */
const getExams = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { classId, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'e."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND e."classId" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Exam" e WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get exams
    const examsQuery = `
      SELECT e.*, c.id as "classId", c.name as "className", c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."classId" = c.id
      WHERE ${whereClause}
      ORDER BY e."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const examsParams = [...params, take, skip];
    const examsResult = await db.query(examsQuery, examsParams);

    const exams = examsResult.rows.map(item => ({
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
      LEFT JOIN "Class" c ON e."classId" = c.id
      WHERE e.id = $1 AND e."tenantId" = $2
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