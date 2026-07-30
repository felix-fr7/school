/**
 * SuperAdmin Controller
 * Handles tenant management operations for SUPER_ADMIN users
 */

const { query } = require('../config/db');

/**
 * Create a new tenant
 * POST /api/superadmin/tenants
 */
const createTenant = async (req, res) => {
  try {
    const { name, domain_slug, subscription_plan, max_users, max_students, settings } = req.body;

    // Validation
    if (!name || !domain_slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and domain_slug are required.'
      });
    }

    // Check if domain_slug already exists
    const existingTenant = await query(
      'SELECT id FROM tenants WHERE domain_slug = $1 AND deleted_at IS NULL',
      [domain_slug]
    );

    if (existingTenant && existingTenant.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Domain slug already exists. Please choose a unique slug.'
      });
    }

    // Create tenant
    const result = await query(
      `INSERT INTO tenants (name, domain_slug, subscription_plan, max_users, max_students, settings) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, domain_slug, status, subscription_plan, max_users, max_students, settings, created_at`,
      [
        name,
        domain_slug,
        subscription_plan || 'FREE',
        max_users || 100,
        max_students || 1000,
        JSON.stringify(settings || {})
      ]
    );

    const tenant = result[0];

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully.',
      data: tenant
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error creating tenant:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating tenant.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all tenants
 * GET /api/superadmin/tenants
 */
const getAllTenants = async (req, res) => {
  try {
    const { status, subscription_plan, page = 1, limit = 20, search } = req.query;

    // Build dynamic query
    let whereClauses = ['deleted_at IS NULL'];
    let params = [];
    let paramIndex = 1;

    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (subscription_plan) {
      whereClauses.push(`subscription_plan = $${paramIndex}`);
      params.push(subscription_plan);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(name ILIKE $${paramIndex} OR domain_slug ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM tenants WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult[0].total);

    // Get paginated results
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const tenants = await query(
      `SELECT id, name, domain_slug, status, subscription_plan, max_users, max_students, settings, created_at, updated_at 
       FROM tenants 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Get admin count for each tenant
    const tenantsWithAdminCount = await Promise.all(
      tenants.map(async (tenant) => {
        const adminCount = await query(
          'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role IN ($2, $3) AND is_active = TRUE AND deleted_at IS NULL',
          [tenant.id, 'TENANT_ADMIN', 'ADMIN']
        );

        return {
          ...tenant,
          admin_count: parseInt(adminCount[0].count)
        };
      })
    );

    res.json({
      success: true,
      data: {
        tenants: tenantsWithAdminCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error fetching tenants:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenants.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single tenant by ID
 * GET /api/superadmin/tenants/:id
 */
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenants = await query(
      `SELECT id, name, domain_slug, status, subscription_plan, max_users, max_students, settings, created_at, updated_at 
       FROM tenants 
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    const tenant = tenants[0];

    // Get additional stats
    const userCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND is_active = TRUE AND deleted_at IS NULL',
      [id]
    );

    const adminCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role IN ($2, $3) AND is_active = TRUE AND deleted_at IS NULL',
      [id, 'TENANT_ADMIN', 'ADMIN']
    );

    res.json({
      success: true,
      data: {
        ...tenant,
        stats: {
          total_users: parseInt(userCount[0].count),
          total_admins: parseInt(adminCount[0].count)
        }
      }
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error fetching tenant:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenant.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update tenant status (suspend/activate)
 * PATCH /api/superadmin/tenants/:id/status
 */
const updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACTIVE or SUSPENDED.'
      });
    }

    // Check if tenant exists
    const existingTenant = await query(
      'SELECT id, status FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!existingTenant || existingTenant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    // Update status
    const result = await query(
      `UPDATE tenants 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, name, domain_slug, status, subscription_plan, created_at, updated_at`,
      [status, id]
    );

    const tenant = result[0];

    res.json({
      success: true,
      message: `Tenant ${status === 'ACTIVE' ? 'activated' : 'suspended'} successfully.`,
      data: tenant
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error updating tenant status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating tenant status.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update tenant details
 * PATCH /api/superadmin/tenants/:id
 */
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, domain_slug, subscription_plan, max_users, max_students, settings } = req.body;

    // Check if tenant exists
    const existingTenant = await query(
      'SELECT id, domain_slug FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!existingTenant || existingTenant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    // Check if new domain_slug is unique (if provided)
    if (domain_slug && domain_slug !== existingTenant[0].domain_slug) {
      const duplicateSlug = await query(
        'SELECT id FROM tenants WHERE domain_slug = $1 AND id != $2 AND deleted_at IS NULL',
        [domain_slug, id]
      );

      if (duplicateSlug && duplicateSlug.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Domain slug already exists.'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (domain_slug) {
      updates.push(`domain_slug = $${paramIndex}`);
      params.push(domain_slug);
      paramIndex++;
    }

    if (subscription_plan) {
      updates.push(`subscription_plan = $${paramIndex}`);
      params.push(subscription_plan);
      paramIndex++;
    }

    if (max_users !== undefined) {
      updates.push(`max_users = $${paramIndex}`);
      params.push(max_users);
      paramIndex++;
    }

    if (max_students !== undefined) {
      updates.push(`max_students = $${paramIndex}`);
      params.push(max_students);
      paramIndex++;
    }

    if (settings) {
      updates.push(`settings = $${paramIndex}`);
      params.push(JSON.stringify(settings));
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(
      `UPDATE tenants 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING id, name, domain_slug, status, subscription_plan, max_users, max_students, settings, created_at, updated_at`,
      params
    );

    const tenant = result[0];

    res.json({
      success: true,
      message: 'Tenant updated successfully.',
      data: tenant
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error updating tenant:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating tenant.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete tenant (soft delete)
 * DELETE /api/superadmin/tenants/:id
 */
const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tenant exists
    const existingTenant = await query(
      'SELECT id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (!existingTenant || existingTenant.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found.'
      });
    }

    // Soft delete
    await query(
      'UPDATE tenants SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Tenant deleted successfully.'
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error deleting tenant:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting tenant.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get tenant statistics
 * GET /api/superadmin/stats
 */
const getSuperAdminStats = async (req, res) => {
  try {
    // Total tenants
    const totalTenants = await query(
      'SELECT COUNT(*) as count FROM tenants WHERE deleted_at IS NULL'
    );

    // Active tenants
    const activeTenants = await query(
      'SELECT COUNT(*) as count FROM tenants WHERE status = $1 AND deleted_at IS NULL',
      ['ACTIVE']
    );

    // Suspended tenants
    const suspendedTenants = await query(
      'SELECT COUNT(*) as count FROM tenants WHERE status = $1 AND deleted_at IS NULL',
      ['SUSPENDED']
    );

    // Total users across all tenants
    const totalUsers = await query(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND is_active = TRUE'
    );

    // SUPER_ADMIN users
    const superAdminUsers = await query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'SUPER_ADMIN' AND deleted_at IS NULL AND is_active = TRUE"
    );

    res.json({
      success: true,
      data: {
        tenants: {
          total: parseInt(totalTenants[0].count),
          active: parseInt(activeTenants[0].count),
          suspended: parseInt(suspendedTenants[0].count)
        },
        users: {
          total: parseInt(totalUsers[0].count),
          super_admins: parseInt(superAdminUsers[0].count)
        }
      }
    });
  } catch (error) {
    console.error('[SuperAdmin Controller] Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenantStatus,
  updateTenant,
  deleteTenant,
  getSuperAdminStats
};