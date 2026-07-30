-- =====================================================
-- MULTI-TENANT ARCHITECTURE SCHEMA
-- For MACVEL School Management System
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TENANTS TABLE
-- Stores information about each tenant (school/organization)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain_slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    subscription_plan VARCHAR(50) DEFAULT 'FREE',
    max_users INTEGER DEFAULT 100,
    max_students INTEGER DEFAULT 1000,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Index for faster lookups
CREATE INDEX idx_tenants_domain_slug ON tenants(domain_slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- =====================================================
-- 2. USERS TABLE (Updated for Multi-Tenancy)
-- =====================================================
-- First, let's backup existing users if the table exists
-- ALTER TABLE users RENAME TO users_backup;

-- Create users table (or modify existing)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'CUSTOMER')),
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Ensure email is unique per tenant (except for SUPER_ADMIN)
    CONSTRAINT unique_email_per_tenant EXCLUDE USING gist (
        tenant_id WITH =,
        email WITH =
    ) WHERE (deleted_at IS NULL)
);

-- Indexes for users table
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- =====================================================
-- 3. PRODUCTS TABLE (Example Tenant-Isolated Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    price DECIMAL(10,2) DEFAULT 0.00,
    stock_quantity INTEGER DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Indexes for products table
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Composite index for tenant-specific queries
CREATE INDEX idx_products_tenant_active ON products(tenant_id, is_active) WHERE deleted_at IS NULL;

-- =====================================================
-- 4. TENANT ADMIN VIEW
-- Easy way to see tenant administrators
-- =====================================================
CREATE OR REPLACE VIEW tenant_admins AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.domain_slug,
    u.id as admin_id,
    u.name as admin_name,
    u.email as admin_email,
    u.created_at as admin_created_at
FROM tenants t
JOIN users u ON t.id = u.tenant_id
WHERE u.role IN ('TENANT_ADMIN', 'ADMIN')
  AND u.is_active = TRUE
  AND u.deleted_at IS NULL
  AND t.status = 'ACTIVE'
  AND t.deleted_at IS NULL;

-- =====================================================
-- 5. SEED DATA
-- Create default SUPER_ADMIN and sample tenants
-- =====================================================

-- Insert default SUPER_ADMIN (password: admin123 - hashed)
-- Note: In production, use proper password hashing
INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL, -- SUPER_ADMIN has no tenant
    'Super Admin',
    'superadmin@macvelschool.com',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash of 'admin123'
    'SUPER_ADMIN',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Insert sample tenants
INSERT INTO tenants (id, name, domain_slug, status, subscription_plan, max_users, max_students)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        'MacVell Public School',
        'macvell-school',
        'ACTIVE',
        'PREMIUM',
        500,
        5000
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'St. Mary''s Academy',
        'st-marys-academy',
        'ACTIVE',
        'STANDARD',
        100,
        1000
    )
ON CONFLICT (id) DO NOTHING;

-- Insert sample tenant admin for MacVell School
INSERT INTO users (tenant_id, name, email, password_hash, role, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'MacVell Admin',
    'admin@macvellschool.com',
    '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
    'TENANT_ADMIN',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert sample products for MacVell School
INSERT INTO products (tenant_id, name, description, sku, price, stock_quantity, category, is_active)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        'School Uniform - Primary',
        'Complete school uniform set for primary students',
        'UNIF-PRIMARY-001',
        45.00,
        150,
        'Uniforms',
        TRUE
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'School Bag - Standard',
        'Durable school backpack with multiple compartments',
        'BAG-STD-001',
        35.00,
        200,
        'Accessories',
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role = 'SUPER_ADMIN' 
        AND is_active = TRUE 
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user belongs to a tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(user_id UUID, tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND (tenant_id = user_belongs_to_tenant.tenant_id OR role = 'SUPER_ADMIN')
        AND is_active = TRUE 
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Optional: Enable RLS for additional security
-- =====================================================

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see products from their own tenant
CREATE POLICY tenant_isolation_policy ON products
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- =====================================================
-- 8. MIGRATION NOTES
-- =====================================================
-- 
-- To migrate existing data:
-- 1. Run this script to create new tables
-- 2. Update existing users table to add tenant_id column if needed
-- 3. Assign existing users to default tenant or mark as SUPER_ADMIN
-- 4. Update application code to use tenant_id in queries
-- 
-- Example migration for existing users:
-- UPDATE users SET tenant_id = '11111111-1111-1111-1111-111111111111' 
-- WHERE role IN ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT');
--
-- UPDATE users SET role = 'SUPER_ADMIN' 
-- WHERE email = 'admin@macvelschool.com';
-- =====================================================