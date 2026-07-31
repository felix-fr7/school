/**
 * Messages Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin, requireTeacher } = require('../middleware/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/messages
 * @desc    Get messages for current user
 * @query   page, limit
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query for messages sent to this user or their class
    let query = { tenantId: req.user.tenantId };
    
    // Messages can be sent to: specific user, class, or all students/teachers
    const messageQuery = {
      $or: [
        { recipientId: req.user.id },
        { 
          recipientType: 'CLASS', 
          classId: req.user.classId 
        },
        { recipientType: 'ALL' }
      ]
    };
    
    // If user is a teacher, also show messages to all teachers
    if (req.user.role === 'Teacher') {
      messageQuery.$or.push({ recipientType: 'ALL', targetAudience: 'TEACHERS' });
    }
    
    const messages = await Message.find({
      ...query,
      ...messageQuery
    })
    .sort({ isImportant: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('senderId', 'name avatarUrl')
    .populate('recipientId', 'name');
    
    const total = await Message.countDocuments({ ...query, ...messageQuery });
    
    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/messages/:id
 * @desc    Get single message
 * @access  Authenticated users
 */
router.get('/:id', async (req, res, next) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    })
    .populate('senderId', 'name avatarUrl')
    .populate('recipientId', 'name');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found' }
      });
    }
    
    // Mark as read if current user is recipient
    if (!message.isRead && message.recipientId && message.recipientId._id.toString() === req.user.id) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }
    
    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/messages
 * @desc    Send message
 * @body    { subject, message, recipientType, recipientId, classId, isImportant }
 * @access  Admin and Teachers
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    // Ensure only Admin or Teacher can send messages
    if (req.user.role !== 'Admin' && req.user.role !== 'Teacher') {
      return res.status(403).json({
        success: false,
        error: { message: 'Unauthorized to send messages' }
      });
    }

    const {
      subject,
      message: messageText,
      recipientType,
      recipientId,
      classId,
      isImportant
    } = req.body;
    
    const message = new Message({
      tenantId: req.user.tenantId,
      senderId: req.user.id,
      recipientType,
      recipientId: recipientId || null,
      classId: classId || null,
      subject,
      message: messageText,
      isImportant: isImportant || false
    });
    
    await message.save();
    
    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message (sender or recipient)
 * @access  Authenticated users
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      $or: [
        { senderId: req.user.id },
        { recipientId: req.user.id }
      ]
    });
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found' }
      });
    }
    
    await message.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;