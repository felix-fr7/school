# Multi-Tenant Architecture Implementation Guide

## Overview

This guide documents the complete multi-tenant architecture implementation for the MACVEL School Management System, featuring a SuperAdmin concept with tenant isolation and role-based access control (RBAC).

## Architecture Components

### 1. Database Schema (`database/multi_tenant_schema.sql`)

#### Core Tables

**Tenants Table**
- `id` (UUID, primary key)
- `name` (tenant/school name)
- `domain_slug` (unique subdomain identifier)
- `status` (ACTIVE/SUSPENDED)
- `subscription_plan` (FREE/STANDARD/PREMIUM)
- `max_users`, `max_students` (quota limits)
- `settings` (JSONB for custom configuration)
- `created_at`, `updated_at`, `deleted_at` (soft delete support)

**Users Table (Updated)**
- `id` (UUID, primary key)
- `tenant_id` (UUID, nullable - NULL for SUPER_ADMIN)
- `name`, `email`, `password_hash`
- `role` (SUPER_ADMIN, TENANT_ADMIN, ADMIN, TEACHER, STUDENT, PARENT, CUSTOMER)
- `is_active`, `email_verified`, `last_login`
- Standard timestamps and soft delete

**Products Table (Example Tenant-Isolated Data)**
- `id` (UUID, primary key)
- `tenant_id` (UUID, required foreign key)
- `name`, `description`, `sku`, `price`, `stock_quantity`
- `category`, `is_active`, `metadata` (JSONB)
- `created_by` (references users.id)
- Standard timestamps and soft delete

#### Key Features

- **Row Level Security (RLS)**: Optional PostgreSQL RLS policies for additional security
- **Helper Functions**: `is_super_admin()`, `user_belongs_to_tenant()`
- **Automatic Triggers**: `updated_at` timestamp management
- **Soft Deletes**: All tables support `deleted_at` for data recovery
- **Indexes**: Optimized for tenant-scoped queries

### 2. Middleware Layer

#### `backend/src/middleware/tenant.js`

**tenantMiddleware**
- Extracts `x-tenant-id` from request headers
- Validates tenant exists and is ACTIVE
- Attaches `req.tenantId` and `req.tenant` to request object
- Returns 400/404/403 errors for invalid/missing/suspended tenants

**optionalTenantMiddleware**
- Same as above but doesn't fail if header is missing
- Useful for public endpoints that can optionally be tenant-scoped

**domainTenantMiddleware**
- Resolves tenant from subdomain (e.g., `school1.example.com` → `school1`)
- Alternative to header-based tenant identification

#### `backend/src/middleware/auth.js` (Updated)

**Enhanced RBAC**
- `isSuperAdmin` - Only SUPER_ADMIN role
- `isTenantAdmin` - Only TENANT_ADMIN role
- `isAnyAdmin` - SUPER_ADMIN, TENANT_ADMIN, or ADMIN
- Existing: `isAdmin`, `isTeacher`, `isStudent`, `isAdminOrTeacher`

**Authentication Flow**
- JWT token verification from `Authorization: Bearer <token>` header
- Fetches user data including role and tenant_id
- Attaches `req.user` with all user information
- Handles token expiration and invalid tokens

### 3. Controllers

#### `backend/src/controllers/superadmin.controller.js`

**Tenant Management Operations**
- `createTenant()` - POST /api/superadmin/tenants
- `getAllTenants()` - GET /api/superadmin/tenants (with pagination, filtering, search)
- `getTenantById()` - GET /api/superadmin/tenants/:id (with stats)
- `updateTenantStatus()` - PATCH /api/superadmin/tenants/:id/status (ACTIVATE/SUSPEND)
- `updateTenant()` - PATCH /api/superadmin/tenants/:id (update details)
- `deleteTenant()` - DELETE /api/superadmin/tenants/:id (soft delete)
- `getSuperAdminStats()` - GET /api/superadmin/stats (system-wide statistics)

