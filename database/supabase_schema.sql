-- ============================================================================
-- SCHOOL MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- Raw PostgreSQL SQL Script for Manual Database Setup
-- ============================================================================
-- This script creates all tables, relationships, and indexes for the school
-- management system. Run this in your Supabase SQL Editor.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TENANT TABLE (Schools)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Tenant" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  code VARCHAR(50) UNIQUE,
  address TEXT,
  "schoolLogoUrl" VARCHAR(500) DEFAULT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. USER TABLE (All users: Students, Teachers, Admins, Super Admins)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'STUDENT' 
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT')),
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "classId" UUID REFERENCES "Class"(id) ON DELETE SET NULL,
  "studentId" VARCHAR(50), -- Roll number for students
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("tenantId", "studentId") -- Student ID unique per school
);

-- ============================================================================
-- 3. CLASS TABLE (School classes/sections)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Class" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL, -- e.g., "10th", "9th"
  section VARCHAR(10) NOT NULL, -- e.g., "A", "B"
  "teacherId" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("tenantId", "name", "section") -- Class name+section unique per school
);

-- Add foreign key constraint for User.classId after Class table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'User_classId_fkey' AND table_name = 'User'
  ) THEN
    ALTER TABLE "User" 
    ADD CONSTRAINT "User_classId_fkey" 
    FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. HOMEWORK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Homework" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  "classId" UUID REFERENCES "Class"(id) ON DELETE CASCADE NOT NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "assignedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "dueDate" TIMESTAMP WITH TIME ZONE,
  "isPublished" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. MARK TABLE (Exam marks/grades)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Mark" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "studentId" UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
  subject VARCHAR(100) NOT NULL,
  "marksObtained" NUMERIC(5,2) NOT NULL,
  "totalMarks" NUMERIC(5,2) NOT NULL,
  percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN "totalMarks" > 0 THEN ("marksObtained" / "totalMarks" * 100) ELSE 0 END
  ) STORED,
  grade VARCHAR(10),
  "examType" VARCHAR(50) NOT NULL, -- e.g., "Midterm", "Final"
  "examDate" TIMESTAMP WITH TIME ZONE,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  remarks TEXT,
  "isPublished" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. ATTENDANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Attendance" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  "studentId" UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
  "classId" UUID REFERENCES "Class"(id) ON DELETE CASCADE NOT NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL 
    CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  remarks TEXT,
  "markedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, "studentId") -- One attendance record per student per day
);

-- ============================================================================
-- 7. FEE TABLE (Student fee management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Fee" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "studentId" UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "totalAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "paidAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "balanceAmount" NUMERIC(10,2) GENERATED ALWAYS AS (
    GREATEST(0, "totalAmount" - "paidAmount")
  ) STORED,
  status VARCHAR(20) NOT NULL DEFAULT 'UNPAID'
    CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID')),
  "dueDate" TIMESTAMP WITH TIME ZONE,
  "paymentDate" TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("studentId", "tenantId") -- One fee record per student per school
);

-- ============================================================================
-- 8. NEWS TABLE (School news/announcements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "News" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100), -- e.g., "General", "Sports", "Academic"
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "postedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "isPublished" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 9. CIRCULAR TABLE (Official school circulars)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Circular" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "issuedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "issueDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "isPublished" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 10. EXAM SCHEDULE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "ExamSchedule" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  duration INTEGER, -- Duration in minutes
  room VARCHAR(100),
  "classId" UUID REFERENCES "Class"(id) ON DELETE CASCADE NOT NULL,
  "tenantId" UUID REFERENCES "Tenant"(id) ON DELETE CASCADE NOT NULL,
  "isPublished" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 11. POST TABLE (General posts/blog)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Post" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 12. WEEKLY LESSON LOG TABLE (Weekly timetable lessons)
-- ============================================================================
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

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"(email);
CREATE INDEX IF NOT EXISTS "idx_user_tenant" ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_user_class" ON "User"("classId");
CREATE INDEX IF NOT EXISTS "idx_user_student_id" ON "User"("studentId");
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User"(role);
CREATE INDEX IF NOT EXISTS "idx_user_tenant_student_id" ON "User"("tenantId", "studentId");

-- Class indexes
CREATE INDEX IF NOT EXISTS "idx_class_tenant" ON "Class"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_class_teacher" ON "Class"("teacherId");
CREATE INDEX IF NOT EXISTS "idx_class_tenant_name_section" ON "Class"("tenantId", "name", "section");

-- Homework indexes
CREATE INDEX IF NOT EXISTS "idx_homework_class" ON "Homework"("classId");
CREATE INDEX IF NOT EXISTS "idx_homework_tenant" ON "Homework"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_homework_assigned_by" ON "Homework"("assignedBy");
CREATE INDEX IF NOT EXISTS "idx_homework_published" ON "Homework"("isPublished");
CREATE INDEX IF NOT EXISTS "idx_homework_created_at" ON "Homework"("createdAt" DESC);

