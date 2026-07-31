/**
 * Super Admin Controller
 * Handles school registration, tenant management, and system-wide operations
 * Phase 5 Implementation
 */

const School = require('../models/School');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

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

    // Check if admin email already exists
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        error: { message: 'Admin email already exists' }
      });
    }

    // Hash admin password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

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

      // Create admin user
      const admin = new User({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
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

    // Delete all users associated with the school
    await User.deleteMany({ schoolId: id });

    // Delete the school
    const school = await School.findByIdAndDelete(id);

    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' }
      });
    }

    res.status(200).json({
      success: true,
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

module.exports = {
  registerSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  updateSchoolStatus,
  deleteSchool,
  getSystemStats
};