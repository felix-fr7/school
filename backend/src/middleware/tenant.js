/**
 * Tenant Middleware
 * Extracts tenant information from request headers and attaches to request object
 */

const { query } = require('../config/db');

/**
 * Tenant Middleware
 * Extracts x-tenant-id from headers and validates it exists in the database
 * Attaches req.tenantId and req.tenant to the request object
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    // Get tenant ID from header
    const tenantId = req.headers['x-tenant-id'];

    // For SUPER_ADMIN routes, tenant ID might be optional
    // But for regular tenant routes, it's required
    if (!tenantId) {
      // Check if this is a superadmin route (they don't need tenant ID)
      if (req.path.startsWith('/api/superadmin')) {
        return next();
      }
      
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required. Please provide x-tenant-id header.'
      });
    }

    // Validate tenant ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant ID format. Must be a valid UUID.'
      });
    }

    // Check if tenant exists and is active
    const tenants = await query(
      'SELECT id, name, domain_slug, status, subscription_plan, settings FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found or has been deleted.'
      });
    }

    const tenant = tenants[0];

    if (tenant.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tenant is suspended. Please contact support.'
      });
    }

    // Attach tenant info to request
    req.tenantId = tenant.id;
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      domainSlug: tenant.domain_slug,
      subscriptionPlan: tenant.subscription_plan,
      settings: tenant.settings
    };

    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error validating tenant.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Optional Tenant Middleware
 * Attaches tenant info if header is present, but doesn't fail if missing
 * Useful for public endpoints that can optionally be tenant-scoped
 */
const optionalTenantMiddleware = async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (tenantId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tenantId)) {
        const tenants = await query(
          'SELECT id, name, domain_slug, status FROM tenants WHERE id = $1 AND deleted_at IS NULL AND status = $2',
          [tenantId, 'ACTIVE']
        );

        if (tenants && tenants.length > 0) {
          const tenant = tenants[0];
          req.tenantId = tenant.id;
          req.tenant = {
            id: tenant.id,
            name: tenant.name,
            domainSlug: tenant.domain_slug,
            subscriptionPlan: tenant.subscription_plan,
            settings: tenant.settings
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('[OptionalTenantMiddleware] Error:', error.message);
    // Don't fail the request, just continue without tenant info
    next();
  }
};

/**
 * Domain-based Tenant Resolution
 * Resolves tenant based on subdomain/domain from request
 * Useful for multi-tenant SaaS applications with custom domains
 */
const domainTenantMiddleware = async (req, res, next) => {
  try {
    // Extract domain from host header
    const host = req.headers.host || '';
    const domain = host.split(':')[0]; // Remove port if present
    
    // Extract subdomain if present (e.g., school1.example.com -> school1)
    const parts = domain.split('.');
    const subdomain = parts.length > 2 ? parts[0] : null;

    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve tenant from domain. Please use x-tenant-id header instead.'
      });
    }

    // Look up tenant by domain_slug
    const tenants = await query(
      'SELECT id, name, domain_slug, status, subscription_plan, settings FROM tenants WHERE domain_slug = $1 AND deleted_at IS NULL',
      [subdomain]
    );

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found for this domain.'
      });
    }

    const tenant = tenants[0];

    if (tenant.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tenant is suspended.'
      });
    }

    // Attach tenant info
    req.tenantId = tenant.id;
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      domainSlug: tenant.domain_slug,
      subscriptionPlan: tenant.subscription_plan,
      settings: tenant.settings
    };

    next();
  } catch (error) {
    console.error('[DomainTenantMiddleware] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error resolving tenant from domain.'
    });
  }
};

module.exports = {
  tenantMiddleware,
  optionalTenantMiddleware,
  domainTenantMiddleware
};