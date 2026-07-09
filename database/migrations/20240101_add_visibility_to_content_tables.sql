-- ============================================================================
-- MIGRATION: Add Visibility Control to News, Circulars, and Exams Tables
-- Description: Adds visibility field for targeted audience control (ALL vs TEACHERS_ONLY)
--              Also adds image_url and pdf_url fields for rich media support
-- Date: 2024-01-01
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Update NEWS Table with visibility and media fields
-- ============================================================================

-- Add new columns to News table if they don't exist
DO $$
BEGIN
    -- Add visibility column with default 'ALL'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'News' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE "News" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'ALL'
            CHECK ("visibility" IN ('ALL', 'TEACHERS_ONLY'));
    END IF;
    
    -- Add image_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'News' AND column_name = 'imageUrl'
    ) THEN
        ALTER TABLE "News" ADD COLUMN "imageUrl" VARCHAR(500) DEFAULT NULL;
    END IF;
    
    -- Add pdf_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'News' AND column_name = 'pdfUrl'
    ) THEN
        ALTER TABLE "News" ADD COLUMN "pdfUrl" VARCHAR(500) DEFAULT NULL;
    END IF;
END $$;

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS "idx_news_visibility" ON "News"("visibility");

-- ============================================================================
-- 2. Update CIRCULAR Table with visibility and media fields
-- ============================================================================

-- Add new columns to Circular table if they don't exist
DO $$
BEGIN
    -- Add visibility column with default 'ALL'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Circular' AND column_name = 'visibility'
    ) THEN
        ALTER TABLE "Circular" ADD COLUMN "visibility" VARCHAR(20) NOT NULL DEFAULT 'ALL'
            CHECK ("visibility" IN ('ALL', 'TEACHERS_ONLY'));
    END IF;
    
    -- Add image_url column (for scanned circular images)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Circular' AND column_name = 'imageUrl'
    ) THEN
        ALTER TABLE "Circular" ADD COLUMN "imageUrl" VARCHAR(500) DEFAULT NULL;
    END IF;
    
    -- Rename 'content' to 'message' for clarity (keeping content as fallback)
    -- Note: We keep 'content' column but it serves as the message field
END $$;

-- Create index for visibility filtering
CREATE INDEX IF NOT EXISTS "idx_circular_visibility" ON "Circular"("visibility");

-- ============================================================================
-- 3. Create new EXAMS Table for exam timetables/schedules with media
-- This is a new table specifically for exam timetables that can be uploaded as PDF or Image
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Exam" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "examName" VARCHAR(255) NOT NULL,
    "classId" UUID REFERENCES "Class"(id) ON DELETE CASCADE, -- NULL for general/school-wide exams
    "pdfUrl" VARCHAR(500) DEFAULT NULL,
    "imageUrl" VARCHAR(500) DEFAULT NULL,
    "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for Exam table
CREATE INDEX IF NOT EXISTS "idx_exam_tenant" ON "Exam"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_exam_class" ON "Exam"("classId");
CREATE INDEX IF NOT EXISTS "idx_exam_created_at" ON "Exam"("createdAt" DESC);

-- ============================================================================
-- 4. Update triggers for updated_at
-- ============================================================================

-- Add trigger for Exam table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_exam_updated_at'
    ) THEN
        CREATE TRIGGER update_exam_updated_at 
        BEFORE UPDATE ON "Exam" 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- 5. Row Level Security Policies (for Supabase)
-- ============================================================================

-- Enable RLS on Exam table
ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured based on your authentication setup
-- Example policies:
-- CREATE POLICY "Admins can manage exams" ON "Exam"
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM "User" u 
--       WHERE u.id = auth.uid() AND u.role = 'ADMIN' AND u."tenantId" = "Exam"."tenantId"
--     )
--   );
--
-- CREATE POLICY "Teachers can view exams" ON "Exam"
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM "User" u 
--       WHERE u.id = auth.uid() AND u.role IN ('TEACHER', 'ADMIN', 'SUPER_ADMIN')
--     )
--   );
--
-- CREATE POLICY "Students can view exams" ON "Exam"
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM "User" u 
--       WHERE u.id = auth.uid() AND u.role = 'STUDENT'
--     )
--   );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================