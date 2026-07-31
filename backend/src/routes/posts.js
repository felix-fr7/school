/**
 * Post Routes
 * Using MongoDB/Mongoose with Express Validator
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication (or adjust based on public access)
// router.use(authenticate); // Uncomment if all routes need auth, or apply per route as below

/**
 * @route   GET /api/posts
 * @desc    Get all posts with pagination and search
 * @access  Public / Authenticated
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
router.get('/my-posts', authenticate, postController.getMyPosts);

/**
 * @route   GET /api/posts/:id
 * @desc    Get single post by ID
 * @access  Public / Authenticated
 * @param   id - Post MongoDB ObjectId
 */
router.get(
  '/:id',
  [
    param('id')
      .isMongoId()
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
    authenticate,
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
 * @param   id - Post MongoDB ObjectId
 * @body    { title, content }
 */
router.put(
  '/:id',
  [
    authenticate,
    param('id')
      .isMongoId()
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
 * @param   id - Post MongoDB ObjectId
 */
router.delete(
  '/:id',
  [
    authenticate,
    param('id')
      .isMongoId()
      .withMessage('Invalid post ID format'),
  ],
  postController.deletePost
);

module.exports = router;