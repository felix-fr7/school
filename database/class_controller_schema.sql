-- ============================================
-- Class Controller Database Schema
-- PostgreSQL/Supabase compatible
-- For Class ID (CLS-X) login system
-- ============================================

-- ============================================
-- Students Table (extends "User" table)
-- ============================================
-- Note: Students are stored in the existing "User" table with role = 'STUDENT'
-- The "User" table already has studentId field for sequential IDs (STU-XXXX)
-- No additional table needed - just ensure proper indexing

CREATE INDEX IF NOT EXISTS idx_user_classId_role 
ON "User"("classId", role) 
WHERE role = 'STUDENT';

CREATE INDEX IF NOT EXISTS idx_user_studentId 
ON "User"("studentId") 
WHERE role = 'STUDENT';

-- ============================================
-- Homework Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Homework" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  classId UUID NOT NULL REFERENCES "Class"(id) ON DELETE CASCADE,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  assignedBy UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  dueDate TIMESTAMP WITH TIME ZONE,
  isPublished BOOLEAN DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_homework_classId ("classId"),
  INDEX idx_homework_tenantId ("tenantId"),
  INDEX idx_homework_isPublished ("isPublished"),
  INDEX idx_homework_dueDate ("dueDate")
);

-- ============================================
-- Attendance Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Attendance" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  classId UUID NOT NULL REFERENCES "Class"(id) ON DELETE CASCADE,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  attendanceDate DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
  remarks TEXT,
  markedBy UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one attendance record per student per day
  UNIQUE(attendanceDate, studentId),
  
  -- Indexes for performance
  INDEX idx_attendance_classId_date ("classId", attendanceDate),
  INDEX idx_attendance_studentId ("studentId"),
  INDEX idx_attendance_date ("attendanceDate")
);

-- ============================================
-- Exams Table (for PDF/Image based exam timetables)
-- ============================================
CREATE TABLE IF NOT EXISTS "Exam" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  examName VARCHAR(255) NOT NULL,
  classId UUID REFERENCES "Class"(id) ON DELETE SET NULL,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  pdfUrl TEXT,
  imageUrl TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_exam_classId ("classId"),
  INDEX idx_exam_tenantId ("tenantId")
);

-- ============================================
-- Circulars Table (for class-specific circulars)
-- ============================================
-- Note: General circulars are stored in existing "Circular" table
-- This table is for class-specific circulars created by Class Controllers
-- If you want to use the existing Circular table, just ensure proper visibility filtering

CREATE TABLE IF NOT EXISTS "ClassCircular" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  circularNo VARCHAR(50),
  classId UUID NOT NULL REFERENCES "Class"(id) ON DELETE CASCADE,
  tenantId UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  issuedBy UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  isPublished BOOLEAN DEFAULT true,
  issueDate DATE DEFAULT CURRENT_DATE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_class_circular_classId ("classId"),
  INDEX idx_class_circular_tenantId ("tenantId"),
  INDEX idx_class_circular_isPublished ("isPublished"),
  INDEX idx_class_circular_issueDate ("issueDate")
);

-- ============================================
-- Useful Queries for Class Controller System
-- ============================================

-- Get next sequential student ID
-- SELECT 'STU-' || LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0') as nextStudentId
-- FROM "User" WHERE role = 'STUDENT';

-- Get all students for a class with attendance stats for today
-- SELECT 
--   u.id, u.name, u.email, u."studentId",
--   COALESCE(a.status, 'unmarked') as todayAttendance
-- FROM "User" u
-- LEFT JOIN "Attendance" a ON a."studentId" = u.id 
--   AND a."attendanceDate" = CURRENT_DATE
--   AND a."classId" = u."classId"
-- WHERE u."classId" = 'CLASS_UUID' 
--   AND u.role = 'STUDENT'
-- ORDER BY u.name ASC;

-- Get homework with student submission stats
-- SELECT 
--   h.*,
--   COUNT(DISTINCT s.id) as totalStudents,
--   COUNT(DISTINCT CASE WHEN hs.status = 'submitted' THEN s.id END) as submittedCount
-- FROM "Homework" h
-- LEFT JOIN "User" s ON s."classId" = h."classId" AND s.role = 'STUDENT'
-- LEFT JOIN "HomeworkSubmission" hs ON hs."homeworkId" = h.id AND hs."studentId" = s.id
-- WHERE h."classId" = 'CLASS_UUID'
-- GROUP BY h.id
-- ORDER BY h."dueDate" DESC;

-- Get monthly attendance summary for a class
-- SELECT 
--   DATE_TRUNC('month', a."attendanceDate") as month,
--   COUNT(CASE WHEN a.status = 'present' THEN 1 END) as presentDays,
--   COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absentDays,
--   COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excusedDays,
--   ROUND(
--     COUNT(CASE WHEN a.status = 'present' THEN 1 END)::DECIMAL / 
--     COUNT(*)::DECIMAL * 100, 2
--   ) as attendanceRate
-- FROM "Attendance" a
-- WHERE a."classId" = 'CLASS_UUID'
--   AND a."attendanceDate" >= DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY DATE_TRUNC('month', a."attendanceDate")
-- ORDER BY month DESC;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Run this only if you want test data in your development environment

-- INSERT INTO "Homework" (title, description, subject, "classId", "tenantId", "assignedBy", "dueDate")
-- SELECT 
--   'Math Homework Chapter 5',
--   'Complete exercises 1-20 on page 45',
--   'Mathematics',
--   (SELECT id FROM "Class" LIMIT 1),
--   (SELECT id FROM "Tenant" LIMIT 1),
--   (SELECT id FROM "User" WHERE role = 'TEACHER' LIMIT 1),
--   CURRENT_DATE + INTERVAL '7 days';

-- ============================================
-- Database Maintenance
-- ============================================

-- Update timestamps trigger for Homework
CREATE OR REPLACE FUNCTION update_homework_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_homework_updated_at ON "Homework";
CREATE TRIGGER trigger_update_homework_updated_at
BEFORE UPDATE ON "Homework"
FOR EACH ROW
EXECUTE FUNCTION update_homework_updated_at();

-- Update timestamps trigger for Attendance
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_updated_at ON "Attendance";
CREATE TRIGGER trigger_update_attendance_updated_at
BEFORE UPDATE ON "Attendance"
FOR EACH ROW
EXECUTE FUNCTION update_attendance_updated_at();

-- Update timestamps trigger for ClassCircular
CREATE OR REPLACE FUNCTION update_class_circular_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_class_circular_updated_at ON "ClassCircular";
CREATE TRIGGER trigger_update_class_circular_updated_at
BEFORE UPDATE ON "ClassCircular"
FOR EACH ROW
EXECUTE FUNCTION update_class_circular_updated_at();
