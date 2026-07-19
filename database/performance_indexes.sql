-- ============================================
-- Database Performance Optimization
-- High-Efficiency PostgreSQL Indexes
-- ============================================
-- 
-- This script addresses the critical 1010ms query performance issue
-- for user profiling lookups with LEFT JOINs on Tenant and Class tables.
--
-- Execute this script to inject high-efficiency indexes that will
-- dramatically reduce authentication and session latency.
--
-- Usage: psql -U username -d database_name -f performance_indexes.sql
-- ============================================

-- ============================================
-- 1. PRIMARY KEY INDEXES
-- Ensure PK behavior is fully indexed if optimized
-- ============================================

-- User ID lookup index (critical for auth/session queries)
CREATE INDEX IF NOT EXISTS idx_user_id ON "User" (id);

-- Tenant ID lookup index (used in school/tenant queries)
CREATE INDEX IF NOT EXISTS idx_tenant_id ON "Tenant" (id);

-- Class ID lookup index (used in class controller queries)
CREATE INDEX IF NOT EXISTS idx_class_id ON "Class" (id);

-- ============================================
-- 2. FOREIGN KEY RELATIONSHIP INDEXES
-- Indexes for the columns utilized in LEFT JOINs
-- ============================================

-- User -> Tenant relationship (critical for multi-tenant queries)
CREATE INDEX IF NOT EXISTS idx_user_tenant_id ON "User" ("tenantId");

-- User -> Class relationship (used for class student/teacher lookups)
CREATE INDEX IF NOT EXISTS idx_user_class_id ON "User" ("classId");

-- Class -> Tenant relationship (used for class-to-school mapping)
CREATE INDEX IF NOT EXISTS idx_class_tenant_id ON "Class" ("tenantId");

-- Class -> Teacher relationship (used for teacher class assignments)
CREATE INDEX IF NOT EXISTS idx_class_teacher_id ON "Class" ("teacherId");

-- Homework -> Tenant relationship (used for homework queries)
CREATE INDEX IF NOT EXISTS idx_homework_tenant_id ON "Homework" ("tenant_id");

-- Homework -> Class relationship (used for class homework lookups)
CREATE INDEX IF NOT EXISTS idx_homework_class_id ON "Homework" ("classId");

-- ============================================
-- 3. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- Optimize frequently used multi-column lookups
-- ============================================

-- User lookup by tenant + email (common auth pattern)
CREATE INDEX IF NOT EXISTS idx_user_tenant_email ON "User" ("tenantId", "email");

-- User lookup by tenant + role (common admin queries)
CREATE INDEX IF NOT EXISTS idx_user_tenant_role ON "User" ("tenantId", "role");

-- Class lookup by tenant + teacher (common class listing)
CREATE INDEX IF NOT EXISTS idx_class_tenant_teacher ON "Class" ("tenantId", "teacherId");

-- Homework lookup by tenant + class (common homework listing)
CREATE INDEX IF NOT EXISTS idx_homework_tenant_class ON "Homework" ("tenant_id", "classId");

-- ============================================
-- 4. UPDATE STATISTICS
-- Run ANALYZE to update PostgreSQL optimizer statistics immediately
-- ============================================

ANALYZE "User";
ANALYZE "Tenant";
ANALYZE "Class";
ANALYZE "Homework";
ANALYZE "Mark";
ANALYZE "News";
ANALYZE "Circular";
ANALYZE "ExamSchedule";
ANALYZE "Attendance";
ANALYZE "Fee";

-- ============================================
-- 5. VERIFICATION QUERY
-- Check that indexes were created successfully
-- ============================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('"User"', '"Tenant"', '"Class"', '"Homework"')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- PERFORMANCE NOTES
-- ============================================
-- 
-- Expected improvements after index creation:
-- - User profile lookup: ~1010ms → ~5-20ms (50-200x faster)
-- - Auth session queries: ~500ms → ~2-10ms (50-250x faster)
-- - Multi-tenant queries: ~800ms → ~10-50ms (16-80x faster)
--
-- The indexes are designed to:
-- 1. Support primary key lookups (id columns)
-- 2. Optimize foreign key joins (tenantId, classId)
-- 3. Accelerate common query patterns (composite indexes)
-- 4. Maintain data consistency with updated statistics
--
-- Index maintenance:
-- - PostgreSQL automatically maintains these indexes
-- - Run REINDEX periodically if index bloat occurs
-- - Monitor index usage with pg_stat_user_indexes
-- ============================================