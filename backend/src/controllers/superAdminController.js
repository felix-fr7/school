/**
 * Super Admin Controller
 * Handles school registration, tenant management, and system-wide operations
 * Phase 5 Implementation
 */

const School = require('../models/School');
const User = require('../models/User');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const { deleteFile } = require('../middleware/fileUpload');

/**
 * Delete an uploaded file by its stored URL/path.
 * File deletion is best-effort so DB deletion is not blocked by missing files.
 */
const deleteUploadedFile = async (fileUrl, label) => {
  if (!fileUrl) return false;

  try {
    await deleteFile(fileUrl);
    console.log(`[Delete Uploaded File] Deleted ${label}: ${fileUrl}`);
    return true;
  } catch (error) {
    console.error(`[Delete Uploaded File] Failed to delete ${label}:`, error.message);
    return false;
  }
};

/**
 * Register a new school with its admin account
 * POST /api/super-admin/schools
 */
const registerSchool = async (req, res, next) => {
  try {
    const {
      schoolName,
      schoolCode,
      address,
      contactEmail,
      contactPhone,
      subscriptionExpiry,
      adminName,
      adminEmail,
      adminPassword,
      adminPhone
    } = req.body;

    // Validate required fields
    if (!schoolName || !schoolCode || !address || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required school information' }
      });
    }

    // Validate admin fields
    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required admin information' }
      });
    }

    // Check if school code already exists
    const existingSchool = await School.findOne({ schoolCode: schoolCode.toUpperCase() });
    if (existingSchool) {
      return res.status(409).json({
        success: false,
        error: { message: 'School code already exists' }
      });
    }

    // Check if admin email already exists in Admin collection
    const existingAdmin = await Admin.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        error: { message: 'Admin email already exists' }
      });
    }

    // Create school and admin in transaction
    const session = await School.startSession();
    session.startTransaction();

    try {
      // Create school
      const school = new School({
        schoolName,
        schoolCode: schoolCode.toUpperCase(),
        address,
        contactEmail: contactEmail.toLowerCase(),
        contactPhone,
        subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : undefined
      });

      await school.save({ session });

      // Create admin in the dedicated Admin collection
      // Note: Do NOT pre-hash the password here - the Admin model's pre-save hook
      // will hash it automatically. Pre-hashing causes double-hashing which breaks login.
      const admin = new Admin({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: adminPassword, // Will be hashed by Admin model's pre-save hook
        phone: adminPhone,
        role: 'School Admin',
        schoolId: school._id,
        isActive: true
      });

      await admin.save({ session });

      await session.commitTransaction();

      // Return success response (excluding sensitive data)
      const adminResponse = admin.toObject();
      delete adminResponse.password;

      res.status(201).json({
        success: true,
        data: {
          school: {
            id: school._id,
            schoolName: school.schoolName,
            schoolCode: school.schoolCode,
            address: school.address,
            contactEmail: school.contactEmail,
            contactPhone: school.contactPhone,
            status: school.status,
            subscriptionExpiry: school.subscriptionExpiry,
            createdAt: school.createdAt
          },
          admin: {
            id: adminResponse.id,
            name: adminResponse.name,
            email: adminResponse.email,
            phone: adminResponse.phone,
            role: adminResponse.role,
            createdAt: adminResponse.createdAt
          }
        },
        message: 'School and admin account created successfully'
      });
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Register School Error:', error);
    next(error);
  }
};

/**
 * Get all schools with pagination and filtering
 * GET /api/super-admin/schools
 */
