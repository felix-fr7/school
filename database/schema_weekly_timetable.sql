-- ============================================
-- Weekly Timetable Schema - Pure PostgreSQL
-- ============================================
-- Master schema file for WeeklyLessonLog table
-- Used for date-based homework/classwork management
-- Compatible with native pg driver (no ORM)
-- ============================================

-- Drop existing table and related objects for clean re-runs
DROP TRIGGER IF EXISTS update_weeklylessonlog_updatedat ON "WeeklyLessonLog";
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS "WeeklyLessonLog";

-- ============================================
-- CREATE TABLE: WeeklyLessonLog
-- ============================================
CREATE TABLE "WeeklyLessonLog" (
  -- Primary Key
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant isolation
  "tenantId" UUID NOT NULL,
  "classId" UUID NOT NULL,
  
  -- Lesson identification
  "subject" VARCHAR(100) NOT NULL,
  "lessonDate" DATE NOT NULL,
  
  -- Lesson content
  "classworkText" TEXT DEFAULT '',
  "homeworkText" TEXT DEFAULT '',
  
  -- File attachments (stored as JSON array)
  "attachments" JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Foreign key constraints
  CONSTRAINT "fk_weeklylessonlog_tenant" 
    FOREIGN KEY ("tenantId") 
    REFERENCES "Tenant"("id") 
    ON DELETE CASCADE,
  
  CONSTRAINT "fk_weeklylessonlog_class" 
    FOREIGN KEY ("classId") 
    REFERENCES "Class"("id") 
    ON DELETE CASCADE,
  
  CONSTRAINT "fk_weeklylessonlog_created_by" 
    FOREIGN KEY ("createdBy") 
    REFERENCES "User"("id") 
    ON DELETE SET NULL,
  
  CONSTRAINT "fk_weeklylessonlog_updated_by" 
    FOREIGN KEY ("updatedBy") 
    REFERENCES "User"("id") 
    ON DELETE SET NULL,
  
  -- Unique constraint to prevent duplicate entries
  -- Same class can only have one lesson per subject per date
  CONSTRAINT "uq_weeklylessonlog_class_subject_date" 
    UNIQUE ("tenantId", "classId", "subject", "lessonDate")
);

-- ============================================
-- CREATE INDEXES: Performance optimization
-- ============================================

-- Index for tenant isolation queries (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_weekly_lesson_tenant_class" 
ON "WeeklyLessonLog" ("tenantId", "classId");

-- Composite index for efficient lesson lookups by date and subject
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_weekly_lesson_lookup" 
ON "WeeklyLessonLog" ("classId", "lessonDate", "subject");

-- Index for filtering by creator (audit trail queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_weekly_lesson_created_by" 
ON "WeeklyLessonLog" ("createdBy");

-- Index for timestamp-based queries (recent lessons, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_weekly_lesson_created_at" 
ON "WeeklyLessonLog" ("createdAt" DESC);

-- ============================================
-- TRIGGER: Auto-update updatedAt timestamp
-- ============================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updatedAt field to current timestamp
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the WeeklyLessonLog table
CREATE TRIGGER update_weeklylessonlog_updatedat
  BEFORE UPDATE ON "WeeklyLessonLog"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS: Documentation for future reference
-- ============================================

COMMENT ON TABLE "WeeklyLessonLog" IS 
  'Stores lesson plans including classwork and homework assignments organized by specific date';

COMMENT ON COLUMN "WeeklyLessonLog"."lessonDate" IS 
  'The specific date of the lesson (e.g., 2026-07-06)';

COMMENT ON COLUMN "WeeklyLessonLog"."attachments" IS 
  'JSON array of file attachments: [{"path": string, "name": string, "size": number, "mimetype": string}]';

COMMENT ON COLUMN "WeeklyLessonLog"."classworkText" IS 
  'In-class work description and instructions for the lesson';

COMMENT ON COLUMN "WeeklyLessonLog"."homeworkText" IS 
  'Take-home assignment description and instructions';

-- ============================================
-- USAGE EXAMPLES (for reference)
-- ============================================

-- Example 1: Insert a new lesson (UPSERT pattern used in controller)
-- INSERT INTO "WeeklyLessonLog" 
--   ("lessonDate", "subject", "classworkText", "homeworkText", "classId", "tenantId", "createdBy", "updatedBy")
-- VALUES ('2026-07-06', 'Mathematics', 'Chapter 5 exercises', 'Page 45 problems', 'class-uuid', 'tenant-uuid', 'user-uuid', 'user-uuid')
-- ON CONFLICT ("classId", "subject", "lessonDate") 
-- DO UPDATE SET 
--   "classworkText" = EXCLUDED."classworkText",
--   "homeworkText" = EXCLUDED."homeworkText",
--   "updatedBy" = EXCLUDED."updatedBy",
--   "updatedAt" = NOW();

-- Example 2: Get all lessons for a class organized by date
-- SELECT 
--   wll.id,
--   wll."classworkText",
--   wll."homeworkText",
--   wll."lessonDate",
--   wll."subject",
--   wll."attachments",
--   u.name as "creatorName"
-- FROM "WeeklyLessonLog" wll
-- LEFT JOIN "User" u ON wll."createdBy" = u.id
-- WHERE wll."classId" = 'class-uuid' AND wll."tenantId" = 'tenant-uuid'
-- ORDER BY wll."lessonDate" DESC, wll."subject" ASC;

-- Example 3: Get lessons for a specific date
-- SELECT * FROM "WeeklyLessonLog"
-- WHERE "classId" = 'class-uuid' AND "tenantId" = 'tenant-uuid' AND "lessonDate" = '2026-07-06'
-- ORDER BY "subject" ASC;

-- ============================================
-- END OF SCHEMA
-- ============================================