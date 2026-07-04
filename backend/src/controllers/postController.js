/**
 * Post Controller
 * Handles CRUD operations for posts
 */

const db = require('../config/db');

/**
 * Get all posts with optional filtering and pagination
 * GET /api/posts
 */
const getAllPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    let whereClause = '1=1';
    let params = [];
    let paramIndex = 1;

    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      whereClause += ` AND (p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex})`;
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Post" p WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get posts
    const postsQuery = `
      SELECT 
        p.*,
        u.id as "userId", u.name as "userName", u.email as "userEmail"
      FROM "Post" p
      LEFT JOIN "User" u ON p."userId" = u.id
      WHERE ${whereClause}
      ORDER BY p."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const postsParams = [...params, parseInt(limit), skip];
    const postsResult = await db.query(postsQuery, postsParams);

    const posts = postsResult.rows.map(post => ({
      ...post,
      user: post.userId ? {
        id: post.userId,
        name: post.userName,
        email: post.userEmail,
      } : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        posts,
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
 * Get single post by ID
 * GET /api/posts/:id
 */
const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const postQuery = `
      SELECT 
        p.*,
        u.id as "userId", u.name as "userName", u.email as "userEmail"
      FROM "Post" p
      LEFT JOIN "User" u ON p."userId" = u.id
      WHERE p.id = $1
    `;

    const postResult = await db.query(postQuery, [id]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
        },
      });
    }

    const post = postResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        ...post,
        user: post.userId ? {
          id: post.userId,
          name: post.userName,
          email: post.userEmail,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get posts by current user
 * GET /api/posts/my-posts
 */
const getMyPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Post" WHERE "userId" = $1`;
    const countResult = await db.query(countQuery, [req.user.id]);
    const total = parseInt(countResult.rows[0].total);

    // Get posts
    const postsQuery = `
      SELECT * FROM "Post"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT $2 OFFSET $3
    `;

    const postsResult = await db.query(postsQuery, [req.user.id, parseInt(limit), skip]);

    res.status(200).json({
      success: true,
      data: {
        posts: postsResult.rows,
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
 * Create new post
 * POST /api/posts
 */
const createPost = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const createQuery = `
      INSERT INTO "Post" (title, content, "userId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;

    const createResult = await db.query(createQuery, [title, content, userId]);
    const post = createResult.rows[0];

    res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update post
 * PUT /api/posts/:id
 */
const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    // Check if post exists and user is the owner
    const checkQuery = `SELECT * FROM "Post" WHERE id = $1`;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
        },
      });
    }

    if (checkResult.rows[0].userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to update this post',
        },
      });
    }

    // Update post
    const updateQuery = `
      UPDATE "Post"
      SET title = $1, content = $2, "updatedAt" = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [title, content, id]);

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
      message: 'Post updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete post
 * DELETE /api/posts/:id
 */
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if post exists and user is the owner
    const checkQuery = `SELECT * FROM "Post" WHERE id = $1`;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
        },
      });
    }

    if (checkResult.rows[0].userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to delete this post',
        },
      });
    }

    // Delete post
    await db.query('DELETE FROM "Post" WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPosts,
  getPostById,
  getMyPosts,
  createPost,
  updatePost,
  deletePost,
};