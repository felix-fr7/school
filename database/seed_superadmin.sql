-- =====================================================
-- SUPER_ADMIN Seed Script for MACVEL School Management
-- =====================================================
-- This script creates the initial SUPER_ADMIN user
-- Run this after your database schema is set up
-- =====================================================

-- First, ensure the users table exists (if not already created)
-- This is a simplified version - adjust based on your actual schema
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
    tenant_id UUID NULL,
    student_id VARCHAR(50) NULL,
    class_id UUID NULL,
    phone VARCHAR(50) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create tenants table if it doesn't exist (for multi-tenant support)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain_slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    subscription_plan VARCHAR(50) DEFAULT 'FREE',
    max_users INTEGER DEFAULT 100,
    max_students INTEGER DEFAULT 1000,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Add foreign key constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_tenant' AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- Create SUPER_ADMIN User
-- =====================================================
-- Email: superadmin@macvelschool.com
-- Password: admin123 (bcrypt hash provided below)
-- Role: SUPER_ADMIN
-- Tenant ID: NULL (SUPER_ADMIN has no tenant)
-- =====================================================

-- The password hash below is for 'admin123' using bcrypt with 10 salt rounds
-- You can generate your own using: bcrypt.hash('admin123', 10)

INSERT INTO users (id, email, name, password_hash, role, tenant_id, is_active, email_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- Fixed UUID for SUPER_ADMIN
    'superadmin@macvelschool.com',
    'Super Admin',
    '$2b$10$rHxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',  -- bcrypt hash for 'admin123'
    'SUPER_ADMIN',
    NULL,  -- SUPER_ADMIN has no tenant
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify the SUPER_ADMIN user was created
SELECT 
    id,
    email,
    name,
    role,
    tenant_id,
    is_active,
    created_at
FROM users 
WHERE email = 'superadmin@macvelschool.com';

-- =====================================================
-- Optional: Create a default tenant for testing
-- =====================================================
INSERT INTO tenants (id, name, domain_slug, status, subscription_plan, max_users, max_students)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'MacVell Public School',
    'macvell-school',
    'ACTIVE',
    'PREMIUM',
    1000,
    10000
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Test Query
-- =====================================================
-- Run this to verify the SUPER_ADMIN user exists
-- SELECT * FROM users WHERE role = 'SUPER_ADMIN';