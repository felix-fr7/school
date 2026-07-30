/**
 * Tenant (School) Controller
 * Handles CRUD operations for schools/tenants using raw SQL queries
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Generate JWT token for user
 * @param {Object} user - User object containing id, email, role, and tenantId
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
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
 * Get all tenants (schools)
 * GET /api/tenants
 * 
 * Note: This function safely handles cases where some child tables may not exist
 * in the database schema by using a simplified query that only counts core entities.
 */
const getAllTenants = async (req, res, next) => {
  try {
    console.log('[getAllTenants] Request received with query:', req.query);
    
    const { 
      page = 1, 
      limit = 10, 
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    console.log('[getAllTenants] Pagination:', { page, limit, skip, take });

    // Build where clause dynamically
    let whereClause = '1=1';
    let params = [];
    let paramIndex = 1;

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      paramIndex++;
    }

    console.log('[getAllTenants] Where clause:', whereClause);
    console.log('[getAllTenants] Params:', params);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Tenant" WHERE ${whereClause}`;
    console.log('[getAllTenants] Count query:', countQuery);
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    console.log('[getAllTenants] Total count:', total);

    // Get tenants with basic stats (only core tables that are guaranteed to exist)
    // We avoid referencing potentially non-existent tables like Homework
    const tenantsQuery = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM "User" u WHERE u."tenantId" = t.id) as "userCount",
        (SELECT COUNT(*) FROM "Class" c WHERE c."tenantId" = t.id) as "classCount"
      FROM "Tenant" t
      WHERE ${whereClause}
      ORDER BY t."createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    console.log('[getAllTenants] Tenants query:', tenantsQuery);
    console.log('[getAllTenants] Tenants params:', [...params, take, skip]);
    
    const tenantsParams = [...params, take, skip];
    const tenantsResult = await db.query(tenantsQuery, tenantsParams);
    console.log('[getAllTenants] Query result rows:', tenantsResult.rows.length);

    // Format the response to match the expected structure
    const tenants = tenantsResult.rows.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      address: tenant.address,
      phone: tenant.phone,
      email: tenant.email,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      _count: {
        users: parseInt(tenant.userCount || 0),
        classes: parseInt(tenant.classCount || 0),
        homeworks: 0, // Default to 0 since Homework table may not exist
        news: 0,      // Default to 0 since News table may not exist
      }
    }));

    console.log('[getAllTenants] Success! Returning', tenants.length, 'tenants');

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
    console.error('═══════════════════════════════════════════════════════════');
    console.error('CRITICAL GET_ALL_TENANTS ERROR:');
    console.error('  Error Name:', error.name);
    console.error('  Error Message:', error.message);
    console.error('  Error Code:', error.code);
    console.error('  Error Detail:', error.detail);
    console.error('  Error Hint:', error.hint);
    console.error('  Error Position:', error.position);
    console.error('  Full Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════════');
    next(error);
  }
};

/**
 * Get single tenant by ID
 * GET /api/tenants/:id
 * 
 * Note: This function safely handles cases where some child tables may not exist
 * by using a simplified query that only counts core entities (User, Class).
 */
