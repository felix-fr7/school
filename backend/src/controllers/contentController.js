/**
 * Content Controller
 * Handles read-only access to News, Circulars, and Exams for Students and Teachers
 * Implements role-based visibility filtering
 */

const mongoose = require('mongoose');
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

    console.log('[ContentController.getNews] Query params:', { tenantId, userRole, userClassId, category, page, limit });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Convert string IDs to ObjectId for MongoDB queries
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const classObjectId = userClassId && mongoose.Types.ObjectId.isValid(userClassId) ? new mongoose.Types.ObjectId(userClassId) : null;

    // Build MongoDB query
    let query = {
      tenantId: tenantObjectId,
      isPublished: true
    };

    console.log('[ContentController.getNews] Initial query:', JSON.stringify(query));

    // Build visibility and class isolation conditions
    // Students see only 'ALL' visibility content, teachers/admins see all
    const isStudent = userRole === 'Student';
    const hasClassId = (userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && classObjectId;

    // Build the combined $or conditions
    let orConditions = [];

    if (isStudent && hasClassId) {
      // Students with a class: See school-wide news (no classId) with visibility='ALL', OR their class's specific news with visibility='ALL'
      orConditions = [
        // School-wide news (no classId) with proper visibility
        {
          $and: [
            { $or: [{ classId: null }, { classId: { $exists: false } }] },
            { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
          ]
        },
        // Class-specific news for their class with proper visibility
        {
          $and: [
            { classId: classObjectId },
            { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
          ]
        }
      ];
    } else if (isStudent) {
      // Students without a class: See only school-wide news with visibility='ALL'
      orConditions = [
        {
          $and: [
            { $or: [{ classId: null }, { classId: { $exists: false } }] },
            { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
          ]
        }
      ];
    } else if (hasClassId) {
      // Teachers/Class Controllers with a class: See school-wide news + their class's specific news
      orConditions = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: classObjectId }
      ];
    }

    if (orConditions.length > 0) {
      query.$or = orConditions;
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

    // Convert string IDs to ObjectId for MongoDB queries
    const newsObjectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const classObjectId = userClassId && mongoose.Types.ObjectId.isValid(userClassId) ? new mongoose.Types.ObjectId(userClassId) : null;

    // Build MongoDB query
    let query = {
      _id: newsObjectId,
      tenantId: tenantObjectId,
      isPublished: true
    };

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && classObjectId) {
      query.$or = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: classObjectId }
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
    if (userRole === 'Student') {
      // Strict filtering: Students only see content explicitly marked as 'ALL' or legacy NULL content
      whereClause += ` AND (c."visibility" = 'ALL' OR c."visibility" IS NULL)`;
    }
    // Teachers and Class Controllers see all visibility levels

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && userClassId) {
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

    // Convert string IDs to ObjectId for MongoDB queries (if needed for joins)
    const classObjectId = userClassId && mongoose.Types.ObjectId.isValid(userClassId) ? new mongoose.Types.ObjectId(userClassId) : null;

    // Build where clause with tenant, publication, and class isolation
    let whereClause = `c.id = $1 AND c."tenantId" = $2 AND c."isPublished" = true`;
    let params = [id, tenantId];
    let paramIndex = 3;

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && classObjectId) {
      params.push(classObjectId);
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

    // Convert string IDs to ObjectId for MongoDB queries
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const classObjectId = userClassId && mongoose.Types.ObjectId.isValid(userClassId) ? new mongoose.Types.ObjectId(userClassId) : null;

    // Build MongoDB query with proper isolation - only show published exams
    let query = { tenantId: tenantObjectId, isPublished: true };

    // Apply class-based isolation for students, teachers, and class controllers
    if ((userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && classObjectId) {
      // Students, Teachers, and Class Controllers see school-wide exams + their class's specific exams
      query.$or = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: classObjectId }
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

    // Convert string IDs to ObjectId for MongoDB queries
    const examObjectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;

    const exam = await Exam.findOne({
      _id: examObjectId,
      tenantId: tenantObjectId
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

    // For students and class controllers, filter by their class (school-wide + their class)
    let whereClause = 'es."tenantId" = $1 AND es."isPublished" = true';
    let params = [tenantId];
    let paramIndex = 2;

    if ((userRole === 'Student' || userRole === 'CLASS_CONTROLLER') && req.user.classId) {
      params.push(req.user.classId);
      whereClause += ` AND (es."classId" = $${paramIndex} OR es."classId" IS NULL)`;
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