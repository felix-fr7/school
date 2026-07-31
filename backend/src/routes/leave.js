/**
 * Leave Routes
 * Using MongoDB/Mongoose
 */

const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const { authenticate, isAdminOrTeacher } = require('../middleware/auth');

// Get leave requests
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, classId, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { tenantId: req.user.tenantId };

    if (status) {
      query.status = status;
    }
    if (classId) {
      query.classId = classId;
    }

    // Role-based filtering
    if (req.user.role === 'TEACHER') {
      // Assuming teacher's assigned classes are handled or queried based on teacher ID
      // If your LeaveRequest or Class model stores class teacher reference:
      query.classId = { $in: req.user.assignedClasses || [] }; // Adjust based on your schema structure
    } else if (req.user.role === 'STUDENT') {
      query.studentId = req.user.id;
    }

    const leaves = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'studentId',
        select: 'name avatarUrl',
        populate: { path: 'studentProfile', select: 'studentId' }
      })
      .populate('classId', 'name section')
      .populate('approvedBy', 'name');

    res.json({ success: true, data: leaves });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject leave (Admin & Teachers)
router.put('/:id/status', authenticate, isAdminOrTeacher, async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const leaveRequest = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      {
        $set: {
          status,
          remarks: remarks || null,
          approvedBy: req.user.id,
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        error: { message: 'Leave request not found' }
      });
    }

    res.json({ success: true, data: leaveRequest });
  } catch (error) {
    next(error);
  }
});

module.exports = router;