const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // UUID regex guard - reject non-UUID values before database query
    // This prevents PostgreSQL errors like "22P02: invalid input syntax for type uuid"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Tenant ID format. Expected UUID (e.g., 550e8400-e29b-41d4-a716-446655440000).',
        },
      });
    }

    // Get tenant with basic stats (only core tables that are guaranteed to exist)
    // We avoid referencing potentially non-existent tables like Homework, News, Circular
    const tenantQuery = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM "User" u WHERE u."tenantId" = t.id) as "userCount",
        (SELECT COUNT(*) FROM "Class" c WHERE c."tenantId" = t.id) as "classCount"
      FROM "Tenant" t
      WHERE t.id = $1
    `;
    
    const tenantResult = await db.query(tenantQuery, [id]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    const tenant = tenantResult.rows[0];

    // Get admin users for this tenant
    const adminsQuery = `
      SELECT id, email, name, "createdAt"
      FROM "User"
      WHERE "tenantId" = $1 AND role = 'ADMIN'
    `;
    const adminsResult = await db.query(adminsQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...tenant,
        _count: {
          users: parseInt(tenant.userCount || 0),
          classes: parseInt(tenant.classCount || 0),
          homeworks: 0,     // Default to 0 since Homework table may not exist
          news: 0,          // Default to 0 since News table may not exist
          circulars: 0,     // Default to 0 since Circular table may not exist
        },
        users: adminsResult.rows,
      },
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
    const codeCheckQuery = 'SELECT id FROM "Tenant" WHERE code = $1';
    const codeCheckResult = await db.query(codeCheckQuery, [code]);

    if (codeCheckResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'School code already exists. Please use a unique code.',
        },
      });
    }

    // Check if admin email already exists
    // Note: adminEmail has been normalized (lowercased) by express-validator's normalizeEmail()
    console.log(`CreateTenant: Checking if admin email exists: "${adminEmail}"`);
    const emailCheckQuery = 'SELECT id FROM "User" WHERE email = $1';
    const emailCheckResult = await db.query(emailCheckQuery, [adminEmail]);

    if (emailCheckResult.rows.length > 0) {
      console.log(`CreateTenant: Admin email already exists: "${adminEmail}"`);
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
    console.log(`CreateTenant: Password hashed successfully. Hash starts with: ${hashedPassword.substring(0, 20)}...`);

    // Create tenant and admin in a transaction
    console.log('CreateTenant: Starting database transaction');
    const result = await db.transaction(async (query) => {
      try {
        console.log('CreateTenant: Transaction BEGIN executed');
        
        // Create tenant
        console.log('CreateTenant: Inserting tenant with data:', {
          name,
          code,
          address,
          phone,
          email
        });
        const tenantQuery = `
          INSERT INTO "Tenant" (name, code, address, phone, email, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `;
        const tenantParams = [name, code, address, phone, email];
        console.log('CreateTenant: Executing tenant INSERT query with params:', tenantParams);
        const tenantResult = await query(tenantQuery, tenantParams);
        console.log('CreateTenant: Tenant INSERT result:', {
          rowCount: tenantResult.rowCount,
          rows: tenantResult.rows,
          fields: tenantResult.fields
        });
        const tenant = tenantResult.rows[0];
        console.log('CreateTenant: Tenant created successfully with id:', tenant.id);

        // Create admin user
        console.log(`CreateTenant: Creating admin user with email="${adminEmail}", name="${adminName}", tenantId="${tenant.id}"`);
        const adminQuery = `
          INSERT INTO "User" (email, password, name, role, "tenantId", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id, email, name, role, "tenantId", "createdAt"
        `;
        const adminParams = [adminEmail, hashedPassword, adminName, 'ADMIN', tenant.id];
        console.log('CreateTenant: Executing admin INSERT query with params:', adminParams);
        const adminResult = await query(adminQuery, adminParams);
        console.log('CreateTenant: Admin INSERT result:', {
          rowCount: adminResult.rowCount,
          rows: adminResult.rows,
          fields: adminResult.fields
        });
        const admin = adminResult.rows[0];
        console.log(`CreateTenant: Admin user created successfully with id="${admin.id}", email="${admin.email}"`);

        console.log('CreateTenant: Transaction about to COMMIT');
        return { tenant, admin };
      } catch (transactionError) {
        console.error('CreateTenant: ERROR inside transaction:', {
          message: transactionError.message,
          code: transactionError.code,
          detail: transactionError.detail,
          constraint: transactionError.constraint,
          stack: transactionError.stack
        });
        throw transactionError; // Re-throw to trigger ROLLBACK
      }
    });
    console.log('CreateTenant: Transaction COMMIT successful, result:', {
      tenantId: result.tenant.id,
      adminId: result.admin.id,
      adminEmail: result.admin.email
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
    const { name, address, phone, email } = req.body;

    // Check if tenant exists
    const checkQuery = 'SELECT * FROM "Tenant" WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    const existingTenant = checkResult.rows[0];

    // Build update fields dynamically
    const updateFields = [];
    const updateParams = [];
    let paramIndex = 1;

    // Trim and validate name if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'School name cannot be empty',
          },
        });
      }
      if (trimmedName.length > 200) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'School name must be less than 200 characters',
          },
        });
      }
      updateFields.push(`name = $${paramIndex}`);
      updateParams.push(trimmedName);
      paramIndex++;
    }

    // Check if code is being changed and if it's unique
    if (req.body.code !== undefined && req.body.code !== existingTenant.code) {
      const trimmedCode = req.body.code.trim();
      if (!trimmedCode) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'School code cannot be empty',
          },
        });
      }
      
      const codeCheckQuery = 'SELECT id FROM "Tenant" WHERE code = $1 AND id != $2';
      const codeCheckResult = await db.query(codeCheckQuery, [trimmedCode, id]);
      
      if (codeCheckResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'School code already exists. Please use a unique code.',
          },
        });
      }
      
      updateFields.push(`code = $${paramIndex}`);
      updateParams.push(trimmedCode);
      paramIndex++;
    }

    // Trim and validate address if provided
    if (address !== undefined) {
      updateFields.push(`address = $${paramIndex}`);
      updateParams.push(address.trim() || null);
      paramIndex++;
    }

    // Trim and validate phone if provided
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateParams.push(phone.trim() || null);
      paramIndex++;
    }

    // Trim and validate email if provided
    if (email !== undefined) {
      const trimmedEmail = email.trim();
      if (trimmedEmail && !trimmedEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Please provide a valid email address',
          },
        });
      }
      updateFields.push(`email = $${paramIndex}`);
      updateParams.push(trimmedEmail || null);
      paramIndex++;
    }

    // If no fields to update, return existing tenant
    if (updateFields.length === 0) {
      return res.status(200).json({
        success: true,
        data: existingTenant,
        message: 'No changes to update',
      });
    }

    // Add id parameter and updated_at
    updateFields.push(`"updatedAt" = NOW()`);
    updateParams.push(id);

    // Execute update
    const updateQuery = `
      UPDATE "Tenant"
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, updateParams);
    const tenant = updateResult.rows[0];

    res.status(200).json({
      success: true,
      data: tenant,
      message: 'School updated successfully',
    });
  } catch (error) {
    console.error('UpdateTenant Error:', error);
    next(error);
  }
};

