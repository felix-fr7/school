-- ============================================================================
-- SLOW QUERY OPTIMIZATION - Critical Missing Indexes
-- ============================================================================
-- This migration addresses slow query warnings for:
-- 1. User lookup with Tenant/Class JOINs (1355ms -> expected <50ms)
-- 2. Homework COUNT by tenant and published status (1047ms -> expected <100ms)
-- ============================================================================
-- Run this in your Supabase SQL Editor or PostgreSQL client.
-- ============================================================================

-- ============================================================================
-- 1. HOMEWORK COMPOSITE INDEX (Critical - fixes 1047ms COUNT query)
-- ============================================================================
-- The query: SELECT COUNT(*) FROM "Homework" WHERE "tenant_id" = $1 AND "is_published" = $2
-- Currently has separate indexes on tenantId and isPublished, but PostgreSQL
-- can only use one index efficiently. A composite index allows both conditions
-- to be evaluated in a single index scan.
-- ============================================================================

-- Composite index for Homework tenant + published status queries
-- This is the PRIMARY fix for the slow COUNT query
CREATE INDEX IF NOT EXISTS "idx_homework_tenant_published" 
ON "Homework"("tenantId", "isPublished");

-- Also create with snake_case variant if the database uses snake_case
-- (Some controllers use snake_case column names)
CREATE INDEX IF NOT EXISTS "idx_homework_tenant_id_published" 
ON "Homework"("tenant_id", "is_published");

-- Additional composite index for class-specific homework queries
-- Used by: GET /api/teacher/homework, GET /api/student/homework
CREATE INDEX IF NOT EXISTS "idx_homework_class_published" 
ON "Homework"("classId", "isPublished");

-- Snake_case variant for class-specific queries
CREATE INDEX IF NOT EXISTS "idx_homework_class_id_published" 
ON "Homework"("class_id", "is_published");

-- ============================================================================
-- 2. USER COVERING INDEX (Fixes 1355ms JOIN query)
-- ============================================================================
-- The auth middleware runs this query on EVERY authenticated request:
--   SELECT u.*, t.id as tenant_table_id, t.name as tenantName, t.code as tenantCode,
--          c.id as class_table_id, c.name as className, c.section as classSection
--   FROM "User" u
--   LEFT JOIN "Tenant" t ON u."tenantId" = t.id
--   LEFT JOIN "Class" c ON u."classId" = c.id
--   WHERE u.id = $1
--
-- A covering index on User that includes all needed columns avoids a table lookup.
-- ============================================================================

-- Drop existing covering index if it exists (to recreate with updated columns)
DROP INDEX IF EXISTS "idx_user_id_covering";

-- Create comprehensive covering index for User auth query
-- This includes all columns selected in the auth JOIN query
CREATE INDEX IF NOT EXISTS "idx_user_id_covering" ON "User"(id) 
  INCLUDE ("email", "password", "name", "phone", "role", "tenantId", "classId", "studentId", "createdAt", "updatedAt");

-- ============================================================================
-- 3. TENANT COVERING INDEX (Optimizes JOIN in User query)
-- ============================================================================
DROP INDEX IF EXISTS "idx_tenant_id_covering";

CREATE INDEX IF NOT EXISTS "idx_tenant_id_covering" ON "Tenant"(id) 
  INCLUDE ("name", "code", "email", "phone", "address", "schoolLogoUrl", "createdAt", "updatedAt");

-- ============================================================================
-- 4. CLASS COVERING INDEX (Optimizes JOIN in User query)
-- ============================================================================
DROP INDEX IF EXISTS "idx_class_id_covering";

CREATE INDEX IF NOT EXISTS "idx_class_id_covering" ON "Class"(id) 
  INCLUDE ("name", "section", "teacherId", "tenantId", "class_code", "password", "createdAt", "updatedAt");

-- ============================================================================
-- 5. ADDITIONAL HOMEWORK INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index for Homework lookup by assignedBy (teacher who assigned it)
CREATE INDEX IF NOT EXISTS "idx_homework_assigned_by_tenant" 
ON "Homework"("assignedBy", "tenantId");

-- Index for Homework date-based queries (due date filtering)
CREATE INDEX IF NOT EXISTS "idx_homework_due_date" 
ON "Homework"("dueDate") WHERE "isPublished" = true;

-- ============================================================================
-- 6. UPDATE EXISTING INDEXES FOR CONSISTENCY
-- ============================================================================

-- Ensure the basic tenant index exists (some queries use tenant_id snake_case)
CREATE INDEX IF NOT EXISTS "idx_homework_tenant_id" ON "Homework"("tenant_id");

-- ============================================================================
-- 7. ANALYZE TABLES (Update query planner statistics)
-- ============================================================================
-- This is CRITICAL - without ANALYZE, PostgreSQL won't know about the new indexes
-- and will continue using sequential scans.
-- ============================================================================

ANALYZE "User";
ANALYZE "Tenant";
ANALYZE "Class";
ANALYZE "Homework";

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the indexes were created:
--
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename = 'Homework' AND indexname LIKE 'idx_homework%'
-- ORDER BY indexname;
--
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename = 'User' AND indexname LIKE 'idx_user%'
-- ORDER BY indexname;
-- ============================================================================

-- ============================================================================
-- PERFORMANCE EXPECTATIONS AFTER OPTIMIZATION
-- ============================================================================
-- Before:
--   User JOIN query: ~1355ms
--   Homework COUNT query: ~1047ms
--
-- After:
--   User JOIN query: <50ms (using covering index, no table lookup)
--   Homework COUNT query: <100ms (using composite index scan)
-- ============================================================================