**Key Features**
- Comprehensive validation and error handling
- Duplicate domain_slug checking
- Pagination and advanced filtering
- Statistics aggregation
- Soft delete support

#### `backend/src/controllers/product.controller.js`

**Tenant-Isolated Product CRUD**
- `getAllProducts()` - GET /api/products (automatically filtered by req.tenantId)
- `getProductById()` - GET /api/products/:id (ensures product belongs to tenant)
- `createProduct()` - POST /api/products (automatically assigns tenant_id)
- `updateProduct()` - PUT /api/products/:id (validates tenant ownership)
- `deleteProduct()` - DELETE /api/products/:id (soft delete)
- `getProductStats()` - GET /api/products/stats (tenant-specific statistics)

**Tenant Isolation Guarantees**
- All queries include `WHERE tenant_id = $1` clause
- Prevents cross-tenant data access
- Automatic tenant_id assignment on create
- Validates tenant ownership on update/delete

### 4. Routes

#### `backend/src/routes/superadmin.js`

**Access Control**: All routes require `authenticate` + `isSuperAdmin`

```
GET    /api/superadmin/stats              - System statistics
POST   /api/superadmin/tenants            - Create tenant
GET    /api/superadmin/tenants            - List all tenants (paginated)
GET    /api/superadmin/tenants/:id        - Get tenant details
PATCH  /api/superadmin/tenants/:id        - Update tenant
PATCH  /api/superadmin/tenants/:id/status - Change tenant status
DELETE /api/superadmin/tenants/:id        - Delete tenant
```

#### `backend/src/routes/products.js`

**Access Control**: All routes require `authenticate` + `tenantMiddleware`

```
GET    /api/products/stats                - Product statistics (tenant-scoped)
GET    /api/products                      - List products (tenant-scoped, paginated)
POST   /api/products                      - Create product (requires isAnyAdmin)
GET    /api/products/:id                  - Get product (tenant-scoped)
PUT    /api/products/:id                  - Update product (requires isAnyAdmin)
DELETE /api/products/:id                  - Delete product (requires isAnyAdmin)
```

### 5. Server Configuration

**Updated `backend/src/server.js`**
- Added imports for new routes and middleware
- Registered `/api/superadmin` and `/api/products` routes
- Maintained backward compatibility with existing routes

## Implementation Steps

### Step 1: Database Setup

1. Run the SQL schema script:
```bash
psql -U postgres -d your_database -f database/multi_tenant_schema.sql
```

2. Verify tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('tenants', 'users', 'products');
```

3. Check seed data:
```sql
SELECT * FROM tenants;
SELECT * FROM users WHERE role = 'SUPER_ADMIN';
SELECT * FROM products LIMIT 5;
```

### Step 2: Environment Configuration

Ensure your `.env` file contains:
```env
DATABASE_URL=postgresql://postgres:password@host:5432/database
JWT_SECRET=your-super-secret-key-change-in-production
PORT=3000
NODE_ENV=development
```

### Step 3: Test SuperAdmin Functionality

1. **Login as SUPER_ADMIN** (create user manually if needed):
```bash
POST /api/auth/login
{
  "email": "superadmin@macvelschool.com",
  "password": "admin123"
}
```

2. **Get System Stats**:
```bash
GET /api/superadmin/stats
Authorization: Bearer <superadmin_token>
```

3. **Create a New Tenant**:
```bash
POST /api/superadmin/tenants
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "name": "New School",
  "domain_slug": "new-school",
  "subscription_plan": "STANDARD",
  "max_users": 100,
  "max_students": 1000
}
```

4. **List All Tenants**:
```bash
GET /api/superadmin/tenants
Authorization: Bearer <superadmin_token>
```

5. **Suspend a Tenant**:
```bash
PATCH /api/superadmin/tenants/:id/status
Authorization: Bearer <superadmin_token>
Content-Type: application/json