const getAllSchools = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { schoolName: { $regex: search, $options: 'i' } },
        { schoolCode: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const total = await School.countDocuments(query);

    // Get schools with user count
    const schools = await School.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get user count for each school
    const schoolData = await Promise.all(
      schools.map(async (school) => {
        const userCount = await User.countDocuments({ schoolId: school._id, isActive: true });
        return {
          ...school.toObject(),
          userCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        schools: schoolData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get Schools Error:', error);
    next(error);
  }
};

/**
 * Get single school by ID
 * GET /api/super-admin/schools/:id
 */
const getSchoolById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const school = await School.findById(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    // Get stats
    const userCount = await User.countDocuments({ schoolId: school._id, isActive: true });
    const adminCount = await User.countDocuments({ schoolId: school._id, role: 'School Admin', isActive: true });
    const teacherCount = await User.countDocuments({ schoolId: school._id, role: 'Teacher', isActive: true });
    const studentCount = await User.countDocuments({ schoolId: school._id, role: 'Student', isActive: true });

    res.status(200).json({
      success: true,
      data: {
        ...school.toObject(),
        stats: {
          totalUsers: userCount,
          admins: adminCount,
          teachers: teacherCount,
          students: studentCount
        }
      }
    });
  } catch (error) {
    console.error('Get School Error:', error);
    next(error);
  }
};

/**
 * Update school information
 * PUT /api/super-admin/schools/:id
 */
const updateSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove immutable fields from updates
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const school = await School.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: school,
      message: 'School updated successfully'
    });
  } catch (error) {
    console.error('Update School Error:', error);
    next(error);
  }
};

/**
 * Update school status (Active, Suspended, Trial)
 * PATCH /api/super-admin/schools/:id/status
 */
const updateSchoolStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Active', 'Suspended', 'Trial'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status. Must be Active, Suspended, or Trial' }
      });
    }

    const school = await School.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: school,
      message: `School status updated to ${status}`
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    next(error);
  }
};

/**
 * Delete a school (and all associated users)
 * DELETE /api/super-admin/schools/:id
 */
const deleteSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid school ID format' }
      });
    }

    const schoolIdObj = new mongoose.Types.ObjectId(id);

    // Delete all admins/users associated with the school
    await Admin.collection.deleteMany({ schoolId: schoolIdObj });
    await User.deleteMany({ schoolId: id });

    // Delete the school
    const school = await School.findByIdAndDelete(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    const schoolLogoDeleted = school.schoolLogoUrl
      ? await deleteUploadedFile(school.schoolLogoUrl, 'school logo image')
      : false;

    res.status(200).json({
      success: true,
      data: {
        schoolLogoDeleted
      },
      message: 'School and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Delete School Error:', error);
    next(error);
  }
};

/**
 * Get system-wide statistics
 * GET /api/super-admin/stats
 */
