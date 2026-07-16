-- ============================================
-- Quick Fix: Update Existing Exam Rows
-- Purpose: Fix is_published column for any existing exam rows
-- Run this in Supabase SQL Editor if exams are not showing up
-- ============================================

-- 1. First, ensure the is_published column exists and set default
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- 2. Update all existing rows to have is_published = true
-- This fixes any rows that were inserted before the column was added
UPDATE "Exam" SET is_published = true WHERE is_published IS NULL;

-- 3. Verify the fix - check how many exams are now visible
SELECT 
  COUNT(*) as total_exams,
  COUNT(*) FILTER (WHERE is_published = true) as published_exams,
  COUNT(*) FILTER (WHERE is_published IS NULL) as null_published_exams
FROM "Exam";

-- 4. Sample the data to verify tenant_id and class_id values
SELECT 
  id,
  title,
  exam_name,
  class_id,
  tenant_id,
  file_url,
  is_published,
  created_at
FROM "Exam"
ORDER BY created_at DESC
LIMIT 10;