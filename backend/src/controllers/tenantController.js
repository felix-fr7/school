/**
 * Tenant (School) Controller - MongoDB / Mongoose Version
 * Handles CRUD operations for schools/tenants using Mongoose models
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const School = require('../models/School'); // Ungaloda School Mongoose Model
const User = require('../models/User');     // Ungaloda User Mongoose Model
const Admin = require('../models/Admin');   // Ungaloda Admin Mongoose Model
const Class = require('../models/Class');   // Ungaloda Class Mongoose Model
const { deleteFile, resolveFileUrl } = require('../middleware/fileUpload');

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

const deleteUploadedLogo = async (logoUrl) => {
  if (!logoUrl) return;

  try {
    await deleteFile(logoUrl);
    console.log(`[Create Tenant] Deleted uploaded logo after failed creation: ${logoUrl}`);
  } catch (error) {
    console.error('[Create Tenant] Failed to delete uploaded logo after failed creation:', error.message);
  }
};

const deleteUploadedFileIfExists = async (fileUrl) => {
  if (!fileUrl) return false;

  try {
    await deleteFile(fileUrl);
    console.log(`[Delete Tenant] Deleted uploaded file: ${fileUrl}`);
    return true;
  } catch (error) {
    console.error('[Delete Tenant] Failed to delete uploaded file:', error.message);
    return false;
  }
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
  const uploadedLogoUrl = req.file ? resolveFileUrl(req.file, 'images') : null;

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
      await session.abortTransaction();
      await session.endSession();
      await deleteUploadedLogo(uploadedLogoUrl);
      return res.status(409).json({
        success: false,
        error: { message: 'School code already exists. Please use a unique code.' },
      });
    }

    // Check if admin email already exists in Admin collection
    const existingAdmin = await Admin.findOne({ email: adminEmail.toLowerCase() }).session(session);
    if (existingAdmin) {
      await session.abortTransaction();
      await session.endSession();
      await deleteUploadedLogo(uploadedLogoUrl);
      return res.status(409).json({
        success: false,
        error: { message: 'Admin with this email already exists.' },
      });
    }

    // Create School using exact schema keys
    const newSchool = new School({
      schoolName,
      schoolCode,
      address,
      contactPhone,
      contactEmail,
      schoolLogoUrl: req.file ? resolveFileUrl(req.file, 'images') : undefined,
    });
    await newSchool.save({ session });

    // Create Admin in the dedicated Admin collection
    // Note: Do NOT pre-hash the password here - the Admin model's pre-save hook
    // will hash it automatically. Pre-hashing causes double-hashing which breaks login.
    const newAdmin = new Admin({
      email: adminEmail.toLowerCase(),
      password: adminPassword, // Will be hashed by Admin model's pre-save hook
      name: adminName,
      role: 'School Admin',
      schoolId: newSchool._id, // Link to the school
      isActive: true,
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
          schoolId: newAdmin.schoolId,
          createdAt: newAdmin.createdAt,
          token,
        },
      },
      message: 'School and admin created successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    await deleteUploadedLogo(uploadedLogoUrl);
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
      await session.abortTransaction();
      await session.endSession();
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    const existingTenant = await School.findById(id).session(session);
    if (!existingTenant) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    const deletedLogoUrl = existingTenant.schoolLogoUrl || null;

    const userCount = await User.countDocuments({ tenantId: id }).session(session);
    const classCount = await Class.countDocuments({ tenantId: id }).session(session);

    // Delete associated records inside transaction
    await User.deleteMany({ tenantId: id }).session(session);
    await Class.deleteMany({ tenantId: id }).session(session);
    await School.findByIdAndDelete(id).session(session);

    await session.commitTransaction();
    await session.endSession();

    let schoolLogoDeleted = false;
    if (deletedLogoUrl) {
      schoolLogoDeleted = await deleteUploadedFileIfExists(deletedLogoUrl);
    }

    res.status(200).json({
      success: true,
      message: 'School and all associated data deleted successfully',
      data: {
        deletedTenantId: id,
        tenantName: existingTenant.schoolName,
        tenantCode: existingTenant.schoolCode,
        dependenciesHandled: { userCount, classCount },
        schoolLogoDeleted,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
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

/**
 * Upload / replace a school logo
 * PUT /api/tenants/:id/logo
 */
const uploadSchoolLogo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please upload a logo image file.' },
      });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    // Delete the old logo file (if any) before saving the new one
    const oldLogoUrl = school.schoolLogoUrl;
    school.schoolLogoUrl = resolveFileUrl(req.file, 'images');
    await school.save();

    if (oldLogoUrl) {
      try {
        await deleteFile(oldLogoUrl);
      } catch (fileErr) {
        console.error('[Upload School Logo] Failed to delete old logo file:', fileErr);
      }
    }

    res.status(200).json({
      success: true,
      data: { id: school._id, schoolLogoUrl: school.schoolLogoUrl },
      message: 'School logo uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a school logo
 * DELETE /api/tenants/:id/logo
 */
const deleteSchoolLogo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid Tenant ID format.' },
      });
    }

    const school = await School.findById(id);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { message: 'School not found' },
      });
    }

    const oldLogoUrl = school.schoolLogoUrl;
    if (oldLogoUrl) {
      school.schoolLogoUrl = null;
      await school.save();

      try {
        await deleteFile(oldLogoUrl);
      } catch (fileErr) {
        console.error('[Delete School Logo] Failed to delete logo file:', fileErr);
      }
    }

    res.status(200).json({
      success: true,
      data: { id: school._id, schoolLogoUrl: null },
      message: 'School logo removed successfully',
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
  uploadSchoolLogo,
  deleteSchoolLogo,
};