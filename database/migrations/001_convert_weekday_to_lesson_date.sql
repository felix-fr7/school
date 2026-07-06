-- ============================================
-- Migration: Convert WeeklyLessonLog from weekday to lessonDate
-- ============================================
-- This migration transforms the weekly timetable system from using
-- generic weekdays (1-6) to specific dates (DATE type)
-- ============================================

-- Step 1: Drop the old unique constraint on weekday
ALTER TABLE "WeeklyLessonLog" 
DROP CONSTRAINT IF EXISTS "uq_weeklylessonlog_class_subject_weekday";

-- Step 2: Add the new lessonDate column (allowing NULL temporarily)
ALTER TABLE "WeeklyLessonLog" 
ADD COLUMN "lessonDate" DATE;

-- Step 3: Migrate existing data - convert weekday to actual dates
-- Using the current week's dates based on weekday mapping
-- Weekday 1=Monday, 2=Tuesday, etc.
-- We'll use the Monday of the current week as the base
UPDATE "WeeklyLessonLog" 
SET "lessonDate" = 
  CASE "weekday"
    WHEN 1 THEN DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '0 days'  -- Monday
    WHEN 2 THEN DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '1 day'   -- Tuesday
    WHEN 3 THEN DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '2 days'  -- Wednesday
    WHEN 4 THEN DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '3 days'  -- Thursday
    WHEN 5 THEN DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '4 days'  -- Friday
    WHEN 6 THEN DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '5 days'  -- Saturday
  END;

-- Step 4: Make lessonDate NOT NULL (after migration)
ALTER TABLE "WeeklyLessonLog" 
ALTER COLUMN "lessonDate" SET NOT NULL;

-- Step 5: Drop the old weekday column
ALTER TABLE "WeeklyLessonLog" 
DROP COLUMN "weekday";

-- Step 6: Create new unique constraint for date-based lookup
ALTER TABLE "WeeklyLessonLog" 
ADD CONSTRAINT "uq_weeklylessonlog_class_subject_date" 
UNIQUE ("tenantId", "classId", "subject", "lessonDate");

-- Step 7: Drop old weekday-based index
DROP INDEX IF EXISTS "idx_weekly_lesson_lookup";

-- Step 8: Create new date-based index for efficient lookups
CREATE INDEX IF NOT EXISTS "idx_weekly_lesson_lookup" 
ON "WeeklyLessonLog" ("classId", "lessonDate", "subject");

-- Step 9: Update table and column comments
COMMENT ON COLUMN "WeeklyLessonLog"."lessonDate" IS 
  'The specific date of the lesson (e.g., 2026-07-06)';

COMMENT ON TABLE "WeeklyLessonLog" IS 
  'Stores lesson plans including classwork and homework assignments organized by specific date';

-- ============================================
-- Rollback script (for reference):
-- ============================================
-- To rollback, you would need to:
-- 1. Add back the weekday column
-- 2. Extract weekday from lessonDate (EXTRACT(DOW FROM lessonDate) + 1)
-- 3. Drop lessonDate column
-- 4. Recreate old constraints and indexes
-- ============================================