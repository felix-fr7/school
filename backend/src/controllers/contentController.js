/**
 * Content Controller
 * Handles read-only access to News, Circulars, and Exams for Students and Teachers
 * Implements role-based visibility filtering
 */

const News = require('../models/News');
const Class = require('../models/Class');
const db = require('../config/db');

/**
 * Get all news with visibility filtering based on user role AND class isolation
 * - Students: See school-wide news (classId IS NULL) + their class's specific news with visibility='ALL'
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

    // Build MongoDB query
    let query = {
      tenantId,
      isPublished: true
    };

    // Apply visibility filtering for students - they only see 'ALL' visibility content
    if (userRole === 'STUDENT') {
      query.$or = [
        { visibility: { $exists: false } },
        { visibility: null },
        { visibility: 'ALL' }
      ];
    }

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      // Students, Teachers, and Class Controllers see school-wide news + their class's specific news only
      query.$or = [
        ...(query.$or || []),
        { classId: null },
        { classId: { $exists: false } },
        { classId: userClassId }
      ];
    }

    if (category) {
      query.type = category;
    }

    // Get total count
    const total = await News.countDocuments(query);

    // Get news with pagination
    const news = await News.find(query)
      .populate('authorId', 'name email')
      .populate('classId', 'name section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);

    const newsData = news.map(item => ({
      id: item._id,
      title: item.title,
      content: item.content,
      type: item.type,
      imageUrl: item.imageUrl,
      pdfUrl: item.attachmentUrl,
      visibility: item.visibility,
      classId: item.classId ? item.classId._id : null,
      className: item.classId ? item.classId.name : null,
      isPublished: item.isPublished,
      postedByUser: item.authorId ? {
        id: item.authorId._id,
        name: item.authorId.name,
        email: item.authorId.email
      } : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        news: newsData,
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

    // Build MongoDB query
    let query = {
      _id: id,
      tenantId,
      isPublished: true
    };

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      query.$or = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: userClassId }
      ];
    }

    const news = await News.findOne(query)
      .populate('authorId', 'name email')
      .populate('classId', 'name section');

    if (!news) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'News not found or access denied',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: news._id,
        title: news.title,
        content: news.content,
        type: news.type,
        imageUrl: news.imageUrl,
        pdfUrl: news.attachmentUrl,
        visibility: news.visibility,
        classId: news.classId ? news.classId._id : null,
        className: news.classId ? news.classId.name : null,
        isPublished: news.isPublished,
        postedByUser: news.authorId ? {
          id: news.authorId._id,
          name: news.authorId.name,
          email: news.authorId.email
        } : null,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt
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
 * Uses MongoDB/Mongoose
 * - Students: See school-wide exams + their class's specific exams with visibility='ALL'
 * - Teachers: See school-wide exams + their class's specific exams (including TEACHERS_ONLY)
 * - Admins: See all exams (no class filtering)
 */
const Exam = require('../models/Exam');

const getExams = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userRole = req.user.role;
    const userClassId = req.user.classId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build MongoDB query with proper isolation
    let query = { tenantId };

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'STUDENT' || userRole === 'TEACHER' || userRole === 'CLASS_CONTROLLER') && userClassId) {
      // Students, Teachers, and Class Controllers see school-wide exams + their class's specific exams
      query.$or = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: userClassId }
      ];
    }
    // Admins see all exams (no class filtering)

    // Get total count
    const total = await Exam.countDocuments(query);

    // Get exams with pagination
    const exams = await Exam.find(query)
      .populate('classId', 'name section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);

    const examData = exams.map(exam => ({
      id: exam._id,
      title: exam.name,
      examName: exam.name,
      classId: exam.classId?._id,
      tenantId: exam.tenantId,
      fileUrl: null,
      pdfUrl: null,
      imageUrl: null,
      startDate: exam.startDate,
      endDate: exam.endDate,
      isPublished: exam.isPublished,
      description: exam.description,
      academicYear: exam.academicYear,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      class: exam.classId ? {
        id: exam.classId._id,
        name: exam.classId.name,
        section: exam.classId.section
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        exams: examData,
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

    const exam = await Exam.findOne({
      _id: id,
      tenantId
    }).populate('classId', 'name section');

    if (!exam) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam not found',
        },
      });
    }

    const examData = {
      id: exam._id,
      title: exam.name,
      examName: exam.name,
      classId: exam.classId?._id,
      tenantId: exam.tenantId,
      startDate: exam.startDate,
      endDate: exam.endDate,
      isPublished: exam.isPublished,
      description: exam.description,
      academicYear: exam.academicYear,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      class: exam.classId ? {
        id: exam.classId._id,
        name: exam.classId.name,
        section: exam.classId.section
      } : null
    };

    res.status(200).json({
      success: true,
      data: examData,
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