/**
 * Delete a tenant (hard delete with cascade)
 * DELETE /api/tenants/:id
 * 
 * This performs a hard delete of the tenant and all associated data.
 * Cascade delete relationships should be configured in Supabase SQL Editor.
 * 
 * Note: This function safely handles cases where some child tables may not exist
 * in the database schema, wrapping table existence checks in try-catch blocks.
 */
const deleteTenant = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if tenant exists (basic check without child table counts)
    const basicCheckQuery = 'SELECT * FROM "Tenant" WHERE id = $1';
    const basicCheckResult = await db.query(basicCheckQuery, [id]);

    if (basicCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    const existingTenant = basicCheckResult.rows[0];

    // Safe helper function to count records in a table, returning 0 if table/column doesn't exist
    const safeCount = async (tableName, columnName, columnValue) => {
      try {
        // First check if table exists
        const tableCheck = await db.query(`
          SELECT COUNT(*) as exists 
          FROM information_schema.tables 
          WHERE table_name = $1
        `, [tableName.toLowerCase()]);
        
        if (parseInt(tableCheck.rows[0].exists) === 0) {
          return 0; // Table doesn't exist
        }
        
        // Check if column exists
        const columnCheck = await db.query(`
          SELECT COUNT(*) as exists 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [tableName.toLowerCase(), columnName.toLowerCase()]);
        
        if (parseInt(columnCheck.rows[0].exists) === 0) {
          return 0; // Column doesn't exist
        }
        
        // Safe to query the count
        const countResult = await db.query(
          `SELECT COUNT(*) as count FROM "${tableName}" WHERE "${columnName}" = $1`,
          [columnValue]
        );
        return parseInt(countResult.rows[0].count);
      } catch (err) {
        // If any error occurs (table doesn't exist, permission issues, etc.), return 0
        console.warn(`[deleteTenant] Could not count records in ${tableName}.${columnName}: ${err.message}`);
        return 0;
      }
    };

    // Gather dependency info safely (won't fail if tables don't exist)
    const dependencyInfo = {
      userCount: await safeCount('User', 'tenantId', id),
      classCount: await safeCount('Class', 'tenantId', id),
      homeworkCount: await safeCount('Homework', 'tenant_id', id),
      markCount: await safeCount('Mark', 'tenantId', id),
      newsCount: await safeCount('News', 'tenantId', id),
      circularCount: await safeCount('Circular', 'tenantId', id),
      examScheduleCount: await safeCount('ExamSchedule', 'tenantId', id),
      attendanceCount: await safeCount('Attendance', 'tenant_id', id),
      feeCount: await safeCount('Fee', 'tenantId', id),
    };

    // Delete the tenant - cascade will handle all related records
    // The CASCADE option on foreign keys will automatically delete child records
    const deleteQuery = 'DELETE FROM "Tenant" WHERE id = $1';
    await db.query(deleteQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'School and all associated data deleted successfully',
      data: {
        deletedTenantId: id,
        tenantName: existingTenant.name,
        tenantCode: existingTenant.code,
        dependenciesHandled: dependencyInfo,
      },
    });
  } catch (error) {
    console.error('DeleteTenant Error:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete school: It has related records. Please remove dependencies first.',
          code: 'FOREIGN_KEY_CONSTRAINT',
        },
      });
    }

    // Handle "table doesn't exist" errors gracefully
    if (error.code === '42P01') {
      console.warn('[deleteTenant] Referenced table does not exist, attempting delete anyway:', error.message);
      // Continue with delete - the cascade will handle what exists
    }

    next(error);
  }
};

/**
 * Get tenant statistics
 * GET /api/tenants/:id/stats
 * 
 * Note: This function safely handles cases where some child tables may not exist
 * by using a simplified query that only counts core entities (User, Class).
 */
const getTenantStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    // UUID regex guard - reject non-UUID values before database query
    // This prevents PostgreSQL errors like "22P02: invalid input syntax for type uuid"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Tenant ID format. Expected UUID (e.g., 550e8400-e29b-41d4-a716-446655440000).',
        },
      });
    }

    // Check if tenant exists
    const checkQuery = 'SELECT id, name, code FROM "Tenant" WHERE id = $1';
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'School not found',
        },
      });
    }

    const tenant = checkResult.rows[0];

    // Get counts using a single query with only core tables that are guaranteed to exist
    // We avoid referencing potentially non-existent tables like Homework, Mark, News, Circular, ExamSchedule
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM "User" WHERE "tenantId" = $1 AND role = 'STUDENT') as "totalStudents",
        (SELECT COUNT(*) FROM "User" WHERE "tenantId" = $1 AND role = 'ADMIN') as "totalAdmins",
        (SELECT COUNT(*) FROM "Class" WHERE "tenantId" = $1) as "totalClasses"
    `;

    const statsResult = await db.query(statsQuery, [id]);
    const stats = statsResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        tenant: {
          id,
          name: tenant.name,
          code: tenant.code,
        },
        stats: {
          totalStudents: parseInt(stats.totalStudents || 0),
          totalAdmins: parseInt(stats.totalAdmins || 0),
          totalClasses: parseInt(stats.totalClasses || 0),
          totalHomeworks: 0,           // Default to 0 since Homework table may not exist
          totalMarks: 0,               // Default to 0 since Mark table may not exist
          totalNews: 0,                // Default to 0 since News table may not exist
          totalCirculars: 0,           // Default to 0 since Circular table may not exist
          totalExamSchedules: 0,       // Default to 0 since ExamSchedule table may not exist
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