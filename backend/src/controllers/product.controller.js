/**
 * Product Controller
 * Handles product CRUD operations with tenant isolation
 * All operations are scoped to the tenant identified by x-tenant-id header
 */

const { query } = require('../config/db');

/**
 * Get all products for the current tenant
 * GET /api/products
 * Automatically filters by req.tenantId
 */
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, is_active, min_price, max_price } = req.query;
    const tenantId = req.tenantId;

    // Build dynamic query with tenant isolation
    let whereClauses = ['p.tenant_id = $1', 'p.deleted_at IS NULL'];
    let params = [tenantId];
    let paramIndex = 2;

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereClauses.push(`p.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereClauses.push(`p.is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }

    if (min_price !== undefined) {
      whereClauses.push(`p.price >= $${paramIndex}`);
      params.push(parseFloat(min_price));
      paramIndex++;
    }

    if (max_price !== undefined) {
      whereClauses.push(`p.price <= $${paramIndex}`);
      params.push(parseFloat(max_price));
      paramIndex++;
    }

    const whereClause = whereClauses.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult[0].total);

    // Get paginated results
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const products = await query(
      `SELECT p.id, p.name, p.description, p.sku, p.price, p.stock_quantity, 
              p.category, p.is_active, p.metadata, p.created_by, p.created_at, p.updated_at,
              u.name as created_by_name, u.email as created_by_email
       FROM products p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      success: true,
      data: {
        products,
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
    console.error('[Product Controller] Error fetching products:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching products.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single product by ID
 * GET /api/products/:id
 * Ensures product belongs to the current tenant
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const products = await query(
      `SELECT p.id, p.name, p.description, p.sku, p.price, p.stock_quantity, 
              p.category, p.is_active, p.metadata, p.created_by, p.created_at, p.updated_at,
              u.name as created_by_name, u.email as created_by_email
       FROM products p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
      [id, tenantId]
    );

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have access to it.'
      });
    }

    res.json({
      success: true,
      data: products[0]
    });
  } catch (error) {
    console.error('[Product Controller] Error fetching product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching product.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new product
 * POST /api/products
 * Automatically assigns tenant_id from req.tenantId
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, sku, price, stock_quantity, category, metadata } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user.id;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.'
      });
    }

    // Check if SKU already exists for this tenant
    if (sku) {
      const existingSku = await query(
        'SELECT id FROM products WHERE sku = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [sku, tenantId]
      );

      if (existingSku && existingSku.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'SKU already exists for this tenant.'
        });
      }
    }

    // Create product
    const result = await query(
      `INSERT INTO products (tenant_id, name, description, sku, price, stock_quantity, category, metadata, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, name, description, sku, price, stock_quantity, category, is_active, metadata, created_by, created_at, updated_at`,
      [
        tenantId,
        name,
        description || null,
        sku || null,
        price || 0,
        stock_quantity || 0,
        category || null,
        JSON.stringify(metadata || {}),
        userId
      ]
    );

    const product = result[0];

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product
    });
  } catch (error) {
    console.error('[Product Controller] Error creating product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating product.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a product
 * PUT /api/products/:id
 * Ensures product belongs to the current tenant
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user.id;
    const { name, description, sku, price, stock_quantity, category, metadata, is_active } = req.body;

    // Check if product exists and belongs to tenant
    const existingProduct = await query(
      'SELECT id, sku FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, tenantId]
    );

    if (!existingProduct || existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have access to it.'
      });
    }

    // Check if new SKU is unique (if provided and different)
    if (sku && sku !== existingProduct[0].sku) {
      const duplicateSku = await query(
        'SELECT id FROM products WHERE sku = $1 AND tenant_id = $2 AND id != $3 AND deleted_at IS NULL',
        [sku, tenantId, id]
      );

      if (duplicateSku && duplicateSku.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'SKU already exists for this tenant.'
        });
      }
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (sku !== undefined) {
      updates.push(`sku = $${paramIndex}`);
      params.push(sku);
      paramIndex++;
    }

    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(price);
      paramIndex++;
    }

    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramIndex}`);
      params.push(stock_quantity);
      paramIndex++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(metadata));
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id, tenantId);

    const result = await query(
      `UPDATE products 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING id, name, description, sku, price, stock_quantity, category, is_active, metadata, created_by, created_at, updated_at`,
      params
    );

    const product = result[0];

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: product
    });
  } catch (error) {
    console.error('[Product Controller] Error updating product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error updating product.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a product (soft delete)
 * DELETE /api/products/:id
 * Ensures product belongs to the current tenant
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Check if product exists and belongs to tenant
    const existingProduct = await query(
      'SELECT id FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, tenantId]
    );

    if (!existingProduct || existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have access to it.'
      });
    }

    // Soft delete
    await query(
      'UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    console.error('[Product Controller] Error deleting product:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error deleting product.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get product statistics for the current tenant
 * GET /api/products/stats
 */
const getProductStats = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Total products
    const totalProducts = await query(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND deleted_at IS NULL',
      [tenantId]
    );

    // Active products
    const activeProducts = await query(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND is_active = TRUE AND deleted_at IS NULL',
      [tenantId]
    );

    // Total inventory value
    const inventoryValue = await query(
      'SELECT COALESCE(SUM(price * stock_quantity), 0) as total FROM products WHERE tenant_id = $1 AND deleted_at IS NULL',
      [tenantId]
    );

    // Low stock products (stock_quantity < 10)
    const lowStock = await query(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND stock_quantity < 10 AND stock_quantity > 0 AND deleted_at IS NULL',
      [tenantId]
    );

    // Out of stock products
    const outOfStock = await query(
      'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND stock_quantity = 0 AND deleted_at IS NULL',
      [tenantId]
    );

    // Category breakdown
    const categoryBreakdown = await query(
      `SELECT category, COUNT(*) as count, SUM(stock_quantity) as total_stock
       FROM products 
       WHERE tenant_id = $1 AND deleted_at IS NULL 
       GROUP BY category 
       ORDER BY count DESC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        total_products: parseInt(totalProducts[0].count),
        active_products: parseInt(activeProducts[0].count),
        inventory_value: parseFloat(inventoryValue[0].total),
        low_stock: parseInt(lowStock[0].count),
        out_of_stock: parseInt(outOfStock[0].count),
        categories: categoryBreakdown
      }
    });
  } catch (error) {
    console.error('[Product Controller] Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats
};