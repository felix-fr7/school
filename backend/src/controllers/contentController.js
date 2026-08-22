/**
 * Content Controller
 * Handles read-only access to News, Circulars, and Exams for Students and Teachers
 * Implements role-based visibility filtering
 */

const mongoose = require('mongoose');
const News = require('../models/News');
const Class = require('../models/Class');
const Circular = require('../models/Circular');
const ExamSchedule = require('../models/ExamSchedule');

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
 * - Students: See school-wide circulars (classId IS NULL) + their class's specific circulars with visibility='ALL'
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

    // Convert string IDs to ObjectId for MongoDB queries
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const classObjectId = userClassId && mongoose.Types.ObjectId.isValid(userClassId) ? new mongoose.Types.ObjectId(userClassId) : null;

    // Build MongoDB query
    let query = {
      tenantId: tenantObjectId,
      isPublished: true
    };

    // Build combined conditions for students, teachers, and class controllers
    if ((userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && classObjectId) {
      let orConditions = [];
      
      // Class-based isolation: See school-wide circulars (no classId) OR their class's specific circulars
      const classConditions = [
        { classId: null },
        { classId: { $exists: false } },
        { classId: classObjectId }
      ];
      
      // Apply visibility filtering for students - they only see 'ALL' visibility content
      if (userRole === 'Student') {
        // For each class condition, combine with visibility filter
        orConditions = classConditions.map(classCond => ({
          $and: [
            classCond,
            { $or: [{ visibility: 'ALL' }, { visibility: { $exists: false } }, { visibility: null }] }
          ]
        }));
      } else {
        // Teachers and Class Controllers see all circulars for their class
        orConditions = classConditions;
      }
      
      query.$or = orConditions;
    } else if (userRole === 'Student') {
      // Students without a class: See only school-wide circulars with visibility='ALL'
      query.$and = [
        { $or: [{ classId: null }, { classId: { $exists: false } }] },
        { $or: [{ visibility: 'ALL' }, { visibility: { $exists: false } }, { visibility: null }] }
      ];
    }

    // Get total count
    const total = await Circular.countDocuments(query);

    // Get circulars with pagination and populate author and class
    const circulars = await Circular.find(query)
      .populate('authorId', 'name email')
      .populate('classId', 'name section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);

    const circularData = circulars.map(item => ({
      id: item._id,
      title: item.title,
      content: item.content,
      tenantId: item.tenantId,
      isPublished: item.isPublished,
      publishedAt: item.publishedAt,
      imageUrl: item.imageUrl,
      attachmentUrl: item.attachmentUrl,
      visibility: item.visibility,
      classId: item.classId ? item.classId._id : null,
      className: item.classId ? item.classId.name : null,
      expiryDate: item.expiryDate,
      issuedByUser: item.authorId ? {
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
        circulars: circularData,
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

    // Convert string IDs to ObjectId for MongoDB queries
    const circularObjectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
    const classObjectId = userClassId && mongoose.Types.ObjectId.isValid(userClassId) ? new mongoose.Types.ObjectId(userClassId) : null;

    // Build MongoDB query
    let query = {
      _id: circularObjectId,
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

    const circular = await Circular.findOne(query)
      .populate('authorId', 'name email')
      .populate('classId', 'name section');

    if (!circular) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Circular not found or access denied',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: circular._id,
        title: circular.title,
        content: circular.content,
        tenantId: circular.tenantId,
        isPublished: circular.isPublished,
        publishedAt: circular.publishedAt,
        imageUrl: circular.imageUrl,
        attachmentUrl: circular.attachmentUrl,
        visibility: circular.visibility,
        classId: circular.classId ? circular.classId._id : null,
        className: circular.classId ? circular.classId.name : null,
        expiryDate: circular.expiryDate,
        issuedByUser: circular.authorId ? {
          id: circular.authorId._id,
          name: circular.authorId.name,
          email: circular.authorId.email
        } : null,
        createdAt: circular.createdAt,
        updatedAt: circular.updatedAt
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
 * Get exam schedules
 * Uses MongoDB/Mongoose
 */
const getExamSchedules = async (req, res, next) => {
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

    // Build MongoDB query
    let query = {
      tenantId: tenantObjectId,
      isPublished: true
    };

    // For students and class controllers, filter by their class (school-wide + their class)
    if ((userRole === 'Student' || userRole === 'CLASS_CONTROLLER') && classObjectId) {
      query.$or = [
        { classId: classObjectId },
        { classId: null },
        { classId: { $exists: false } }
      ];
    }

    // Get total count
    const total = await ExamSchedule.countDocuments(query);

    // Get exam schedules with pagination and populate class and exam
    const examSchedules = await ExamSchedule.find(query)
      .populate('classId', 'name section')
      .populate('examId', 'name')
      .sort({ date: 1 })
      .skip(skip)
      .limit(take);

    const examScheduleData = examSchedules.map(item => ({
      id: item._id,
      title: item.title,
      subject: item.subject,
      examId: item.examId ? item.examId._id : null,
      examName: item.examId ? item.examId.name : null,
      classId: item.classId ? item.classId._id : null,
      tenantId: item.tenantId,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      duration: item.duration,
      roomNo: item.roomNo,
      isPublished: item.isPublished,
      fileUrl: item.fileUrl,
      class: item.classId ? {
        id: item.classId._id,
        name: item.classId.name,
        section: item.classId.section
      } : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        examSchedules: examScheduleData,
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

    // Convert string IDs to ObjectId for MongoDB queries
    const examScheduleObjectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;

    const examSchedule = await ExamSchedule.findOne({
      _id: examScheduleObjectId,
      tenantId: tenantObjectId,
      isPublished: true
    })
      .populate('classId', 'name section')
      .populate('examId', 'name');

    if (!examSchedule) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Exam schedule not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: examSchedule._id,
        title: examSchedule.title,
        subject: examSchedule.subject,
        examId: examSchedule.examId ? examSchedule.examId._id : null,
        examName: examSchedule.examId ? examSchedule.examId.name : null,
        classId: examSchedule.classId ? examSchedule.classId._id : null,
        tenantId: examSchedule.tenantId,
        date: examSchedule.date,
        startTime: examSchedule.startTime,
        endTime: examSchedule.endTime,
        duration: examSchedule.duration,
        roomNo: examSchedule.roomNo,
        isPublished: examSchedule.isPublished,
        fileUrl: examSchedule.fileUrl,
        class: examSchedule.classId ? {
          id: examSchedule.classId._id,
          name: examSchedule.classId.name,
          section: examSchedule.classId.section
        } : null,
        createdAt: examSchedule.createdAt,
        updatedAt: examSchedule.updatedAt
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