-- Mark indexes
CREATE INDEX IF NOT EXISTS "idx_mark_student" ON "Mark"("studentId");
CREATE INDEX IF NOT EXISTS "idx_mark_tenant" ON "Mark"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_mark_exam_type" ON "Mark"("examType");
CREATE INDEX IF NOT EXISTS "idx_mark_published" ON "Mark"("isPublished");
CREATE INDEX IF NOT EXISTS "idx_mark_created_at" ON "Mark"("createdAt" DESC);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS "idx_attendance_student" ON "Attendance"("studentId");
CREATE INDEX IF NOT EXISTS "idx_attendance_class" ON "Attendance"("classId");
CREATE INDEX IF NOT EXISTS "idx_attendance_tenant" ON "Attendance"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "Attendance"(date);
CREATE INDEX IF NOT EXISTS "idx_attendance_student_date" ON "Attendance"("studentId", date DESC);

-- Fee indexes
CREATE INDEX IF NOT EXISTS "idx_fee_student" ON "Fee"("studentId");
CREATE INDEX IF NOT EXISTS "idx_fee_tenant" ON "Fee"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_fee_status" ON "Fee"(status);

-- News indexes
CREATE INDEX IF NOT EXISTS "idx_news_tenant" ON "News"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_news_posted_by" ON "News"("postedBy");
CREATE INDEX IF NOT EXISTS "idx_news_published" ON "News"("isPublished");
CREATE INDEX IF NOT EXISTS "idx_news_created_at" ON "News"("createdAt" DESC);

-- Circular indexes
CREATE INDEX IF NOT EXISTS "idx_circular_tenant" ON "Circular"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_circular_issued_by" ON "Circular"("issuedBy");
CREATE INDEX IF NOT EXISTS "idx_circular_published" ON "Circular"("isPublished");
CREATE INDEX IF NOT EXISTS "idx_circular_issue_date" ON "Circular"("issueDate" DESC);

-- ExamSchedule indexes
CREATE INDEX IF NOT EXISTS "idx_exam_schedule_class" ON "ExamSchedule"("classId");
CREATE INDEX IF NOT EXISTS "idx_exam_schedule_tenant" ON "ExamSchedule"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_exam_schedule_date" ON "ExamSchedule"(date);
CREATE INDEX IF NOT EXISTS "idx_exam_schedule_published" ON "ExamSchedule"("isPublished");

-- Post indexes
CREATE INDEX IF NOT EXISTS "idx_post_user" ON "Post"("userId");
CREATE INDEX IF NOT EXISTS "idx_post_created_at" ON "Post"("createdAt" DESC);

-- WeeklyLessonLog indexes
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_class" ON "WeeklyLessonLog"("classId");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_tenant" ON "WeeklyLessonLog"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_weekday" ON "WeeklyLessonLog"("weekday");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_subject" ON "WeeklyLessonLog"("subject");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_created_by" ON "WeeklyLessonLog"("createdBy");
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_class_weekday" ON "WeeklyLessonLog"("classId", "weekday");

-- Tenant indexes
CREATE INDEX IF NOT EXISTS "idx_tenant_code" ON "Tenant"(code);
CREATE INDEX IF NOT EXISTS "idx_tenant_email" ON "Tenant"(email);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updatedAt (drop first if exists for idempotency)
DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_class_updated_at ON "Class";
CREATE TRIGGER update_class_updated_at BEFORE UPDATE ON "Class" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_homework_updated_at ON "Homework";
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON "Homework" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_mark_updated_at ON "Mark";
CREATE TRIGGER update_mark_updated_at BEFORE UPDATE ON "Mark" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_attendance_updated_at ON "Attendance";
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON "Attendance" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_fee_updated_at ON "Fee";
CREATE TRIGGER update_fee_updated_at BEFORE UPDATE ON "Fee" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_news_updated_at ON "News";
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON "News" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_circular_updated_at ON "Circular";
CREATE TRIGGER update_circular_updated_at BEFORE UPDATE ON "Circular" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_exam_schedule_updated_at ON "ExamSchedule";
CREATE TRIGGER update_exam_schedule_updated_at BEFORE UPDATE ON "ExamSchedule" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_post_updated_at ON "Post";
CREATE TRIGGER update_post_updated_at BEFORE UPDATE ON "Post" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tenant_updated_at ON "Tenant";
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON "Tenant" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_weeklylessonlog_updated_at ON "WeeklyLessonLog";
CREATE TRIGGER update_weeklylessonlog_updated_at BEFORE UPDATE ON "WeeklyLessonLog" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA (Optional - Remove if not needed)
-- ============================================================================

-- Create a default super admin tenant (the platform itself)
INSERT INTO "Tenant" (id, name, email, code) 
VALUES ('00000000-0000-0000-0000-000000000001', 'School Platform', 'admin@school.platform', 'PLATFORM')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Homework" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mark" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Fee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "News" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Circular" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyLessonLog" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured based on your authentication setup
-- The following are example policies that can be customized

-- Example: Allow authenticated users to read their own data
-- CREATE POLICY "Users can view own data" ON "User"
--   FOR SELECT USING (auth.uid() = id);

-- Example: Allow admins to manage their tenant's data
-- CREATE POLICY "Admins can manage tenant data" ON "User"
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM "User" u 
--       WHERE u.id = auth.uid() AND u.role = 'ADMIN' AND u."tenantId" = "User"."tenantId"
--     )
--   );

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================