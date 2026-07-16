-- ============================================
-- Migration: Add class_code and password to Class table
-- Date: 2026-07-16
-- Purpose: Enable class-based login (CLS-X) functionality
-- ============================================

-- Add class_code column (auto-generated unique code like CLS-1, CLS-2)
ALTER TABLE "Class" 
ADD COLUMN IF NOT EXISTS "class_code" VARCHAR(50);

-- Add password column for class-based login
ALTER TABLE "Class" 
ADD COLUMN IF NOT EXISTS "password" VARCHAR(255);

-- Create index on class_code for faster lookups
CREATE INDEX IF NOT EXISTS "idx_class_class_code" ON "Class"("class_code");

-- Update existing classes with auto-generated class codes
-- Format: CLS-<id_first_4_chars>
UPDATE "Class" 
SET "class_code" = 'CLS-' || UPPER(SUBSTRING(id::text, 1, 4))
WHERE "class_code" IS NULL;

-- Ensure class_code is unique (may fail if duplicates exist, handle manually)
-- First, make sure all class_codes are unique by appending a number if needed
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
    new_code VARCHAR(50);
BEGIN
    FOR rec IN 
        SELECT id, "class_code", COUNT(*) as cnt
        FROM "Class"
        WHERE "class_code" IS NOT NULL
        GROUP BY "class_code"
        HAVING COUNT(*) > 1
    LOOP
        -- For each duplicate, update with unique code
        FOR duplicate IN 
            SELECT id FROM "Class" 
            WHERE "class_code" = rec."class_code" 
            OFFSET 1  -- Skip the first one
        LOOP
            new_code := rec."class_code" || '-' || counter;
            UPDATE "Class" SET "class_code" = new_code WHERE id = duplicate.id;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- Now add unique constraint
ALTER TABLE "Class" 
ADD CONSTRAINT "Class_class_code_key" UNIQUE ("class_code");

-- Add check constraint to ensure class_code format
ALTER TABLE "Class"
ADD CONSTRAINT "Class_class_code_check" 
CHECK ("class_code" IS NULL OR "class_code" ~ '^CLS-[A-Z0-9-]+$');

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Class table migration completed successfully';
    RAISE NOTICE 'Added class_code and password columns';
    RAISE NOTICE 'Generated class codes for existing classes';
END $$;