-- ============================================
-- Database Migration: BLOB Storage for Files
-- ============================================
-- This migration adds BYTEA columns to store file data directly in PostgreSQL
-- All uploaded files (Images, PDFs) will be stored as binary data instead of file paths
-- Date: 2026-07-28
-- ============================================

-- ============================================
-- 1. Exam Table - Add file_data, file_mime_type, file_name columns
-- ============================================
ALTER TABLE "Exam" 
ADD COLUMN IF NOT EXISTS "file_data" BYTEA,
ADD COLUMN IF NOT EXISTS "file_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "file_name" VARCHAR(255);

-- Migrate existing data from file_url to new columns
-- Note: This will set file_data to NULL for existing records
-- Existing file_url is kept for backward compatibility during transition
UPDATE "Exam" 
SET 
  "file_name" = CASE 
    WHEN "file_url" IS NOT NULL AND "file_url" != '' 
    THEN substring("file_url" from position('/uploads/' in "file_url") + 9)
    ELSE NULL 
  END
WHERE "file_data" IS NULL AND "file_url" IS NOT NULL AND "file_url" != '';

-- ============================================
-- 2. News Table - Add file_data columns for image and PDF
-- ============================================
ALTER TABLE "News" 
ADD COLUMN IF NOT EXISTS "image_data" BYTEA,
ADD COLUMN IF NOT EXISTS "image_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "image_file_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "pdf_data" BYTEA,
ADD COLUMN IF NOT EXISTS "pdf_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "pdf_file_name" VARCHAR(255);

-- ============================================
-- 3. Circular Table - Add file_data columns for image
-- ============================================
ALTER TABLE "Circular" 
ADD COLUMN IF NOT EXISTS "image_data" BYTEA,
ADD COLUMN IF NOT EXISTS "image_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "image_file_name" VARCHAR(255);

-- ============================================
-- 4. Homework Table - Add attachment support
-- ============================================
ALTER TABLE "Homework" 
ADD COLUMN IF NOT EXISTS "attachment_data" BYTEA,
ADD COLUMN IF NOT EXISTS "attachment_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "attachment_file_name" VARCHAR(255);

-- ============================================
-- 5. WeeklyLesson Table - Add attachment support
-- ============================================
ALTER TABLE "WeeklyLesson" 
ADD COLUMN IF NOT EXISTS "attachment_data" BYTEA,
ADD COLUMN IF NOT EXISTS "attachment_mime_type" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "attachment_file_name" VARCHAR(255);

-- ============================================
-- 6. Create index for faster file retrieval
-- ============================================
-- Index on Exam table for file_data existence check
CREATE INDEX IF NOT EXISTS "idx_exam_has_file_data" ON "Exam" (("file_data" IS NOT NULL));

-- Index on News table for image_data existence check
CREATE INDEX IF NOT EXISTS "idx_news_has_image_data" ON "News" (("image_data" IS NOT NULL));

-- Index on News table for pdf_data existence check
CREATE INDEX IF NOT EXISTS "idx_news_has_pdf_data" ON "News" (("pdf_data" IS NOT NULL));

-- ============================================
-- 7. Create Files table for centralized file management (Optional)
-- ============================================
-- This table can be used to store files separately and reference them from other tables
CREATE TABLE IF NOT EXISTS "File" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_data BYTEA NOT NULL,
  uploaded_by UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT "File_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") 
    REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT "File_tenant_id_fkey" FOREIGN KEY ("tenant_id") 
    REFERENCES "Tenant"(id) ON DELETE CASCADE
);

-- Index for file lookups
CREATE INDEX IF NOT EXISTS "idx_file_tenant_id" ON "File"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_file_uploaded_by" ON "File"("uploaded_by");

-- ============================================
-- 8. Create function to get file size from BYTEA
-- ============================================
CREATE OR REPLACE FUNCTION get_file_size(file_data BYTEA) 
RETURNS INTEGER AS $$
BEGIN
  IF file_data IS NULL THEN
    RETURN 0;
  END IF;
  RETURN octet_length(file_data);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Create view for file statistics
-- ============================================
CREATE OR REPLACE VIEW "FileStatistics" AS
SELECT 
  'Exam' as table_name,
  COUNT(*) as total_records,
  COUNT("file_data") as records_with_file,
  SUM(CASE WHEN "file_data" IS NOT NULL THEN octet_length("file_data") ELSE 0 END) as total_file_bytes
FROM "Exam"
UNION ALL
SELECT 
  'News' as table_name,
  COUNT(*) as total_records,
  COUNT("image_data") + COUNT("pdf_data") as records_with_file,
  SUM(CASE WHEN "image_data" IS NOT NULL THEN octet_length("image_data") ELSE 0 END +
      CASE WHEN "pdf_data" IS NOT NULL THEN octet_length("pdf_data") ELSE 0 END) as total_file_bytes
FROM "News"
UNION ALL
SELECT 
  'Circular' as table_name,
  COUNT(*) as total_records,
  COUNT("image_data") as records_with_file,
  SUM(CASE WHEN "image_data" IS NOT NULL THEN octet_length("image_data") ELSE 0 END) as total_file_bytes
FROM "Circular"
UNION ALL
SELECT 
  'Homework' as table_name,
  COUNT(*) as total_records,
  COUNT("attachment_data") as records_with_file,
  SUM(CASE WHEN "attachment_data" IS NOT NULL THEN octet_length("attachment_data") ELSE 0 END) as total_file_bytes
FROM "Homework"
UNION ALL
SELECT 
  'WeeklyLesson' as table_name,
  COUNT(*) as total_records,
  COUNT("attachment_data") as records_with_file,
  SUM(CASE WHEN "attachment_data" IS NOT NULL THEN octet_length("attachment_data") ELSE 0 END) as total_file_bytes
FROM "WeeklyLesson"
UNION ALL
SELECT 
  'File' as table_name,
  COUNT(*) as total_records,
  COUNT(*) as records_with_file,
  SUM(octet_length(file_data)) as total_file_bytes
FROM "File";

-- ============================================
-- Migration Complete
-- ============================================
-- After running this migration:
-- 1. Update controllers to store file buffers in new BYTEA columns
-- 2. Update file retrieval to serve from BYTEA columns
-- 3. Optionally remove old file_url columns after verification
-- 4. Clean up the uploads/ directory
-- ============================================