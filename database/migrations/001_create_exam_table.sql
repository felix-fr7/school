-- ============================================
-- Migration: Create Exam Table for Exam Timetables
-- Purpose: PDF/Image based exam timetables for admin content management
-- Idempotent: Yes (safe to run multiple times)
-- ============================================

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS "Exam" CASCADE;

-- Create Exam table for PDF/Image exam timetables
CREATE TABLE IF NOT EXISTS "Exam" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "examName" VARCHAR(255) NOT NULL,
  "classId" UUID REFERENCES "Class"(id) ON DELETE SET NULL,
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "pdfUrl" TEXT,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_exam_classId ("classId"),
  INDEX idx_exam_tenantId ("tenantId")
);

-- Create index on createdAt for sorting
CREATE INDEX IF NOT EXISTS idx_exam_createdAt ON "Exam"("createdAt" DESC);

-- Update trigger for updatedAt
CREATE OR REPLACE FUNCTION update_exam_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_exam_updated_at ON "Exam";
CREATE TRIGGER trigger_update_exam_updated_at
BEFORE UPDATE ON "Exam"
FOR EACH ROW
EXECUTE FUNCTION update_exam_updated_at();

-- Comment
COMMENT ON TABLE "Exam" IS 'Exam timetables (PDF/Image based) for school-wide or class-specific exam schedules';
COMMENT ON COLUMN "Exam"."examName" IS 'Name of the exam (e.g., "Midterm Exam 2024")';
COMMENT ON COLUMN "Exam"."classId" IS 'Optional: If NULL, exam is school-wide; otherwise class-specific';
COMMENT ON COLUMN "Exam"."pdfUrl" IS 'URL/path to PDF timetable file';
COMMENT ON COLUMN "Exam"."imageUrl" IS 'URL/path to image file of timetable';