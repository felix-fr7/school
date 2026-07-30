/**
 * Product Routes
 * Tenant-isolated product management routes
 * All routes require authentication and a valid tenant context
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { authenticate, isAnyAdmin } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

// Import controller
const productController = require('../controllers/product.controller');

// All routes require authentication
router.use(authenticate);

// All routes require valid tenant context (except for SUPER_ADMIN who can access without tenant)
router.use(tenantMiddleware);

/**
 * @route   GET /api/products/stats
 * @desc    Get product statistics for current tenant
 * @access  Any authenticated user (typically admin/manager)
 */
router.get('/stats', productController.getProductStats);

/**
 * @route   GET /api/products
 * @desc    Get all products for current tenant with pagination and filtering
 * @access  Any authenticated user
 * @query   page, limit, search, category, is_active, min_price, max_price
 */
router.get('/', productController.getAllProducts);

/**
 * @route   POST /api/products
 * @desc    Create a new product (automatically assigns tenant_id)
 * @access  TENANT_ADMIN, ADMIN (or higher)
 * @body    { name, description?, sku?, price?, stock_quantity?, category?, metadata? }
 */
router.post('/', isAnyAdmin, productController.createProduct);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID (ensures it belongs to current tenant)
 * @access  Any authenticated user
 */
router.get('/:id', productController.getProductById);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product (ensures it belongs to current tenant)
 * @access  TENANT_ADMIN, ADMIN (or higher)
 * @body    { name?, description?, sku?, price?, stock_quantity?, category?, metadata?, is_active? }
 */
router.put('/:id', isAnyAdmin, productController.updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product (soft delete, ensures it belongs to current tenant)
 * @access  TENANT_ADMIN, ADMIN (or higher)
 */
router.delete('/:id', isAnyAdmin, productController.deleteProduct);

module.exports = router;