/**
 * Post Routes
 * Handles CRUD operations for posts
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const postController = require('../controllers/postController');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/posts
 * @desc    Get all posts with pagination and search
 * @access  Public
 * @query   page, limit, search
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Search query must be less than 200 characters'),
  ],
  postController.getAllPosts
);

/**
 * @route   GET /api/posts/my-posts
 * @desc    Get current user's posts
 * @access  Private
 * @query   page, limit
 */
router.get('/my-posts', protect, postController.getMyPosts);

/**
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Public
 * @param   id - Post UUID
 */
router.get(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('Invalid post ID format'),
  ],
  postController.getPostById
);

/**
 * @route   POST /api/posts
 * @desc    Create new post
 * @access  Private
 * @body    { title, content }
 */
router.post(
  '/',
  [
    protect,
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Content is required')
      .isLength({ max: 10000 })
      .withMessage('Content must be less than 10000 characters'),
  ],
  postController.createPost
);

/**
 * @route   PUT /api/posts/:id
 * @desc    Update post
 * @access  Private
 * @param   id - Post UUID
 * @body    { title, content }
 */
router.put(
  '/:id',
  [
    protect,
    param('id')
      .isUUID()
      .withMessage('Invalid post ID format'),
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty')
      .isLength({ max: 255 })
      .withMessage('Title must be less than 255 characters'),
    body('content')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Content cannot be empty')
      .isLength({ max: 10000 })
      .withMessage('Content must be less than 10000 characters'),
  ],
  postController.updatePost
);

/**
 * @route   DELETE /api/posts/:id
 * @desc    Delete post
 * @access  Private
 * @param   id - Post UUID
 */
router.delete(
  '/:id',
  [
    protect,
    param('id')
      .isUUID()
      .withMessage('Invalid post ID format'),
  ],
  postController.deletePost
);

module.exports = router;