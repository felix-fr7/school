const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const ClassModel = require('../models/Class');

/**
 * @desc Get preview of cleanup impact (dry-run analysis)
 */
exports.getCleanupStats = async (req, res, next) => {
  try {
    const nonSuperAdminCount = await User.countDocuments({ role: { $ne: 'SUPER_ADMIN' } });
    const studentProfileCount = await StudentProfile.countDocuments({});
    const homeworkCount = await Homework.countDocuments({});
    const classCount = await ClassModel.countDocuments({});

    const superAdminExists = await User.exists({ role: 'SUPER_ADMIN' });

    res.json({
      success: true,
      data: {
        counts: {
          users_to_delete: nonSuperAdminCount,
          student_profiles: studentProfileCount,
          homeworks: homeworkCount,
          classes: classCount
        },
        safeguards: {
          super_admin_exists: !!superAdminExists
        },
        ready: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Execute cleanup of all non-superadmin data
 */
exports.executeCleanup = async (req, res, next) => {
  try {
    const startTime = Date.now();

    // Delete non-superadmin users and related records
    const deleteResult = await User.deleteMany({ role: { $ne: 'SUPER_ADMIN' } });
    await StudentProfile.deleteMany({});
    await Homework.deleteMany({});
    await HomeworkSubmission.deleteMany({});
    await ClassModel.deleteMany({});

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Cleanup executed successfully',
      data: {
        deleted_users_count: deleteResult.deletedCount,
        duration_ms: duration
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Verify SuperAdmin system integrity
 */
exports.verifySystemIntegrity = async (req, res, next) => {
  try {
    const superAdminExists = await User.findOne({ role: 'SUPER_ADMIN' });

    res.json({
      success: true,
      data: {
        system_integrity: !!superAdminExists,
        super_admin_status: superAdminExists ? 'OK' : 'MISSING',
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};