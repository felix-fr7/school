-- ============================================================================
-- ADMIN QUERIES PERFORMANCE INDEXES
-- Fixes slow query warnings for admin dashboard and list operations
-- ============================================================================
-- Run this in your Supabase SQL Editor to add missing indexes
-- that improve admin panel query performance.
-- ============================================================================

-- ============================================================================
-- CRITICAL: Indexes for User queries by tenantId and role
-- ============================================================================
-- The admin controller frequently queries:
--   SELECT COUNT(*) FROM "User" WHERE "tenantId" = $1 AND role = $2
--   SELECT * FROM "User" WHERE "tenantId" = $1 AND role = $2 ...
-- These indexes will dramatically speed up student/teacher list queries.

CREATE INDEX IF NOT EXISTS "idx_user_tenant_role" ON "User"("tenantId", role) WHERE role IS NOT NULL;

-- Covering index for User tenant/role queries with common columns
CREATE INDEX IF NOT EXISTS "idx_user_tenant_role_covering" ON "User"("tenantId", role) 
  INCLUDE (id, email, name, phone, "studentId", "classId", "createdAt", "updatedAt")
  WHERE role IS NOT NULL;

-- ============================================================================
-- Indexes for News queries by tenantId and isPublished
-- ============================================================================
-- The admin controller frequently queries:
--   SELECT COUNT(*) FROM "News" WHERE "tenantId" = $1 AND "isPublished" = $2
--   SELECT * FROM "News" WHERE "tenantId" = $1 AND "isPublished" = $2 ...

CREATE INDEX IF NOT EXISTS "idx_news_tenant_published" ON "News"("tenantId", "isPublished") WHERE "isPublished" IS NOT NULL;

-- Covering index for News tenant/published queries with common columns
CREATE INDEX IF NOT EXISTS "idx_news_tenant_published_covering" ON "News"("tenantId", "isPublished") 
  INCLUDE (id, title, content, summary, category, "imageUrl", "postedBy", "createdAt", "updatedAt")
  WHERE "isPublished" IS NOT NULL;

-- ============================================================================
-- Indexes for Circular queries by tenantId and isPublished
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_circular_tenant_published" ON "Circular"("tenantId", "isPublished") WHERE "isPublished" IS NOT NULL;

-- ============================================================================
-- Indexes for ExamSchedule queries by tenantId and isPublished
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_examschedule_tenant_published" ON "ExamSchedule"("tenantId", "isPublished") WHERE "isPublished" IS NOT NULL;

-- ============================================================================
-- Indexes for Homework queries by tenantId and isPublished
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_homework_tenant_published" ON "Homework"("tenant_id", "is_published") WHERE "is_published" IS NOT NULL;

-- ============================================================================
-- Indexes for Mark queries by tenantId
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_mark_tenant" ON "Mark"("tenantId") WHERE "tenantId" IS NOT NULL;

-- ============================================================================
-- Indexes for Class queries by tenantId (for class list operations)
-- ============================================================================
CREATE INDEX IF NOT EXISTS "idx_class_tenant" ON "Class"("tenantId") WHERE "tenantId" IS NOT NULL;

-- Covering index for Class tenant queries
CREATE INDEX IF NOT EXISTS "idx_class_tenant_covering" ON "Class"("tenantId") 
  INCLUDE (id, name, section, "teacherId", "class_code", "createdAt", "updatedAt")
  WHERE "tenantId" IS NOT NULL;

-- ============================================================================
-- Indexes for Student-Class join optimization
-- ============================================================================
-- Optimizes queries that join User (students) with Class
CREATE INDEX IF NOT EXISTS "idx_user_classId" ON "User"("classId") WHERE "classId" IS NOT NULL AND role = 'STUDENT';

-- ============================================================================
-- ANALYZE tables to update query planner statistics
-- ============================================================================
ANALYZE "User";
ANALYZE "News";
ANALYZE "Circular";
ANALYZE "ExamSchedule";
ANALYZE "Homework";
ANALYZE "Mark";
ANALYZE "Class";

-- ============================================================================
-- Verify indexes were created
-- ============================================================================
-- Run this query to verify:
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename IN ('User', 'News', 'Circular', 'ExamSchedule', 'Homework', 'Mark', 'Class')
-- ORDER BY indexname;