{
  "status": "SUSPENDED"
}
```

### Step 4: Test Tenant-Isolated Products

1. **Login as Tenant Admin**:
```bash
POST /api/auth/login
{
  "email": "admin@macvellschool.com",
  "password": "admin123"
}
```

2. **Create Product** (with tenant context):
```bash
POST /api/products
Authorization: Bearer <tenant_admin_token>
x-tenant-id: 11111111-1111-1111-1111-111111111111
Content-Type: application/json

{
  "name": "New Product",
  "description": "Product description",
  "sku": "PROD-001",
  "price": 99.99,
  "stock_quantity": 100,
  "category": "Test Category"
}
```

3. **List Products** (automatically filtered by tenant):
```bash
GET /api/products
Authorization: Bearer <tenant_admin_token>
x-tenant-id: 11111111-1111-1111-1111-111111111111
```

4. **Get Product Statistics**:
```bash
GET /api/products/stats
Authorization: Bearer <tenant_admin_token>
x-tenant-id: 11111111-1111-1111-1111-111111111111
```

5. **Try Accessing Another Tenant's Product** (should fail):
```bash
GET /api/products/:id
Authorization: Bearer <tenant_admin_token>
x-tenant-id: 22222222-2222-2222-2222-222222222222
```

## Security Considerations

### 1. Tenant Isolation
- All tenant-scoped queries include `WHERE tenant_id = $1`
- Middleware validates tenant existence and status
- Soft deletes prevent accidental data loss
- Database-level constraints enforce referential integrity

### 2. Role-Based Access Control
- SUPER_ADMIN: System-wide access, manages tenants
- TENANT_ADMIN: Full access within their tenant
- ADMIN: Administrative access within their tenant
- TEACHER/STUDENT/PARENT: Limited access based on role
- CUSTOMER: Minimal access (public endpoints)

### 3. Authentication & Authorization
- JWT tokens with expiration
- Password hashing (use bcrypt in production)
- Role verification on every protected endpoint
- Tenant context validation

### 4. Input Validation
- UUID format validation
- SQL injection prevention (parameterized queries)
- Request body validation
- Duplicate checking (domain_slug, SKU)

### 5. Error Handling
- Comprehensive error messages in development
- Generic error messages in production
- Proper HTTP status codes
- Error logging for debugging

## Performance Optimizations

### 1. Database Indexes
- `tenants(domain_slug)` - Fast domain lookups
- `tenants(status)` - Filter active tenants
- `users(tenant_id)` - Fast tenant user lookups
- `users(role)` - Role-based queries
- `products(tenant_id)` - Tenant product filtering
- `products(tenant_id, is_active)` - Composite index for common queries

### 2. Query Optimization
- Pagination on list endpoints
- Selective column retrieval
- JOIN optimization
- Prepared statements

### 3. Caching Opportunities
- Tenant configuration caching
- User permission caching
- Product catalog caching (Redis)

## Migration from Existing System

### Step 1: Backup Existing Data
```sql
-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE products_backup AS SELECT * FROM products;
```

### Step 2: Add tenant_id Column to Users
```sql
ALTER TABLE users ADD COLUMN tenant_id UUID NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
```

### Step 3: Create Default Tenant
```sql
INSERT INTO tenants (id, name, domain_slug, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Default Tenant', 'default', 'ACTIVE');
```

### Step 4: Assign Existing Users to Default Tenant
```sql
UPDATE users 
SET tenant_id = '11111111-1111-1111-1111-111111111111'
WHERE role IN ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');
```

### Step 5: Promote System Admin to SUPER_ADMIN
```sql
UPDATE users 
SET role = 'SUPER_ADMIN', tenant_id = NULL
WHERE email = 'admin@macvelschool.com';
```

### Step 6: Add tenant_id to Products
```sql
ALTER TABLE products ADD COLUMN tenant_id UUID NOT NULL 
  DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE products ADD CONSTRAINT fk_products_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (tenant-specific)
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### SuperAdmin Endpoints
- All endpoints under `/api/superadmin/*`
- Require SUPER_ADMIN role
- Manage tenants and system-wide operations

### Tenant-Isolated Endpoints
- All endpoints under `/api/products/*`
- Require valid `x-tenant-id` header
- Automatically scoped to tenant

### Existing Endpoints
- All existing endpoints remain unchanged
- Can be gradually migrated to use tenant context
- Backward compatible with existing clients

## Troubleshooting

### Common Issues

**1. "Tenant ID is required" Error**
- Solution: Add `x-tenant-id` header to request
- Ensure tenant ID is a valid UUID

**2. "Tenant not found" Error**
- Solution: Verify tenant ID exists in database
- Check if tenant is soft-deleted (`deleted_at IS NULL`)

**3. "Tenant is suspended" Error**
- Solution: Contact SUPER_ADMIN to reactivate tenant
- Check tenant status in database

**4. "Insufficient permissions" Error**
- Solution: Verify user has required role
- Check role in JWT token claims

**5. Cross-Tenant Access Denied**
- Solution: Ensure `x-tenant-id` matches user's tenant
- SUPER_ADMIN can access any tenant

### Debugging Queries

```sql
-- Check tenant status
SELECT id, name, domain_slug, status FROM tenants WHERE id = 'your-tenant-id';

-- Check user role and tenant
SELECT id, email, role, tenant_id, is_active FROM users WHERE id = 'user-id';

-- Verify product belongs to tenant
SELECT id, name, tenant_id FROM products WHERE id = 'product-id';

-- Check for soft-deleted records
SELECT * FROM tenants WHERE deleted_at IS NOT NULL;
```

## Best Practices

### 1. Always Use Parameterized Queries
```javascript
// Good
await query('SELECT * FROM products WHERE tenant_id = $1', [tenantId]);

// Bad - vulnerable to SQL injection
await query(`SELECT * FROM products WHERE tenant_id = '${tenantId}'`);
```

### 2. Validate Tenant Context Early
```javascript
// In middleware
if (!req.tenantId) {
  return res.status(400).json({ message: 'Tenant ID required' });
}
```

### 3. Use Soft Deletes
```javascript
// Instead of DELETE
await query('UPDATE products SET deleted_at = NOW() WHERE id = $1', [id]);

// Always check for soft deletes
WHERE deleted_at IS NULL
```

### 4. Implement Proper Error Handling
```javascript
try {
  // Database operation
} catch (error) {
  console.error('[Controller] Error:', error.message);
  res.status(500).json({ 
    success: false, 
    message: 'Operation failed' 
  });
}
```

### 5. Log Important Operations
```javascript
console.log(`[SuperAdmin] Created tenant: ${tenant.name} (${tenant.id})`);
console.log(`[Product] User ${userId} created product ${productId} for tenant ${tenantId}`);
```

## Future Enhancements

### 1. Multi-Database Support
- Separate database per tenant
- Connection pooling per tenant
- Cross-tenant analytics

### 2. Advanced RBAC
- Permission-based access control
- Resource-level permissions
- Dynamic role creation

### 3. Tenant Onboarding
- Self-service tenant registration
- Automated provisioning
- Trial period management

### 4. Monitoring & Analytics
- Tenant usage metrics
- Performance monitoring
- Cost tracking per tenant

### 5. Data Export/Import
- Tenant data backup
- Cross-tenant data migration
- Bulk operations

## Conclusion

This multi-tenant architecture provides a robust, scalable foundation for the MACVEL School Management System. It ensures data isolation, implements proper access control, and maintains backward compatibility with existing functionality.

The implementation follows industry best practices for security, performance, and maintainability, making it suitable for production deployment with multiple schools/organizations.

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-30  
**Author**: Senior Full-Stack Architect