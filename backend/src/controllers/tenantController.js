/**
 * Tenant (School) Controller - MongoDB / Mongoose Version
 * Handles CRUD operations for schools/tenants using Mongoose models
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const School = require('../models/School'); // Ungaloda School Mongoose Model
const User = require('../models/User');     // Ungaloda User Mongoose Model
const Class = require('../models/Class');   // Ungaloda Class Mongoose Model

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Get all tenants (schools) with search and pagination
 * GET /api/tenants
 */
const getAllTenants = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { schoolName: searchRegex },
          { schoolCode: searchRegex },
          { contactEmail: searchRegex }
        ]
      };
    }

    const total = await School.countDocuments(query);
    const schools = await School.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean();

    // Attach counts for users and classes dynamically
    const tenants = await Promise.all(
      schools.map(async (school) => {
        const userCount = await User.countDocuments({ tenantId: school._id });
        const classCount = await Class.countDocuments({ tenantId: school._id });

        return {
          id: school._id,
          name: school.schoolName,
          code: school.schoolCode,
          address: school.address,
          phone: school.contactPhone,
          email: school.contactEmail,
          createdAt: school.createdAt,
          updatedAt: school.updatedAt,
          _count: {
            users: userCount,
            classes: classCount,
            homeworks: 0,
            news: 0,
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        tenants,
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
 * Get single tenant by ID
 * GET /api/tenants/:id
 */
const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    const tenant = await School.findById(id).lean();
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    const userCount = await User.countDocuments({ tenantId: id });
    const classCount = await Class.countDocuments({ tenantId: id });
    const admins = await User.find({ tenantId: id, role: 'School Admin' }).select('email name createdAt').lean();

    res.status(200).json({
      success: true,
      data: {
        ...tenant,
        id: tenant._id,
        name: tenant.schoolName,
        code: tenant.schoolCode,
        phone: tenant.contactPhone,
        email: tenant.contactEmail,
        _count: {
          users: userCount,
          classes: classCount,
          homeworks: 0,
          news: 0,
          circulars: 0,
        },
        users: admins,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new tenant (school) with admin credentials using Transactions
 * POST /api/tenants
 */
const createTenant = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      schoolName,
      schoolCode,
      address,
      contactPhone,
      contactEmail,
      adminEmail,
      adminPassword,
      adminName,
    } = req.body;

    const existingCode = await School.findOne({ schoolCode }).session(session);
    if (existingCode) {
      await session.endSession();
      return res.status(409).json({
        success: false,
        error: { message: 'School code already exists. Please use a unique code.' },
      });
    }

    const existingAdmin = await User.findOne({ email: adminEmail }).session(session);
    if (existingAdmin) {
      await session.endSession();
      return res.status(409).json({
        success: false,
        error: { message: 'Admin with this email already exists.' },
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create School using exact schema keys
    const newSchool = new School({
      schoolName,
      schoolCode,
      address,
      contactPhone,
      contactEmail,
    });
    await newSchool.save({ session });

    // Create Admin User mapped to School's ID (tenantId)
    const newAdmin = new User({
      email: adminEmail,
      password: hashedPassword,
      name: adminName,
      role: 'School Admin', // <-- Fixed role enum value
      tenantId: newSchool._id,
    });
    await newAdmin.save({ session });

    await session.commitTransaction();
    session.endSession();

    const token = generateToken(newAdmin);

    res.status(201).json({
      success: true,
      data: {
        tenant: newSchool,
        admin: {
          id: newAdmin._id,
          email: newAdmin.email,
          name: newAdmin.name,
          role: newAdmin.role,
          tenantId: newAdmin.tenantId,
          createdAt: newAdmin.createdAt,
          token,
        },
      },
      message: 'School and admin created successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Update tenant information
 * PUT /api/tenants/:id
 */
const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schoolName, schoolCode, address, contactPhone, contactEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    const existingTenant = await School.findById(id);
    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    let updateData = {};
    if (schoolName !== undefined) updateData.schoolName = schoolName.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail.trim();

    if (schoolCode !== undefined && schoolCode.trim() !== existingTenant.schoolCode) {
      const codeCheck = await School.findOne({ schoolCode: schoolCode.trim(), _id: { $ne: id } });
      if (codeCheck) {
        return res.status(409).json({
          success: false,
          error: { message: 'School code already exists. Please use a unique code.' },
        });
      }
      updateData.schoolCode = schoolCode.trim();
    }

    const updatedTenant = await School.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      data: updatedTenant,
      message: 'School updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a tenant and its related records (Users, Classes)
 * DELETE /api/tenants/:id
 */
const deleteTenant = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.endSession();
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    const existingTenant = await School.findById(id).session(session);
    if (!existingTenant) {
      await session.endSession();
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    const userCount = await User.countDocuments({ tenantId: id }).session(session);
    const classCount = await Class.countDocuments({ tenantId: id }).session(session);

    // Delete associated records inside transaction
    await User.deleteMany({ tenantId: id }).session(session);
    await Class.deleteMany({ tenantId: id }).session(session);
    await School.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'School and all associated data deleted successfully',
      data: {
        deletedTenantId: id,
        tenantName: existingTenant.schoolName,
        tenantCode: existingTenant.schoolCode,
        dependenciesHandled: { userCount, classCount },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Get tenant statistics
 * GET /api/tenants/:id/stats
 */
const getTenantStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    const tenant = await School.findById(id).lean();
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    const totalStudents = await User.countDocuments({ tenantId: id, role: 'Student' });
    const totalAdmins = await User.countDocuments({ tenantId: id, role: 'School Admin' });
    const totalClasses = await Class.countDocuments({ tenantId: id });

    res.status(200).json({
      success: true,
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.schoolName,
          code: tenant.schoolCode,
        },
        stats: {
          totalStudents,
          totalAdmins,
          totalClasses,
          totalHomeworks: 0,
          totalMarks: 0,
          totalNews: 0,
          totalCirculars: 0,
          totalExamSchedules: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantStats,
};