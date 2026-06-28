/**
 * Post Controller
 * Handles CRUD operations for posts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get all posts with optional filtering and pagination
 * GET /api/posts
 * Query parameters: page, limit, search
 */
const getAllPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Get total count for pagination
    const total = await prisma.post.count({ where });

    // Get posts with user information
    const posts = await prisma.post.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

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

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get posts by current user
 * GET /api/posts/my-posts
 * Protected route - requires valid JWT
 */
const getMyPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
    };

    // Get total count
    const total = await prisma.post.count({ where });

    // Get posts
    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

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
 * Create new post
 * POST /api/posts
 * Protected route - requires valid JWT
 */
const createPost = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

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
 * Protected route - requires valid JWT
 * Only the post owner can update
 */
const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    // Check if post exists and user is the owner
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
        },
      });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to update this post',
        },
      });
    }

    // Update post
    const post = await prisma.post.update({
      where: { id },
      data: {
        title,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: post,
      message: 'Post updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete post
 * DELETE /api/posts/:id
 * Protected route - requires valid JWT
 * Only the post owner can delete
 */
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if post exists and user is the owner
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
        },
      });
    }

    if (existingPost.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Not authorized to delete this post',
        },
      });
    }

    // Delete post
    await prisma.post.delete({
      where: { id },
    });

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