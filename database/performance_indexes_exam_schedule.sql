-- ============================================
-- Performance Optimization for Exam Schedule & Related Queries
-- ============================================

-- Index for User queries (tenantId + role)
-- Speeds up: getAllStudents, getClassDashboard student counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_role 
ON "User"("tenantId", role);

-- Index for News queries (tenantId + isPublished)
-- Speeds up: getAllNews, getMySchoolStats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_tenant_published 
ON "News"("tenantId", "isPublished");

-- Index for Class queries with student/homework/exam counts
-- Speeds up: getAllClasses, getClassDashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_tenant 
ON "Class"("tenantId");

-- Index for User classId (for student count queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_classid_role 
ON "User"("classId", role) WHERE role = 'STUDENT';

-- Index for Homework class_id (for homework count queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_class_id 
ON "Homework"("class_id");

-- Index for Exam class_id (for exam count queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_class_id 
ON "Exam"("class_id");

-- Index for ExamSchedule queries (tenantId + isPublished + classId)
-- Speeds up: getExamSchedules, student/teacher filtered views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examschedule_tenant_published_class 
ON "ExamSchedule"("tenantId", "isPublished", "classId");

-- Index for ExamSchedule date ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examschedule_date 
ON "ExamSchedule"(date ASC);

-- Index for ExamSchedule fileUrl (for file-based lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_examschedule_fileurl 
ON "ExamSchedule"("fileUrl") WHERE "fileUrl" IS NOT NULL;

-- Composite index for User lookups by tenantId and studentId/rollNumber
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_studentid 
ON "User"("tenantId", "studentId");

-- Index for Homework tenant_id queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_tenant_id 
ON "Homework"("tenant_id");

-- Index for Mark tenantId queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mark_tenant_id 
ON "Mark"("tenantId");

-- Index for Circular tenantId + isPublished
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_circular_tenant_published 
ON "Circular"("tenantId", "isPublished");

-- Index for WeeklyLessons classId queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weeklylessons_classid 
ON "WeeklyLessons"("classId");

-- Analyze tables to update statistics for query planner
ANALYZE "User";
ANALYZE "Class";
ANALYZE "News";
ANALYZE "ExamSchedule";
ANALYZE "Homework";
ANALYZE "Exam";
ANALYZE "Mark";
ANALYZE "Circular";
ANALYZE "WeeklyLessons";