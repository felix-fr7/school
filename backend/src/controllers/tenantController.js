/**
 * Tenant (School) Controller
 * Handles CRUD operations for schools/tenants
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate JWT token for user
 * @param {Object} user - User object containing id and email
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Get all tenants (schools)
 * GET /api/tenants
 */
const getAllTenants = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      isActive 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get total count
    const total = await prisma.tenant.count({ where });

    // Get tenants with stats
    const tenants = await prisma.tenant.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            users: true,
            classes: true,
            homeworks: true,
            news: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

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

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            classes: true,
            homeworks: true,
            news: true,
            circulars: true,
          }
        },
        users: {
          where: { role: 'ADMIN' },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          }
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new tenant (school) with admin credentials
 * POST /api/tenants
 */
const createTenant = async (req, res, next) => {
  try {
    const {
      name,
      code,
      address,
      phone,
      email,
      adminEmail,
      adminPassword,
      adminName,
    } = req.body;

    // Check if code already exists
    const existingCode = await prisma.tenant.findUnique({
      where: { code },
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'School code already exists. Please use a unique code.',
        },
      });
    }

    // Check if admin email already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Admin with this email already exists.',
        },
      });
    }

    // Hash admin password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create tenant and admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          code,
          address,
          phone,
          email,
        },
      });

      // Create admin user
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          createdAt: true,
        },
      });

      return { tenant, admin };
    });

    // Generate token for admin
    const token = generateToken(result.admin);

    res.status(201).json({
      success: true,
      data: {
        tenant: result.tenant,
        admin: {
          ...result.admin,
          token,
        },
      },
      message: 'School and admin created successfully',
    });
  } catch (error) {
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
    const { name, address, phone, email, isActive } = req.body;

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    // Check if code is being changed and if it's unique
    if (req.body.code && req.body.code !== existingTenant.code) {
      const codeExists = await prisma.tenant.findUnique({
        where: { code: req.body.code },
      });

      if (codeExists) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'School code already exists. Please use a unique code.',
          },
        });
      }
    }

    // Update tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        name,
        code: req.body.code,
        address,
        phone,
        email,
        isActive,
      },
    });

    res.status(200).json({
      success: true,
      data: tenant,
      message: 'School updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a tenant (soft delete by setting isActive = false)
 * DELETE /api/tenants/:id
 */
const deleteTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    // Soft delete by setting isActive = false
    await prisma.tenant.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      message: 'School deactivated successfully',
    });
  } catch (error) {
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

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    // Get counts
    const [
      totalStudents,
      totalAdmins,
      totalClasses,
      totalHomeworks,
      totalMarks,
      totalNews,
      totalCirculars,
      totalExamSchedules,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId: id, role: 'STUDENT' } }),
      prisma.user.count({ where: { tenantId: id, role: 'ADMIN' } }),
      prisma.class.count({ where: { tenantId: id } }),
      prisma.homework.count({ where: { tenantId: id } }),
      prisma.mark.count({ where: { tenantId: id } }),
      prisma.news.count({ where: { tenantId: id } }),
      prisma.circular.count({ where: { tenantId: id } }),
      prisma.examSchedule.count({ where: { tenantId: id } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        tenant: {
          id,
          name: tenant.name,
          code: tenant.code,
        },
        stats: {
          totalStudents,
          totalAdmins,
          totalClasses,
          totalHomeworks,
          totalMarks,
          totalNews,
          totalCirculars,
          totalExamSchedules,
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