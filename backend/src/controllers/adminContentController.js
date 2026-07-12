/**
 * Admin Content Controller
 * Handles enhanced CRUD operations for News, Circulars, and Exams with visibility control
 * Supports targeted visibility: 'ALL' (Teachers + Students) or 'TEACHERS_ONLY'
 */

const db = require('../config/db');

// ============================================
// News Management with Visibility
// ============================================

/**
 * Get all news for admin's school with visibility filtering
 * GET /api/admin/content/news
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

    const { visibility, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'n."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (visibility) {
      params.push(visibility);
      whereClause += ` AND n.visibility = $${paramIndex}`;
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

    // Get news with all fields including visibility, imageUrl, pdfUrl
    const newsQuery = `
      SELECT 
        n.*,
        u.id as "postedById",
        u.name as "postedByName"
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
 * Create new news with visibility, image, and PDF support
 * POST /api/admin/content/news
 * Body: { title, content, imageUrl?, pdfUrl?, visibility: 'ALL' | 'TEACHERS_ONLY' }
 */
const createNews = async (req, res, next) => {
  try {
    const { title, content, imageUrl, pdfUrl, visibility, classId } = req.body;
    const tenantId = req.user.tenantId;
    const postedBy = req.user.id;

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
      const classCheckQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
      const classCheckResult = await db.query(classCheckQuery, [classId, tenantId]);
      if (classCheckResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Class not found in your school' },
        });
      }
    }

    const createQuery = `
      INSERT INTO "News" (title, content, "imageUrl", "pdfUrl", visibility, "class_id", "tenantId", "postedBy", "isPublished", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      title.trim(), content.trim(), imageUrl || null, pdfUrl || null, newsVisibility, classId || null, tenantId, postedBy, true
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
 * Update news with visibility support
 * PUT /api/admin/content/news/:id
 */
const updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, imageUrl, pdfUrl, visibility, isPublished } = req.body;
    const tenantId = req.user.tenantId;

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'News title cannot be empty' },
        });
      }
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(title.trim());
      paramIndex++;
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'News content cannot be empty' },
        });
      }
      updateFields.push(`content = $${paramIndex}`);
      updateParams.push(content.trim());
      paramIndex++;
    }

    if (imageUrl !== undefined) {
      updateFields.push(`"imageUrl" = $${paramIndex}`);
      updateParams.push(imageUrl || null);
      paramIndex++;
    }

    if (pdfUrl !== undefined) {
      updateFields.push(`"pdfUrl" = $${paramIndex}`);
      updateParams.push(pdfUrl || null);
      paramIndex++;
    }

    if (visibility !== undefined) {
      const validVisibility = ['ALL', 'TEACHERS_ONLY'];
      if (!validVisibility.includes(visibility)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Visibility must be either "ALL" or "TEACHERS_ONLY"' },
        });
      }
      updateFields.push(`visibility = $${paramIndex}`);
      updateParams.push(visibility);
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
      SET ${updateFields.join(', ')}, "updatedAt" = NOW()
      WHERE id = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'News not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
      message: 'News updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete news
 * DELETE /api/admin/content/news/:id
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

// ============================================
// Circular Management with Visibility
// ============================================

/**
 * Get all circulars for admin's school with visibility filtering
 * GET /api/admin/content/circulars
 */
const getAllCirculars = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: { circulars: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        message: 'Admin not associated with a school.'
      });
    }

    const { visibility, isPublished, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'c."tenantId" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (visibility) {
      params.push(visibility);
      whereClause += ` AND c.visibility = $${paramIndex}`;
      paramIndex++;
    }

    if (isPublished !== undefined) {
      params.push(isPublished === 'true');
      whereClause += ` AND c."isPublished" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Circular" c WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get circulars with visibility and imageUrl
    const circularsQuery = `
      SELECT 
        c.*,
        u.id as "issuedById",
        u.name as "issuedByName"
      FROM "Circular" c
      LEFT JOIN "User" u ON c."issuedBy" = u.id
      WHERE ${whereClause}
      ORDER BY c."createdAt" DESC
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
 * Create new circular with visibility and image support
 * POST /api/admin/content/circulars
 * Body: { title, message/content, imageUrl?, visibility: 'ALL' | 'TEACHERS_ONLY', classId? }
 */
const createCircular = async (req, res, next) => {
  try {
    const { title, message, content, imageUrl, visibility, classId } = req.body;
    const tenantId = req.user.tenantId;
    const issuedBy = req.user.id;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Circular title is required' },
      });
    }

    // Support both 'message' and 'content' field names for flexibility
    const circularContent = message || content;

    // Determine visibility: If classId is provided without visibility, default to TEACHERS_ONLY
    // This ensures class-specific circulars are not shown to students
    let circularVisibility = visibility;
    if (!circularVisibility) {
      circularVisibility = classId ? 'TEACHERS_ONLY' : 'ALL';
    }

    // Validate visibility
    const validVisibility = ['ALL', 'TEACHERS_ONLY', 'SPECIFIC_CLASSES'];
    if (!validVisibility.includes(circularVisibility)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Visibility must be either "ALL", "TEACHERS_ONLY", or "SPECIFIC_CLASSES"' },
      });
    }

    // If visibility is SPECIFIC_CLASSES, classId is required
    if (circularVisibility === 'SPECIFIC_CLASSES' && !classId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Class ID is required when visibility is "SPECIFIC_CLASSES"' },
      });
    }

    // Verify class exists and belongs to this tenant if classId provided
    if (classId) {
      const classCheckQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
      const classCheckResult = await db.query(classCheckQuery, [classId, tenantId]);
      if (classCheckResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Class not found in your school' },
        });
      }
    }

    const createQuery = `
      INSERT INTO "Circular" (title, content, "imageUrl", visibility, "class_id", "tenantId", "issuedBy", "isPublished", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      title.trim(), circularContent ? circularContent.trim() : null, imageUrl || null, circularVisibility, tenantId, issuedBy, true
    ]);

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
 * Update circular with visibility support
 * PUT /api/admin/content/circulars/:id
 */
