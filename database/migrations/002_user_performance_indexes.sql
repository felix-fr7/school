-- ============================================
-- Migration: User Table Performance Indexes
-- Purpose: Optimize login queries (email & studentId lookups)
-- Idempotent: Yes (safe to run multiple times)
-- ============================================

-- ============================================
-- Performance Issue Analysis
-- ============================================
-- Login queries hitting "User" table are taking >1.2 seconds:
-- 1. SELECT * FROM "User" WHERE LOWER(email) = $1 OR "studentId" = $1 LIMIT 1
-- 2. SELECT ... FROM "User" u LEFT JOIN ... WHERE u.id = $1
--
-- Solution: Add functional index on LOWER(email) and ensure "studentId" index exists

-- ============================================
-- Email Lookup Optimization
-- ============================================
-- Functional index for case-insensitive email lookup
-- This dramatically speeds up: WHERE LOWER(email) = $1
CREATE INDEX IF NOT EXISTS "idx_user_lower_email" ON "User" (LOWER(email));

-- ============================================
-- Student ID Lookup Optimization
-- ============================================
-- Index for studentId lookup (used in dual login: email OR studentId)
CREATE INDEX IF NOT EXISTS "idx_user_studentId" ON "User" ("studentId");

-- ============================================
-- Composite Index for Tenant-Scoped Queries
-- ============================================
-- Most queries filter by tenantId + email/studentId
-- This composite index optimizes multi-tenant lookups
CREATE INDEX IF NOT EXISTS "idx_user_tenant_email" ON "User" ("tenantId", LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_user_tenant_studentId" ON "User" ("tenantId", "studentId");

-- ============================================
-- Role-Based Lookup Optimization
-- ============================================
-- Many queries filter by role + tenant (e.g., "find all ADMIN users in tenant X")
CREATE INDEX IF NOT EXISTS "idx_user_tenant_role" ON "User" ("tenantId", "role");

-- ============================================
-- Class-Scoped Student Lookup
-- ============================================
-- Optimizes queries like "find all STUDENT users in class X"
CREATE INDEX IF NOT EXISTS "idx_user_classId_role" ON "User" ("classId", "role") WHERE "role" = 'STUDENT';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'User';

-- ============================================
-- Performance Notes
-- ============================================
-- After running this migration:
-- - Login queries should complete in <50ms (down from >1200ms)
-- - The functional index on LOWER(email) enables case-insensitive search without full table scan
-- - Composite indexes optimize the most common query patterns
-- - Partial index on ("classId", "role") WHERE "role" = 'STUDENT' reduces index size