const getSystemStats = async (req, res, next) => {
  try {
    const totalSchools = await School.countDocuments();
    const activeSchools = await School.countDocuments({ status: 'Active' });
    const suspendedSchools = await School.countDocuments({ status: 'Suspended' });
    const trialSchools = await School.countDocuments({ status: 'Trial' });

    const totalUsers = await User.countDocuments({ isActive: true });
    const superAdmins = await User.countDocuments({ role: 'Super Admin', isActive: true });
    const schoolAdmins = await User.countDocuments({ role: 'School Admin', isActive: true });
    const teachers = await User.countDocuments({ role: 'Teacher', isActive: true });
    const students = await User.countDocuments({ role: 'Student', isActive: true });
    const parents = await User.countDocuments({ role: 'Parent', isActive: true });

    res.status(200).json({
      success: true,
      data: {
        schools: {
          total: totalSchools,
          active: activeSchools,
          suspended: suspendedSchools,
          trial: trialSchools
        },
        users: {
          total: totalUsers,
          superAdmins,
          schoolAdmins,
          teachers,
          students,
          parents
        }
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    next(error);
  }
};

/**
 * Get all admins for a specific school
 * GET /api/super-admin/schools/:schoolId/admins
 */
const getSchoolAdmins = async (req, res, next) => {
  try {
    const { schoolId } = req.params;

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    // Get all admins for this school from Admin collection (excluding password)
    const admins = await Admin.find({
      schoolId: schoolId,
      role: 'School Admin',
      isActive: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: {
        school: {
          id: school._id,
          schoolName: school.schoolName,
          schoolCode: school.schoolCode
        },
        admins
      },
      message: 'School admins retrieved successfully'
    });
  } catch (error) {
    console.error('Get School Admins Error:', error);
    next(error);
  }
};

/**
 * Update a school admin's details
 * PUT /api/super-admin/schools/:schoolId/admins/:adminId
 */
const updateSchoolAdmin = async (req, res, next) => {
  try {
    const { schoolId, adminId } = req.params;
    const { name, email, phone } = req.body;

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    // Find the admin in Admin collection
    const admin = await Admin.findOne({
      _id: adminId,
      schoolId: schoolId,
      role: 'School Admin'
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: { message: 'School admin not found' }
      });
    }

    // Update fields
    if (name !== undefined) {
      admin.name = name.trim();
    }

    if (email !== undefined) {
      const newEmail = email.toLowerCase().trim();
      // Check if email is already taken by another admin
      if (newEmail !== admin.email) {
        const existingAdmin = await Admin.findOne({ email: newEmail, _id: { $ne: adminId } });
        if (existingAdmin) {
          return res.status(409).json({
            success: false,
            error: { message: 'Email already exists' }
          });
        }
      }
      admin.email = newEmail;
    }

    if (phone !== undefined) {
      admin.phone = phone.trim();
    }

    await admin.save();

    // Return updated admin (excluding password)
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(200).json({
      success: true,
      data: adminResponse,
      message: 'School admin updated successfully'
    });
  } catch (error) {
    console.error('Update School Admin Error:', error);
    next(error);
  }
};

/**
 * Delete a school admin completely from the database
 * DELETE /api/super-admin/schools/:schoolId/admins/:adminId
 *
 * Permanently removes the admin from BOTH the "Admin" and "User"
 * collections (admins may be mirrored in either), then verifies that
 * no record remains before responding.
 */
const deleteSchoolAdmin = async (req, res, next) => {
  try {
    const { schoolId, adminId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(adminId) || !mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid admin ID or school ID format' }
      });
    }

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    // Locate the admin record before deleting it so we can clean up uploaded images.
    // It may live in the Admin collection (created via Super Admin) or in the User collection.

    const adminIdObj = new mongoose.Types.ObjectId(adminId);
    const schoolIdObj = new mongoose.Types.ObjectId(schoolId);
    const adminRecord = await Admin.collection.findOne({ _id: adminIdObj });
    const userRecord = await User.collection.findOne({
      $or: [
        { _id: adminIdObj },
        adminRecord?.email ? { schoolId: schoolIdObj, role: 'School Admin', email: adminRecord.email.toLowerCase() } : {}
      ].filter(Boolean)
    });

    const adminBelongsToSchool = !adminRecord || adminRecord.schoolId?.toString() === schoolId;
    const userBelongsToSchool = !userRecord || userRecord.schoolId?.toString() === schoolId;

    if ((!adminRecord && !userRecord) || !adminBelongsToSchool || !userBelongsToSchool) {
      return res.status(404).json({
        success: false,
        error: { message: 'School admin not found in the database' }
      });
    }

    const adminEmail = adminRecord?.email || userRecord?.email || null;
    const adminName = adminRecord?.name || userRecord?.name || null;
    const schoolLogoUrl = school.schoolLogoUrl || null;

    const uploadedFileUrls = [...new Set([
      adminRecord?.profileImage,
      userRecord?.profileImage,
      schoolLogoUrl
    ].filter(Boolean))];

    const adminDeleteFilters = [
      { _id: adminIdObj }
    ];

    if (adminEmail) {
      adminDeleteFilters.push({ email: adminEmail.toLowerCase(), schoolId: schoolIdObj });
      adminDeleteFilters.push({ email: adminEmail.toLowerCase(), role: 'School Admin' });
    }

    const userDeleteFilters = [
      { _id: adminIdObj }
    ];

    if (adminEmail && userRecord) {
      userDeleteFilters.push({ email: adminEmail.toLowerCase(), schoolId: schoolIdObj, role: 'School Admin' });
    }

    console.log('[Delete School Admin] STEP 1: Raw hard delete on Admin collection...');
    const adminDeleteResult = await Admin.collection.deleteMany({ $or: adminDeleteFilters });
    const adminDeletedCount = adminDeleteResult.deletedCount || 0;
    console.log(`[Delete School Admin] Admin raw delete result: ${adminDeletedCount} record(s)`);

    console.log('[Delete School Admin] STEP 2: Raw hard delete on User collection...');
    const userDeleteResult = await User.collection.deleteMany({ $or: userDeleteFilters });
    const userDeletedCount = userDeleteResult.deletedCount || 0;
    console.log(`[Delete School Admin] User raw delete result: ${userDeletedCount} record(s)`);

    // If still nothing, admin truly doesn't exist
    if (adminDeletedCount === 0 && userDeletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'School admin not found in the database' }
      });
    }

    // Verify the admin is really gone from both collections using raw collection lookups.
    const stillInAdmin = await Admin.collection.findOne({ _id: adminIdObj });
    const stillInUser = await User.collection.findOne({ _id: adminIdObj });
    const stillAdminByEmail = adminEmail
      ? await Admin.collection.findOne({ email: adminEmail.toLowerCase() })
      : null;
    const stillUserByEmail = adminEmail
      ? await User.collection.findOne({ email: adminEmail.toLowerCase() })
      : null;

    if (stillInAdmin || stillInUser || stillAdminByEmail || stillUserByEmail) {
      console.error('[Delete School Admin] FAILED VERIFICATION - records still exist:', {
        stillInAdmin: !!stillInAdmin,
        stillInUser: !!stillInUser,
        stillAdminByEmail: !!stillAdminByEmail,
        stillUserByEmail: !!stillUserByEmail
      });
      return res.status(500).json({
        success: false,
        error: { message: 'Admin deletion could not be verified. Please try again.' }
      });
    }

    console.log(`[Delete School Admin] Verified removal. Admin "${adminName || adminId}" permanently deleted.`);

    const deletedFiles = [];
    for (const fileUrl of uploadedFileUrls) {
      const deleted = await deleteUploadedFile(fileUrl, fileUrl === schoolLogoUrl ? 'school logo image' : 'admin profile image');
      deletedFiles.push({
        fileUrl,
        deleted,
        type: fileUrl === schoolLogoUrl ? 'schoolLogo' : 'adminProfileImage'
      });
    }

    if (schoolLogoUrl && deletedFiles.some(file => file.fileUrl === schoolLogoUrl && file.deleted)) {
      await School.updateOne({ _id: schoolIdObj }, { $unset: { schoolLogoUrl: '' } });
    }

    res.status(200).json({
      success: true,
      data: {
        deletedAdminId: adminId,
        email: adminEmail,
        name: adminName,
        adminCollectionDeleted: adminDeletedCount,
        userCollectionDeleted: userDeletedCount,
        deletedFiles,
        schoolLogoDeleted: deletedFiles.some(file => file.fileUrl === schoolLogoUrl && file.deleted)
      },
      message: 'School admin permanently deleted from the database'
    });
  } catch (error) {
    console.error('Delete School Admin Error:', error);
    next(error);
  }
};

/**
 * Reset a school admin's password
 * POST /api/super-admin/schools/:schoolId/admins/:adminId/reset-password
 */
const resetSchoolAdminPassword = async (req, res, next) => {
  try {
    const { schoolId, adminId } = req.params;
    const { password } = req.body;

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 6 characters long' }
      });
    }

    // Verify school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    // Find the admin in Admin collection (need to include password field for update)
    const admin = await Admin.findOne({
      _id: adminId,
      schoolId: schoolId,
      role: 'School Admin'
    }).select('+password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: { message: 'School admin not found' }
      });
    }

    // Set the new password - the Admin model's pre-save hook will hash it
    // Do NOT pre-hash here as it would cause double-hashing
    admin.password = password;

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'School admin password reset successfully'
    });
  } catch (error) {
    console.error('Reset School Admin Password Error:', error);
    next(error);
  }
};

module.exports = {
  registerSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  updateSchoolStatus,
  deleteSchool,
  getSystemStats,
  getSchoolAdmins,
  updateSchoolAdmin,
  deleteSchoolAdmin,
  resetSchoolAdminPassword
};
