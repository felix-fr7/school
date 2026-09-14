/**
 * Shared School Context Routes
 * Vera logic mathala - only NEW endpoint add pannrom for logo + school name.
 * Used by Admin / Class / Student dashboards to show that school's logo+name.
 */

const express = require('express');
const router = express.Router();
const School = require('../models/School');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication (admin / class / student ellarum use panna)
router.use(authenticate);

/**
 * @route   GET /api/school-context/me
 * @desc    Get current user's school name + logo (that school only)
 * @access  Authenticated (Admin, Class, Student, Teacher)
 */
router.get('/me', async (req, res, next) => {
  try {
    // tenantId / schoolId comes from auth middleware
    const schoolId = req.user.tenantId || req.user.schoolId || null;

    if (!schoolId) {
      return res.status(200).json({
        success: true,
        data: { schoolName: null, schoolLogoUrl: null },
      });
    }

    const school = await School.findById(schoolId)
      .select('schoolName schoolCode schoolLogoUrl')
      .lean();

    if (!school) {
      return res.status(200).json({
        success: true,
        data: { schoolName: null, schoolLogoUrl: null },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        schoolId: school._id,
        schoolName: school.schoolName,
        schoolCode: school.schoolCode,
        schoolLogoUrl: school.schoolLogoUrl || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
