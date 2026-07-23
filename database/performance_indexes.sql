-- ============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Fixes slow query warnings for login and other common operations
-- ============================================================================
-- Run this in your Supabase SQL Editor to add missing functional indexes
-- that support case-insensitive searches and improve query performance.
-- ============================================================================

-- ============================================================================
-- CRITICAL: Functional indexes for case-insensitive login queries
-- ============================================================================
-- The login query uses: WHERE LOWER(email) = $1 OR LOWER("studentId") = $1
-- Regular indexes on email/studentId cannot be used for LOWER() comparisons.
-- These functional indexes will dramatically speed up login queries.

CREATE INDEX IF NOT EXISTS "idx_user_email_lower" ON "User"(LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_user_student_id_lower" ON "User"(LOWER("studentId"));

-- ============================================================================
-- Composite functional index for login with tenant isolation (optional)
-- If you want to optimize tenant-scoped login queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_user_tenant_email_lower" ON "User"("tenantId", LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_user_tenant_student_id_lower" ON "User"("tenantId", LOWER("studentId"));

-- ============================================================================
-- Additional performance indexes for common queries
-- ============================================================================

-- Index for User lookup by ID and role (used in auth middleware)
CREATE INDEX IF NOT EXISTS "idx_user_id_role" ON "User"(id, role) WHERE role IS NOT NULL;

-- Index for Class lookup by class_code (used in class-based login)
CREATE INDEX IF NOT EXISTS "idx_class_code" ON "Class"("class_code");

-- Index for WeeklyLessonLog by class and subject (common query pattern)
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_class_subject" ON "WeeklyLessonLog"("classId", "subject");

-- ============================================================================
-- CRITICAL: Indexes for User auth query with Tenant/Class joins
-- ============================================================================
-- The protect middleware runs this query on EVERY authenticated request:
--   SELECT ... FROM "User" u
--   LEFT JOIN "Tenant" t ON u."tenantId" = t.id
--   LEFT JOIN "Class" c ON u."classId" = c.id
--   WHERE u.id = $1
--
-- These indexes optimize the join operations and the WHERE clause lookup.

-- Index for User primary key lookup (should already exist as PK, but ensuring coverage)
CREATE INDEX IF NOT EXISTS "idx_user_id_covering" ON "User"(id) 
  INCLUDE ("email", "password", "name", "phone", "role", "tenantId", "classId", "studentId", "createdAt", "updatedAt");

-- Index for Tenant primary key lookup (optimizes LEFT JOIN on tenantId)
CREATE INDEX IF NOT EXISTS "idx_tenant_id_covering" ON "Tenant"(id) 
  INCLUDE ("name", "code");

-- Index for Class primary key lookup (optimizes LEFT JOIN on classId)
CREATE INDEX IF NOT EXISTS "idx_class_id_covering" ON "Class"(id) 
  INCLUDE ("name", "section");

-- ============================================================================
-- Verify indexes were created
-- ============================================================================
-- Run this query to verify:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'User' ORDER BY indexname;

-- ============================================================================
-- ANALYZE tables to update query planner statistics
-- ============================================================================
ANALYZE "User";
ANALYZE "Tenant";
ANALYZE "Class";
ANALYZE "WeeklyLessonLog";
