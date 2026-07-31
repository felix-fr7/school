/**
 * SuperAdmin Controller
 * Handles all super admin operations including tenant management
 * Uses MongoDB/Mongoose queries
 */

const Tenant = require('../../models/Tenant');
const User = require('../../models/User');
const Class = require('../../models/Class');
const { mongoose } = require('../../config/db');

/**
 * Get system statistics
 * GET /api/superadmin/stats
 */
const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalTenants,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalClasses
    ] = await Promise.all([
      Tenant.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: 'STUDENT' }),
      User.countDocuments({ role: 'TEACHER' }),
      Class.countDocuments()
    ]);

    const activeTenants = await Tenant.countDocuments({ status: 'ACTIVE' });

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalUsers,
        totalStudents,
        totalTeachers,
        totalClasses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system configuration
 * GET /api/superadmin/system-config
 */
const getSystemConfig = async (req, res, next) => {
  try {
    const config = {
      version: process.env.APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        host: mongoose.connection.host || 'Atlas',
        name: mongoose.connection.name
      },
      features: {
        multiTenant: true,
        classBasedLogin: true,
        fileStorage: true
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check database latency
 * GET /api/superadmin/db-latency
 */
const checkDbLatency = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Simple ping to MongoDB
    await mongoose.connection.db.admin().ping();
    
    const latency = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        latency: `${latency}ms`,
        status: latency < 100 ? 'healthy' : latency < 500 ? 'warning' : 'critical',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new tenant
 * POST /api/superadmin/tenants
 */
const createTenant = async (req, res, next) => {
  try {
    const { name, domainSlug, code, address, phone, email, subscriptionPlan } = req.body;

    // Check if domain slug or code already exists
    const existingTenant = await Tenant.findOne({
      $or: [{ domainSlug }, { code }]
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this domain slug or code already exists'
      });
    }

    const tenant = new Tenant({
      name,
      domainSlug,
      code,
      address,
      phone,
      email,
      subscriptionPlan
    });

    await tenant.save();

    res.status(201).json({
      success: true,
      data: tenant
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this domain slug or code already exists'
      });
    }
    next(error);
  }
};

/**
 * Get all tenants with pagination
 * GET /api/superadmin/tenants
 */
const getAllTenants = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domainSlug: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Tenant.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tenants,
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
};

/**
 * Get single tenant by ID
 * GET /api/superadmin/tenants/:id
 */
const getTenantById = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get counts for this tenant
    const [userCount, classCount] = await Promise.all([
      User.countDocuments({ tenantId: tenant._id }),
      Class.countDocuments({ tenantId: tenant._id })
    ]);

    res.json({
      success: true,
      data: {
        ...tenant.toObject(),
        stats: { userCount, classCount }
      }
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invalid tenant ID'
      });
    }
    next(error);
  }
};

/**
 * Update tenant
 * PATCH /api/superadmin/tenants/:id
 */
const updateTenant = async (req, res, next) => {
  try {
    const { name, address, phone, email, subscriptionPlan, maxUsers, maxStudents, settings } = req.body;

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      {
        name,
        address,
        phone,
        email,
        subscriptionPlan,
        maxUsers,
        maxStudents,
        settings,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invalid tenant ID'
      });
    }
    next(error);
  }
};

/**
 * Update tenant status
 * PATCH /api/superadmin/tenants/:id/status
 */
const updateTenantStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACTIVE, SUSPENDED, or INACTIVE'
      });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invalid tenant ID'
      });
    }
    next(error);
  }
};

/**
 * Delete tenant (soft delete)
 * DELETE /api/superadmin/tenants/:id
 */
const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Soft delete the tenant
    await tenant.softDelete();

    // Deactivate all users in this tenant
    await User.updateMany(
      { tenantId: tenant._id },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invalid tenant ID'
      });
    }
    next(error);
  }
};

module.exports = {
  getSystemStats,
  getSystemConfig,
  checkDbLatency,
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
  updateTenantStatus,
  deleteTenant
};