const updateCircular = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, message, content, imageUrl, visibility, isPublished } = req.body;
    const tenantId = req.user.tenantId;

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Circular title cannot be empty' },
        });
      }
      updateFields.push(`title = $${paramIndex}`);
      updateParams.push(title.trim());
      paramIndex++;
    }

    // Support both 'message' and 'content' field names
    const circularContent = message !== undefined ? message : content;
    if (circularContent !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      updateParams.push(circularContent ? circularContent.trim() : null);
      paramIndex++;
    }

    if (imageUrl !== undefined) {
      updateFields.push(`"imageUrl" = $${paramIndex}`);
      updateParams.push(imageUrl || null);
      paramIndex++;
    }

    if (visibility !== undefined) {
      const validVisibility = ['ALL', 'SPECIFIC_CLASSES'];
      if (!validVisibility.includes(visibility)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Visibility must be either "ALL" or "SPECIFIC_CLASSES"' },
        });
      }
      updateFields.push(`visibility = $${paramIndex}`);
      updateParams.push(visibility);
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
      UPDATE "Circular"
      SET ${updateFields.join(', ')}, "updatedAt" = NOW()
      WHERE id = $${paramIndex} AND "tenantId" = $${paramIndex + 1}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Circular not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
      message: 'Circular updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete circular
 * DELETE /api/admin/content/circulars/:id
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
        error: { message: 'Circular not found' },
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
// Exam Management (New Table for Exam Timetables)
// ============================================

/**
 * Get all exams for admin's school
 * GET /api/admin/content/exams
 */
const getAllExams = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: { exams: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        message: 'Admin not associated with a school.'
      });
    }

    const { classId, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    let whereClause = 'e."tenant_id" = $1';
    let params = [tenantId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND e."class_id" = $${paramIndex}`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Exam" e WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get exams with class info
    const examsQuery = `
      SELECT 
        e.*,
        c.id as "classId",
        c.name as "className",
        c.section as "classSection"
      FROM "Exam" e
      LEFT JOIN "Class" c ON e."class_id" = c.id
      WHERE ${whereClause}
      ORDER BY e."created_at" DESC
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
 * Create new exam with PDF or Image timetable
 * POST /api/admin/content/exams
 * Body: { examName, classId?, pdfUrl?, imageUrl? }
 */
const createExam = async (req, res, next) => {
  try {
    const { examName, classId, pdfUrl, imageUrl } = req.body;
    const tenantId = req.user.tenantId;

    // Validate required fields
    if (!examName || !examName.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Exam name is required' },
      });
    }

    // At least one of pdfUrl or imageUrl should be provided
    if (!pdfUrl && !imageUrl) {
      return res.status(400).json({
        success: false,
        error: { message: 'Either PDF URL or Image URL is required for the exam timetable' },
      });
    }

    // If classId is provided, verify it exists and belongs to this tenant
    if (classId) {
      const classCheckQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
      const classCheckResult = await db.query(classCheckQuery, [classId, tenantId]);

      if (classCheckResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Class not found in your school' },
        });
      }
    }

    const createQuery = `
      INSERT INTO "Exam" ("examName", "class_id", "pdfUrl", "imageUrl", "tenant_id", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [
      examName.trim(), classId || null, pdfUrl || null, imageUrl || null, tenantId
    ]);

    const exam = createResult.rows[0];

    res.status(201).json({
      success: true,
      data: exam,
      message: 'Exam timetable created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update exam
 * PUT /api/admin/content/exams/:id
 */
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { examName, classId, pdfUrl, imageUrl } = req.body;
    const tenantId = req.user.tenantId;

    // Build update fields
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    if (examName !== undefined) {
      if (!examName.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Exam name cannot be empty' },
        });
      }
      updateFields.push(`"examName" = $${paramIndex}`);
      updateParams.push(examName.trim());
      paramIndex++;
    }

    if (classId !== undefined) {
      if (classId) {
        // Verify class exists
        const classCheckQuery = 'SELECT id FROM "Class" WHERE id = $1 AND "tenantId" = $2';
        const classCheckResult = await db.query(classCheckQuery, [classId, tenantId]);

        if (classCheckResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { message: 'Class not found in your school' },
          });
        }
      }
      updateFields.push(`"class_id" = $${paramIndex}`);
      updateParams.push(classId || null);
      paramIndex++;
    }

    if (pdfUrl !== undefined) {
      updateFields.push(`"pdfUrl" = $${paramIndex}`);
      updateParams.push(pdfUrl || null);
      paramIndex++;
    }

    if (imageUrl !== undefined) {
      updateFields.push(`"imageUrl" = $${paramIndex}`);
      updateParams.push(imageUrl || null);
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
      UPDATE "Exam"
      SET ${updateFields.join(', ')}, "updatedAt" = NOW()
      WHERE id = $${paramIndex} AND "tenant_id" = $${paramIndex + 1}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
      message: 'Exam updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete exam
 * DELETE /api/admin/content/exams/:id
 */
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const deleteQuery = 'DELETE FROM "Exam" WHERE id = $1 AND "tenant_id" = $2';
    const deleteResult = await db.query(deleteQuery, [id, tenantId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exam not found' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
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
  // Circulars
  getAllCirculars,
  createCircular,
  updateCircular,
  deleteCircular,
  // Exams
  getAllExams,
  createExam,
  updateExam,
  deleteExam,
};