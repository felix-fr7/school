-- ============================================================================
-- ADD WEEKLY LESSON LOG TABLE
-- This migration adds the missing WeeklyLessonLog table for the weekly lessons feature
-- ============================================================================

-- Create WeeklyLessonLog table
CREATE TABLE IF NOT EXISTS "WeeklyLessonLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "classId" UUID NOT NULL REFERENCES "Class"(id) ON DELETE CASCADE,
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "weekday" INTEGER NOT NULL CHECK ("weekday" >= 1 AND "weekday" <= 6), -- 1=Monday, 6=Saturday
  "subject" VARCHAR(100) NOT NULL,
  "classworkText" TEXT,
  "homeworkText" TEXT,
  "attachments" JSONB DEFAULT '[]'::jsonb, -- Array of file attachment objects
  "createdBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "updatedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("classId", "subject", "weekday") -- Prevent duplicate entries for same class/subject/day
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_class" ON "WeeklyLessonLog"("classId");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_tenant" ON "WeeklyLessonLog"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_weekday" ON "WeeklyLessonLog"("weekday");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_subject" ON "WeeklyLessonLog"("subject");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_created_by" ON "WeeklyLessonLog"("createdBy");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_class_weekday" ON "WeeklyLessonLog"("classId", "weekday");

-- Add trigger for updated_at
CREATE TRIGGER update_weeklylessonlog_updated_at 
BEFORE UPDATE ON "WeeklyLessonLog" 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Enable if using Supabase
ALTER TABLE "WeeklyLessonLog" ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (can be customized based on your auth setup)
-- Teachers can insert/update/delete their own class's lessons
-- CREATE POLICY "Teachers can manage own class lessons" ON "WeeklyLessonLog"
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM "Class" c
--       JOIN "User" u ON c."teacherId" = u.id
--       WHERE c.id = "WeeklyLessonLog"."classId" AND u.id = auth.uid()
--     )
--   );

-- Students can only view their own class's lessons
-- CREATE POLICY "Students can view own class lessons" ON "WeeklyLessonLog"
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM "User" u
--       WHERE u.id = auth.uid() AND u."classId" = "WeeklyLessonLog"."classId"
--     )
--   );

-- Admins can manage all lessons in their tenant
-- CREATE POLICY "Admins can manage tenant lessons" ON "WeeklyLessonLog"
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM "User" u
--       WHERE u.id = auth.uid() AND u.role = 'ADMIN' AND u."tenantId" = "WeeklyLessonLog"."tenantId"
--     )
--   );