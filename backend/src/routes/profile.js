/**
 * Profile Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Authenticated users
 */
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.id })
      .populate('schoolId', 'schoolName')
      .populate('classId', 'name section gradeLevel');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Profile not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/profile
 * @desc    Update current user profile
 * @body    { name, phone, email, avatarUrl }
 * @access  Authenticated users
 */
router.put('/', async (req, res, next) => {
  try {
    const { name, phone, email, avatarUrl } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    
    const user = await User.findOneAndUpdate(
      { _id: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    )
    .select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Profile not found' }
      });
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;