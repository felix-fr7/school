-- ============================================
-- Migration: Exam Schema Fix for Global Publishing
-- Purpose: Fix column naming consistency and ensure global publishing support
-- Idempotent: Yes (safe to run multiple times)
-- ============================================

-- Drop and recreate Exam table with correct schema
DROP TABLE IF EXISTS "Exam" CASCADE;

-- Create Exam table with proper schema for global publishing
CREATE TABLE IF NOT EXISTS "Exam" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,           -- Dynamic exam name (free text)
  exam_name VARCHAR(255),                 -- Alias for backward compatibility
  class_id UUID REFERENCES "Class"(id) ON DELETE SET NULL,  -- NULL = school-wide
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  file_url TEXT,                          -- Primary file attachment URL (PDF or Image)
  pdf_url TEXT,                           -- Alias for backward compatibility
  image_url TEXT,                         -- Alias for backward compatibility
  due_date TIMESTAMP WITH TIME ZONE,      -- Optional due date
  is_published BOOLEAN DEFAULT true,      -- Publication status
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_exam_class_id ("class_id"),
  INDEX idx_exam_tenant_id ("tenant_id"),
  INDEX idx_exam_is_published ("is_published")
);

-- If table already exists without is_published column, add it
-- This handles the case where the table was created by a previous migration
DO $$
BEGIN
  -- Add is_published column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN is_published BOOLEAN DEFAULT true;
  END IF;

  -- Add exam_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'exam_name'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN exam_name VARCHAR(255);
  END IF;

  -- Add file_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN file_url TEXT;
  END IF;

  -- Add pdf_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'pdf_url'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN pdf_url TEXT;
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN image_url TEXT;
  END IF;

  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add tenant_id column if it doesn't exist (should exist but just in case)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE;
  END IF;

  -- Add class_id column if it doesn't exist (should exist but just in case)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Exam' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN class_id UUID REFERENCES "Class"(id) ON DELETE SET NULL;
  END IF;

  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_exam_class_id ON "Exam"("class_id");
  CREATE INDEX IF NOT EXISTS idx_exam_tenant_id ON "Exam"("tenant_id");
  CREATE INDEX IF NOT EXISTS idx_exam_is_published ON "Exam"("is_published");
  CREATE INDEX IF NOT EXISTS idx_exam_created_at ON "Exam"("createdAt" DESC);
END $$;

-- Create index on createdAt for sorting
CREATE INDEX IF NOT EXISTS idx_exam_created_at ON "Exam"("createdAt" DESC);

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

-- Comments for documentation
COMMENT ON TABLE "Exam" IS 'Exam timetables (PDF/Image based) for school-wide or class-specific exam schedules';
COMMENT ON COLUMN "Exam".title IS 'Name of the exam (e.g., "Midterm Exam 2024") - accepts any dynamic text';
COMMENT ON COLUMN "Exam".exam_name IS 'Alias for title - backward compatibility';
COMMENT ON COLUMN "Exam".class_id IS 'Optional: If NULL, exam is school-wide (global); otherwise class-specific';
COMMENT ON COLUMN "Exam".file_url IS 'Primary URL/path to PDF or Image timetable file';
COMMENT ON COLUMN "Exam".pdf_url IS 'Alias for file_url - backward compatibility';
COMMENT ON COLUMN "Exam".image_url IS 'Alias for file_url - backward compatibility';
COMMENT ON COLUMN "Exam".is_published IS 'Whether the exam is published and visible to students/teachers';