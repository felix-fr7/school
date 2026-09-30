/**
 * Admin Content Controller
 * Handles CRUD operations for News with visibility control
 * Supports targeted visibility: 'ALL' or 'SPECIFIC_CLASSES'
 */

const News = require('../models/News');
const Class = require('../models/Class');
const { deleteFile } = require('../middleware/fileUpload');
const fs = require('fs');
const path = require('path');

// ============================================
// News Management with Visibility (MongoDB)
// ============================================

/**
 * Get all news for admin's school with visibility filtering
 * GET /api/admin-content/news
 * Each admin only sees news they created (authorId filtering)
 */
const getAllNews = async (req, res, next) => {
  try {
    const { visibility, isPublished, page = 1, limit = 10 } = req.query;

    console.log('[getAllNews] Query params:', { visibility, isPublished, page, limit });
    console.log('[getAllNews] User:', { id: req.user.id, tenantId: req.user.tenantId });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build MongoDB query - filter by tenantId and authorId for security
    const tenantId = req.user.tenantId || req.user.schoolId;
    const authorId = req.user.id;
    
    let query = {
      tenantId: tenantId,
      authorId: authorId  // Each admin only sees their own created news
    };
    
    console.log('[getAllNews] Initial query:', query);

    if (visibility) {
      query.visibility = visibility;
    }

    if (isPublished && isPublished !== '') {
      query.isPublished = isPublished === 'true';
    }

    console.log('[getAllNews] Final query:', JSON.stringify(query));
    
    // Get total count
    const total = await News.countDocuments(query);
    console.log('[getAllNews] Total documents found:', total);

    // Get news with pagination
    const news = await News.find(query)
      .populate('authorId', 'name email')
      .populate('classId', 'name section')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take);
    
    console.log('[getAllNews] News items found:', news.length);

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
      priority: item.priority,
      tags: item.tags,
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
 * Create new news with visibility, image, and PDF support
 * POST /api/admin-content/news
 * Body: { title, content, imageUrl?, pdfUrl?, visibility: 'ALL' | 'TEACHERS_ONLY' | 'SPECIFIC_CLASSES' }
 */
const createNews = async (req, res, next) => {
  try {
    const { title, content, imageUrl, pdfUrl, visibility, classId } = req.body;
    const authorId = req.user.id;
    
    // Priority: x-tenant-id header > user.tenantId > user.schoolId
    const tenantId = req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'News title is required' },
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'News content is required' },
      });
    }

    // Validate tenantId
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tenant ID is required. Please ensure your admin account is properly configured.' },
      });
    }

    // Validate visibility
    const validVisibility = ['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES'];
    const newsVisibility = visibility || 'ALL';
    if (!validVisibility.includes(newsVisibility)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Visibility must be either "ALL", "TEACHERS_ONLY", or "SPECIFIC_CLASSES"' },
      });
    }

    // Validate classId if SPECIFIC_CLASSES visibility is selected
    if (newsVisibility === 'SPECIFIC_CLASSES' && !classId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Class ID is required when visibility is "SPECIFIC_CLASSES"' },
      });
    }

    // Verify class exists and belongs to this tenant if classId provided
    if (classId) {
      const classExists = await Class.findOne({ _id: classId, tenantId });
      if (!classExists) {
        return res.status(404).json({
          success: false,
          error: { message: 'Class not found in your school' },
        });
      }
    }

    // Create news document for MongoDB
    const newsData = {
      title: title.trim(),
      content: content.trim(),
      tenantId,
      authorId,
      imageUrl: imageUrl || null,
      attachmentUrl: pdfUrl || null,
      visibility: newsVisibility,
      classId: classId || null,
      isPublished: true,
      publishedAt: new Date(),
      type: 'NEWS'
    };

    const news = new News(newsData);
    await news.save();

    res.status(201).json({
      success: true,
      data: {
        id: news._id,
        title: news.title,
        content: news.content,
        imageUrl: news.imageUrl,
        pdfUrl: news.attachmentUrl,
        visibility: news.visibility,
        classId: news.classId,
        isPublished: news.isPublished,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt
      },
      message: 'News created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update news with visibility support
 * PUT /api/admin-content/news/:id
 */
const updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, imageUrl, pdfUrl, visibility, isPublished } = req.body;
    
    // Priority: x-tenant-id header > user.tenantId > user.schoolId
    const tenantId = req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tenant ID is required. Please ensure your admin account is properly configured.' },
      });
    }

    // Find the news document
    const news = await News.findOne({ _id: id, tenantId });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' },
      });
    }

    // Update fields
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'News title cannot be empty' },
        });
      }
      news.title = title.trim();
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'News content cannot be empty' },
        });
      }
      news.content = content.trim();
    }

    if (imageUrl !== undefined) {
      news.imageUrl = imageUrl || null;
    }

    if (pdfUrl !== undefined) {
      news.attachmentUrl = pdfUrl || null;
    }

    if (visibility !== undefined) {
      const validVisibility = ['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES'];
      if (!validVisibility.includes(visibility)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Visibility must be either "ALL", "TEACHERS_ONLY", or "SPECIFIC_CLASSES"' },
        });
      }
      news.visibility = visibility;
    }

    if (isPublished !== undefined) {
      news.isPublished = isPublished;
    }

    await news.save();

    res.status(200).json({
      success: true,
      data: {
        id: news._id,
        title: news.title,
        content: news.content,
        imageUrl: news.imageUrl,
        pdfUrl: news.attachmentUrl,
        visibility: news.visibility,
        classId: news.classId,
        isPublished: news.isPublished,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt
      },
      message: 'News updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete news
 * DELETE /api/admin-content/news/:id
 */
const deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Priority: x-tenant-id header > user.tenantId > user.schoolId
    const tenantId = req.headers['x-tenant-id'] || req.user.tenantId || req.user.schoolId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tenant ID is required. Please ensure your admin account is properly configured.' },
      });
    }

    // First, find the news to get file URLs before deleting
    const news = await News.findOne({ _id: id, tenantId });

    if (!news) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' },
      });
    }

    // Delete associated files (image and PDF) - Cloudinary or local disk
    if (news.imageUrl) {
      await deleteFile(news.imageUrl).catch(() => {});
    }
    if (news.attachmentUrl) {
      await deleteFile(news.attachmentUrl).catch(() => {});
    }

    // Now delete the document from database
    const result = await News.deleteOne({ _id: id, tenantId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' },
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

module.exports = {
  // News
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
};