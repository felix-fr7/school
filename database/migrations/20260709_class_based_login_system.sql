-- ============================================================================
-- CLASS-BASED LOGIN & DASHBOARD SYSTEM MIGRATION
-- Removes individual Teacher login credentials, adds Class login system
-- ============================================================================

-- ============================================================================
-- 1. UPDATE CLASS TABLE: Add class_code and password for login
-- ============================================================================

-- Add class_code column (e.g., 'CLS-1', 'CLS-2') if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Class' AND column_name = 'class_code'
  ) THEN
    ALTER TABLE "Class" ADD COLUMN "class_code" VARCHAR(20);
  END IF;
END $$;

-- Add password column for class login if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Class' AND column_name = 'password'
  ) THEN
    ALTER TABLE "Class" ADD COLUMN "password" VARCHAR(255);
  END IF;
END $$;

-- Create sequence for auto-generating class codes
CREATE SEQUENCE IF NOT EXISTS "Class_class_code_seq" START 1;

-- Add unique constraint on class_code per tenant
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraints 
    WHERE constraint_name = 'Class_class_code_tenant_key'
  ) THEN
    ALTER TABLE "Class" ADD CONSTRAINT "Class_class_code_tenant_key" UNIQUE ("class_code", "tenantId");
  END IF;
END $$;

-- ============================================================================
-- 2. UPDATE USER TABLE: Remove password from teachers (make it nullable)
-- Teachers will no longer have login credentials
-- ============================================================================

-- Make password nullable for TEACHER role (they won't have passwords anymore)
-- Note: We don't remove the column, just make it optional since User table is shared

-- Add a new column for teacher directory display (optional class assignment)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'assignedClassId'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "assignedClassId" UUID;
    ALTER TABLE "User" ADD CONSTRAINT "User_assignedClassId_fkey" 
      FOREIGN KEY ("assignedClassId") REFERENCES "Class"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on assignedClassId
CREATE INDEX IF NOT EXISTS "idx_user_assigned_class" ON "User"("assignedClassId");

-- ============================================================================
-- 3. CREATE TEACHER DIRECTORY TABLE (Optional - for static teacher records)
-- This is separate from User table for teachers who don't need any login at all
-- ============================================================================

CREATE TABLE IF NOT EXISTS "TeacherDirectory" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  qualification VARCHAR(255),
  experience INTEGER, -- years of experience
  subject_specialization VARCHAR(255),
  "assignedClassId" UUID REFERENCES "Class"(id) ON DELETE SET NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("tenantId", "email") -- Email unique per school
);

CREATE INDEX IF NOT EXISTS "idx_teacher_directory_tenant" ON "TeacherDirectory"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_teacher_directory_assigned_class" ON "TeacherDirectory"("assignedClassId");

-- ============================================================================
-- 4. UPDATE TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_teacher_directory_updated_at 
  BEFORE UPDATE ON "TeacherDirectory" 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY FOR NEW TABLE
-- ============================================================================

ALTER TABLE "TeacherDirectory" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. SAMPLE DATA: Update existing classes with class_code and password
-- This will auto-generate class codes for existing classes
-- ============================================================================

-- Update existing classes with auto-generated class codes
UPDATE "Class" 
SET "class_code" = 'CLS-' || NEXTVAL('"Class_class_code_seq"')
WHERE "class_code" IS NULL;

-- Note: Passwords for classes must be set by Admin manually
-- Admins will use the reset-password endpoint to set initial passwords

-- ============================================================================
-- 7. CREATE FUNCTION TO AUTO-GENERATE CLASS CODE ON INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."class_code" IS NULL THEN
    NEW."class_code" := 'CLS-' || NEXTVAL('"Class_class_code_seq"');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate class_code on insert
DROP TRIGGER IF EXISTS trigger_generate_class_code ON "Class";
CREATE TRIGGER trigger_generate_class_code
  BEFORE INSERT ON "Class"
  FOR EACH ROW
  EXECUTE FUNCTION generate_class_code();

-- ============================================================================
-- 8. END OF MIGRATION
-- ============================================================================

-- After running this migration:
-- 1. Classes will have class_code (auto-generated like CLS-1, CLS-2)
-- 2. Classes will have password column for login
-- 3. Teachers table (User with role=TEACHER) still exists but password is optional
-- 4. New TeacherDirectory table for static teacher records
-- 5. Use /api/auth/class-login with class_code and password
-- 6. Use /api/admin/classes/:id/reset-password to set class passwords