-- ============================================
-- Migration: Content Isolation & Class Targeting
-- Purpose: Enable class-specific targeting for News, Circulars, and fix Exam table
-- Ensures proper data isolation: school-wide vs class-specific content
-- Idempotent: Yes (safe to run multiple times)
-- ============================================

-- ============================================
-- 1. Fix News Table - Add classId for targeting
-- ============================================
-- Add nullable class_id column to News table
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "class_id" UUID REFERENCES "Class"(id) ON DELETE CASCADE;

-- Add index for class-based queries
CREATE INDEX IF NOT EXISTS "idx_news_classId" ON "News"("class_id");

-- Add index for combined tenant+class queries
CREATE INDEX IF NOT EXISTS "idx_news_tenant_class" ON "News"("tenantId", "class_id");

-- ============================================
-- 2. Fix Circular Table - Add classId for targeting
-- ============================================
-- Add nullable class_id column to Circular table
ALTER TABLE "Circular" ADD COLUMN IF NOT EXISTS "class_id" UUID REFERENCES "Class"(id) ON DELETE CASCADE;

-- Add index for class-based queries
CREATE INDEX IF NOT EXISTS "idx_circular_classId" ON "Circular"("class_id");

-- Add index for combined tenant+class queries
CREATE INDEX IF NOT EXISTS "idx_circular_tenant_class" ON "Circular"("tenantId", "class_id");

-- ============================================
-- 3. Fix ExamSchedule Table - Make classId nullable
-- ============================================
-- Drop NOT NULL constraint on classId
ALTER TABLE "ExamSchedule" ALTER COLUMN "classId" DROP NOT NULL;

-- Add index for class-based queries (school-wide when NULL)
CREATE INDEX IF NOT EXISTS "idx_exam_schedule_class" ON "ExamSchedule"("classId");

-- Add index for combined tenant+class queries
CREATE INDEX IF NOT EXISTS "idx_exam_schedule_tenant_class" ON "ExamSchedule"("tenantId", "classId");

-- ============================================
-- 4. Ensure Exam Table (from class_controller_schema) is correct
-- ============================================
-- The Exam table already has correct nullable class_id
-- Just ensure indexes exist
CREATE INDEX IF NOT EXISTS "idx_exam_class" ON "Exam"("class_id");
CREATE INDEX IF NOT EXISTS "idx_exam_tenant_class" ON "Exam"("tenant_id", "class_id");

-- ============================================
-- 5. Data Isolation Views (for verification)
-- ============================================
-- These views help verify proper isolation

-- View: School-wide content (class_id IS NULL)
CREATE OR REPLACE VIEW "SchoolWideContent" AS
SELECT 'News' as type, id, title, "tenantId", "class_id" FROM "News" WHERE "class_id" IS NULL
UNION ALL
SELECT 'Circular' as type, id, title, "tenantId", "class_id" FROM "Circular" WHERE "class_id" IS NULL
UNION ALL
SELECT 'ExamSchedule' as type, id, subject as title, "tenantId", "classId" as "class_id" FROM "ExamSchedule" WHERE "classId" IS NULL;

-- View: Class-specific content
CREATE OR REPLACE VIEW "ClassSpecificContent" AS
SELECT 'News' as type, id, title, "tenantId", "class_id" FROM "News" WHERE "class_id" IS NOT NULL
UNION ALL
SELECT 'Circular' as type, id, title, "tenantId", "class_id" FROM "Circular" WHERE "class_id" IS NOT NULL
UNION ALL
SELECT 'ExamSchedule' as type, id, subject as title, "tenantId", "classId" as "class_id" FROM "ExamSchedule" WHERE "classId" IS NOT NULL;

-- ============================================
-- 6. Verification Queries
-- ============================================
-- Run these to verify the migration worked:

-- Check school-wide vs class-specific content counts:
-- SELECT type, COUNT(*) as count FROM "SchoolWideContent" GROUP BY type;
-- SELECT type, COUNT(*) as count FROM "ClassSpecificContent" GROUP BY type;

-- Check that all tables have proper indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'News' AND indexname LIKE '%class%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'Circular' AND indexname LIKE '%class%';
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ExamSchedule' AND indexname LIKE '%class%';

-- ============================================
-- 7. Important Notes for Backend Updates
-- ============================================
-- After running this migration, backend queries MUST use:
-- WHERE "tenantId" = $1 AND ("class_id" IS NULL OR "class_id" = $2)
-- 
-- This ensures:
-- - Students see school-wide content (class_id IS NULL) + their class's content
-- - Students NEVER see other classes' specific content
-- - Teachers see same as students (unless role-based visibility is added)
-- - Admins see all content (no class filtering)