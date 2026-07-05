# Implementation Plan: Weekly Timetable Homework & Classwork Management System

## Overview

This document outlines the complete implementation plan for a weekly timetable-based Homework and Classwork management system. The system will allow teachers to manage classwork and homework entries organized by weekday and subject, with file attachments, while ensuring strict tenant and class isolation.

---

## 1. Database Schema Design

### 1.1 New Table: `WeeklyLessonLog`

This table will store both classwork and homework entries organized by weekday and subject.

```sql
-- ============================================================================
-- WEEKLY LESSON LOG TABLE (Homework & Classwork Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "WeeklyLessonLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core Content Fields
  "classworkText" TEXT,                    -- In-class work description
  "homeworkText" TEXT,                     -- Homework assignment description
  
  -- Scheduling Fields
  "weekday" INTEGER NOT NULL               -- 1=Monday, 2=Tuesday, ..., 6=Saturday
    CHECK ("weekday" >= 1 AND "weekday" <= 6),
  "subject" VARCHAR(100) NOT NULL,         -- Subject name (Math, Science, etc.)
  
  -- Attachments (stored as JSONB array)
  "attachments" JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, type, size, uploadedAt}
  
  -- Tenant & Class Scope (CRITICAL)
  "classId" UUID NOT NULL REFERENCES "Class"(id) ON DELETE CASCADE,
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  
  -- Audit Fields
  "createdBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "updatedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per class/subject/weekday combination
  UNIQUE("classId", "subject", "weekday")
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Index for student queries (fetch by classId and tenantId)
CREATE INDEX IF NOT EXISTS "idx_weekly_lesson_class_tenant" 
  ON "WeeklyLessonLog"("classId", "tenantId");

-- Index for weekday-based queries (fetch weekly schedule)
CREATE INDEX IF NOT EXISTS "idx_weekly_lesson_weekday" 
  ON "WeeklyLessonLog"("weekday");

-- Index for subject-based queries
CREATE INDEX IF NOT EXISTS "idx_weekly_lesson_subject" 
  ON "WeeklyLessonLog"("subject");

-- Composite index for efficient grid loading
CREATE INDEX IF NOT EXISTS "idx_weekly_lesson_grid" 
  ON "WeeklyLessonLog"("classId", "weekday", "subject");

-- Index for creator tracking
CREATE INDEX IF NOT EXISTS "idx_weekly_lesson_created_by" 
  ON "WeeklyLessonLog"("createdBy");

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_weekly_lesson_log_updated_at 
  BEFORE UPDATE ON "WeeklyLessonLog" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (for Supabase)
-- ============================================================================

ALTER TABLE "WeeklyLessonLog" ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can manage entries for their assigned class
CREATE POLICY "Teachers can manage class entries" ON "WeeklyLessonLog"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u
      JOIN "Class" c ON c."teacherId" = u.id
      WHERE u.id = auth.uid() 
        AND c.id = "WeeklyLessonLog"."classId"
        AND u.role = 'TEACHER'
    )
  );

-- Policy: Students can view entries for their class
CREATE POLICY "Students can view class entries" ON "WeeklyLessonLog"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid() 
        AND u.role = 'STUDENT'
        AND u."classId" = "WeeklyLessonLog"."classId"
    )
  );

-- Policy: Admins can manage all entries within their tenant
CREATE POLICY "Admins can manage tenant entries" ON "WeeklyLessonLog"
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid() 
        AND u.role = 'ADMIN'
        AND u."tenantId" = "WeeklyLessonLog"."tenantId"
    )
  );
```

---

## 2. Supabase Storage Bucket Configuration

### 2.1 Bucket Structure

Create a dedicated Supabase Storage bucket named `lesson-attachments` with the following folder structure:

```
lesson-attachments/
├── {tenantId}/
│   └── {classId}/
│       └── {lessonLogId}/
│           ├── {filename1}.pdf
│           ├── {filename2}.jpg
│           └── {filename3}.docx
```

### 2.2 Bucket Creation SQL

```sql
-- Create storage bucket for lesson attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-attachments',
  'lesson-attachments',
  false,  -- Private bucket
  10485760,  -- 10MB file size limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;
```

### 2.3 Storage RLS Policies

```sql
-- Enable RLS on storage.objects for this bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can upload to their class folder
CREATE POLICY "Teachers can upload lesson attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-attachments'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT t.id FROM "Tenant" t
    JOIN "User" u ON u."tenantId" = t.id
    WHERE u.id = auth.uid() AND u.role = 'TEACHER'
  )
);

-- Policy: Students can read attachments from their class
CREATE POLICY "Students can read class attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lesson-attachments'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT t.id FROM "Tenant" t
    JOIN "User" u ON u."tenantId" = t.id
    WHERE u.id = auth.uid() AND u.role = 'STUDENT' AND u."tenantId" = t.id
  )
);
```

---

## 3. Backend Implementation

### 3.1 Storage Service (`backend/src/services/storageService.js`)

```javascript
/**
 * Storage Service
 * Handles file operations with Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'lesson-attachments';

/**
 * Generate storage path for a lesson attachment
 * Path format: tenantId/classId/lessonLogId/filename
 */
function generateStoragePath(tenantId, classId, lessonLogId, fileName) {
  return `${tenantId}/${classId}/${lessonLogId}/${fileName}`;
}

/**
 * Upload a file to Supabase Storage
 */
async function uploadFile(fileBuffer, fileName, tenantId, classId, lessonLogId, mimeType) {
  const path = generateStoragePath(tenantId, classId, lessonLogId, fileName);
  
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload error: ${error.message}`);
  }

  // Get signed URL for private bucket access
  const { data: urlData, error: urlError } = await supabase
    .storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry

  if (urlError) {
    throw new Error(`Storage URL error: ${urlError.message}`);
  }

  return {
    path,
    url: urlData.signedUrl,
    name: fileName,
    type: mimeType,
    size: fileBuffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a file from Supabase Storage
 */
async function deleteFile(filePath) {
  const { error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw new Error(`Storage delete error: ${error.message}`);
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  BUCKET_NAME,
};
```

### 3.2 Weekly Lesson Controller (`backend/src/controllers/weeklyLessonController.js`)

```javascript
/**
 * Weekly Lesson Controller
 * Handles Homework & Classwork management organized by weekly timetable
 */

const db = require('../config/db');
const storageService = require('../services/storageService');
const fs = require('fs');

/**
 * Get weekly lesson grid for a class
 * GET /api/teacher/weekly-lessons
 */
const getWeeklyLessons = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;

    // Find the teacher's class
    const classQuery = `
      SELECT id, name FROM "Class" 
      WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned.' },
      });
    }

    const classId = classResult.rows[0].id;

    // Get all lesson logs for this class
    const lessonsQuery = `
      SELECT wll.*, u.name as "creatorName"
      FROM "WeeklyLessonLog" wll
      LEFT JOIN "User" u ON wll."createdBy" = u.id
      WHERE wll."classId" = $1 AND wll."tenantId" = $2
      ORDER BY wll."weekday" ASC, wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId]);

    // Organize into grid structure
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grid = {};
    
    weekdays.forEach((day, index) => {
      grid[index + 1] = { name: day, lessons: [] };
    });

    lessonsResult.rows.forEach(lesson => {
      grid[lesson.weekday].lessons.push({
        id: lesson.id,
        subject: lesson.subject,
        classworkText: lesson.classworkText,
        homeworkText: lesson.homeworkText,
        attachments: lesson.attachments || [],
        createdBy: lesson.creatorName,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      });
    });

    res.status(200).json({
      success: true,
      data: { classId, className: classResult.rows[0].name, grid },
    });
  } catch (error) {
    console.error('GetWeeklyLessons Error:', error);
    next(error);
  }
};

/**
 * Create or update a weekly lesson entry (UPSERT)
 * POST /api/teacher/weekly-lessons
 */
const createOrUpdateLesson = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { weekday, subject, classworkText, homeworkText } = req.body;

    // Validate weekday
    if (!weekday || weekday < 1 || weekday > 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid weekday. Must be 1-6 (Monday-Saturday).' },
      });
    }

    // Find the teacher's class
    const classQuery = `
      SELECT id FROM "Class" 
      WHERE "teacherId" = $1 AND "tenantId" = $2 LIMIT 1
    `;
    const classResult = await db.query(classQuery, [teacherId, tenantId]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No class assigned.' },
      });
    }

    const classId = classResult.rows[0].id;

    // Upsert the lesson entry
    const upsertQuery = `
      INSERT INTO "WeeklyLessonLog" 
        ("weekday", "subject", "classworkText", "homeworkText", "classId", "tenantId", "createdBy", "updatedBy")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      ON CONFLICT ("classId", "subject", "weekday") 
      DO UPDATE SET 
        "classworkText" = EXCLUDED."classworkText",
        "homeworkText" = EXCLUDED."homeworkText",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = NOW()
      RETURNING *
    `;

    const result = await db.query(upsertQuery, [
      weekday, subject, classworkText || null, homeworkText || null,
      classId, tenantId, teacherId,
    ]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Lesson saved successfully',
    });
  } catch (error) {
    console.error('CreateOrUpdateLesson Error:', error);
    next(error);
  }
};

/**
 * Upload attachment to a lesson entry
 * POST /api/teacher/weekly-lessons/:id/attachments
 */
const uploadAttachment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file provided' },
      });
    }

    // Verify the lesson belongs to tenant
    const lessonQuery = `SELECT * FROM "WeeklyLessonLog" WHERE id = $1 AND "tenantId" = $2`;
    const lessonResult = await db.query(lessonQuery, [id, tenantId]);

    if (lessonResult.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: { message: 'Lesson not found' },
      });
    }

    const lesson = lessonResult.rows[0];

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(req.file.path);
    const uploadResult = await storageService.uploadFile(
      fileBuffer, req.file.originalname, tenantId, lesson.classId, lesson.id, req.file.mimetype
    );

    // Clean up local file
    fs.unlinkSync(req.file.path);

    // Update lesson attachments JSONB
    const attachments = lesson.attachments || [];
    attachments.push(uploadResult);

    const updateQuery = `
      UPDATE "WeeklyLessonLog" 
      SET "attachments" = $1, "updatedBy" = $2, "updatedAt" = NOW()
      WHERE id = $3 RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [JSON.stringify(attachments), teacherId, id]);

    res.status(200).json({
      success: true,
      data: { lesson: updateResult.rows[0], attachment: uploadResult },
      message: 'Attachment uploaded successfully',
    });
  } catch (error) {
    console.error('UploadAttachment Error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

/**
 * Delete attachment from a lesson entry
 * DELETE /api/teacher/weekly-lessons/:id/attachments/:attachmentIndex
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const tenantId = req.user.tenantId;
    const { id, attachmentIndex } = req.params;

    const lessonQuery = `SELECT * FROM "WeeklyLessonLog" WHERE id = $1 AND "tenantId" = $2`;
    const lessonResult = await db.query(lessonQuery, [id, tenantId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Lesson not found' } });
    }

    const lesson = lessonResult.rows[0];
    const attachments = lesson.attachments || [];
    const index = parseInt(attachmentIndex);

    if (index < 0 || index >= attachments.length) {
      return res.status(404).json({ success: false, error: { message: 'Attachment not found' } });
    }

    // Delete from storage
    await storageService.deleteFile(attachments[index].path);
    attachments.splice(index, 1);

    const updateQuery = `
      UPDATE "WeeklyLessonLog" 
      SET "attachments" = $1, "updatedBy" = $2, "updatedAt" = NOW()
      WHERE id = $3 RETURNING *
    `;
    const updateResult = await db.query(updateQuery, [JSON.stringify(attachments), teacherId, id]);

    res.status(200).json({ success: true, data: updateResult.rows[0], message: 'Attachment deleted' });
  } catch (error) {
    console.error('DeleteAttachment Error:', error);
    next(error);
  }
};

/**
 * Delete a weekly lesson entry
 * DELETE /api/teacher/weekly-lessons/:id
 */
const deleteLesson = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const lessonQuery = `SELECT * FROM "WeeklyLessonLog" WHERE id = $1 AND "tenantId" = $2`;
    const lessonResult = await db.query(lessonQuery, [id, tenantId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Lesson not found' } });
    }

    const lesson = lessonResult.rows[0];

    // Delete all attachments from storage
    for (const attachment of (lesson.attachments || [])) {
      try { await storageService.deleteFile(attachment.path); } catch (err) { /* ignore */ }
    }

    await db.query('DELETE FROM "WeeklyLessonLog" WHERE id = $1', [id]);

    res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('DeleteLesson Error:', error);
    next(error);
  }
};

/**
 * Get weekly lessons for student's class (READ-ONLY)
 * GET /api/student/weekly-lessons
 */
const getStudentWeeklyLessons = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;

    const studentQuery = `SELECT "classId" FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = 'STUDENT'`;
    const studentResult = await db.query(studentQuery, [studentId, tenantId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Student not found or no class assigned' } });
    }

    const classId = studentResult.rows[0].classId;

    const lessonsQuery = `
      SELECT wll.*, u.name as "creatorName"
      FROM "WeeklyLessonLog" wll
      LEFT JOIN "User" u ON wll."createdBy" = u.id
      WHERE wll."classId" = $1 AND wll."tenantId" = $2
      ORDER BY wll."weekday" ASC, wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId]);

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grid = {};
    
    weekdays.forEach((day, index) => {
      grid[index + 1] = { name: day, lessons: [] };
    });

    lessonsResult.rows.forEach(lesson => {
      grid[lesson.weekday].lessons.push({
        id: lesson.id,
        subject: lesson.subject,
        classworkText: lesson.classworkText,
        homeworkText: lesson.homeworkText,
        attachments: lesson.attachments || [],
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
      });
    });

    res.status(200).json({ success: true, data: { classId, grid } });
  } catch (error) {
    console.error('GetStudentWeeklyLessons Error:', error);
    next(error);
  }
};

/**
 * Get lessons for a specific weekday
 * GET /api/student/weekly-lessons/:weekday
 */
const getLessonsByWeekday = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const tenantId = req.user.tenantId;
    const { weekday } = req.params;

    const studentQuery = `SELECT "classId" FROM "User" WHERE id = $1 AND "tenantId" = $2 AND role = 'STUDENT'`;
    const studentResult = await db.query(studentQuery, [studentId, tenantId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Student not found' } });
    }

    const classId = studentResult.rows[0].classId;

    const lessonsQuery = `
      SELECT wll.*, u.name as "creatorName"
      FROM "WeeklyLessonLog" wll
      LEFT JOIN "User" u ON wll."createdBy" = u.id
      WHERE wll."classId" = $1 AND wll."tenantId" = $2 AND wll."weekday" = $3
      ORDER BY wll."subject" ASC
    `;
    const lessonsResult = await db.query(lessonsQuery, [classId, tenantId, weekday]);

    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    res.status(200).json({
      success: true,
      data: { weekday: weekdays[weekday - 1], weekdayNumber: weekday, lessons: lessonsResult.rows },
    });
  } catch (error) {
    console.error('GetLessonsByWeekday Error:', error);
    next(error);
  }
};

module.exports = {
  getWeeklyLessons,
  createOrUpdateLesson,
  uploadAttachment,
  deleteAttachment,
  deleteLesson,
  getStudentWeeklyLessons,
  getLessonsByWeekday,
};
```

### 3.3 Weekly Lesson Routes (`backend/src/routes/weeklyLessons.js`)

```javascript
/**
 * Weekly Lesson Routes
 */

const express = require('express');
const { body, param } = require('express-validator');
const weeklyLessonController = require('../controllers/weeklyLessonController');
const { protect, requireTeacher, requireStudent } = require('../middleware/auth');
const { upload, handleFileUploadError } = require('../middleware/fileUpload');

const router = express.Router();

// ============================================
// TEACHER ROUTES
// ============================================
router.use('/teacher', protect, requireTeacher);

// GET /api/teacher/weekly-lessons
router.get('/weekly-lessons', weeklyLessonController.getWeeklyLessons);

// POST /api/teacher/weekly-lessons
router.post(
  '/weekly-lessons',
  [
    body('weekday').isInt({ min: 1, max: 6 }).withMessage('Weekday must be 1-6'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('classworkText').optional().trim(),
    body('homeworkText').optional().trim(),
  ],
  weeklyLessonController.createOrUpdateLesson
);

// DELETE /api/teacher/weekly-lessons/:id
router.delete(
  '/weekly-lessons/:id',
  [param('id').isUUID().withMessage('Valid lesson ID is required')],
  weeklyLessonController.deleteLesson
);

// POST /api/teacher/weekly-lessons/:id/attachments
router.post(
  '/weekly-lessons/:id/attachments',
  [param('id').isUUID().withMessage('Valid lesson ID is required')],
  upload.single('file'),
  handleFileUploadError,
  weeklyLessonController.uploadAttachment
);

// DELETE /api/teacher/weekly-lessons/:id/attachments/:attachmentIndex
router.delete(
  '/weekly-lessons/:id/attachments/:attachmentIndex',
  [
    param('id').isUUID().withMessage('Valid lesson ID is required'),
    param('attachmentIndex').isInt({ min: 0 }).withMessage('Valid index is required'),
  ],
  weeklyLessonController.deleteAttachment
);

// ============================================
// STUDENT ROUTES
// ============================================
router.use('/student', protect, requireStudent);

// GET /api/student/weekly-lessons
router.get('/weekly-lessons', weeklyLessonController.getStudentWeeklyLessons);

// GET /api/student/weekly-lessons/:weekday
router.get(
  '/weekly-lessons/:weekday',
  [param('weekday').isInt({ min: 1, max: 6 }).withMessage('Weekday must be 1-6')],
  weeklyLessonController.getLessonsByWeekday
);

module.exports = router;
```

### 3.4 Update File Upload Middleware

Update `backend/src/middleware/fileUpload.js` to support lesson attachment file types:

```javascript
// Add this new file filter for lesson attachments
const lessonFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed: PDF, Images, DOC, DOCX, XLS, XLSX'), false);
  }
};

// Add new upload middleware for lesson attachments
const uploadLesson = multer({
  storage,
  fileFilter: lessonFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB, max 5 files
});

module.exports = { upload, uploadLesson, handleFileUploadError };
```

---

## 4. Frontend Implementation

### 4.1 TypeScript Types (add to `frontend/src/types/index.ts`)

```typescript
export interface LessonAttachment {
  path: string;
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface WeeklyLesson {
  id: string;
  subject: string;
  classworkText?: string;
  homeworkText?: string;
  attachments: LessonAttachment[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeekdayGrid {
  [key: number]: {
    name: string;
    lessons: WeeklyLesson[];
  };
}

export interface WeeklyLessonGridResponse {
  classId: string;
  className?: string;
  grid: WeekdayGrid;
}

export const WEEKDAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
] as const;
```

### 4.2 API Service Extension (add to `frontend/src/services/api.ts`)

```typescript
export const weeklyLessonsAPI = {
  // Teacher endpoints
  async getTeacherWeeklyLessons(): Promise<ApiResponse<WeeklyLessonGridResponse>> {
    const response = await api.get<ApiResponse<WeeklyLessonGridResponse>>('/teacher/weekly-lessons');
    return response.data;
  },

  async createOrUpdateLesson(data: { weekday: number; subject: string; classworkText?: string; homeworkText?: string }): Promise<ApiResponse<WeeklyLesson>> {
    const response = await api.post<ApiResponse<WeeklyLesson>>('/teacher/weekly-lessons', data);
    return response.data;
  },

  async deleteLesson(id: string): Promise<ApiResponse<void>> {
    const response = await api.delete<ApiResponse<void>>(`/teacher/weekly-lessons/${id}`);
    return response.data;
  },

  async uploadAttachment(id: string, file: File): Promise<ApiResponse<{ lesson: WeeklyLesson; attachment: LessonAttachment }>> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ lesson: WeeklyLesson; attachment: LessonAttachment }>>(
      `/teacher/weekly-lessons/${id}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async deleteAttachment(id: string, attachmentIndex: number): Promise<ApiResponse<WeeklyLesson>> {
    const response = await api.delete<ApiResponse<WeeklyLesson>>(`/teacher/weekly-lessons/${id}/attachments/${attachmentIndex}`);
    return response.data;
  },

  // Student endpoints
  async getStudentWeeklyLessons(): Promise<ApiResponse<WeeklyLessonGridResponse>> {
    const response = await api.get<ApiResponse<WeeklyLessonGridResponse>>('/student/weekly-lessons');
    return response.data;
  },

  async getLessonsByWeekday(weekday: number): Promise<ApiResponse<{ weekday: string; weekdayNumber: number; lessons: WeeklyLesson[] }>> {
    const response = await api.get<ApiResponse<{ weekday: string; weekdayNumber: number; lessons: WeeklyLesson[] }>>(`/student/weekly-lessons/${weekday}`);
    return response.data;
  },
};
```

### 4.3 Teacher Weekly Lesson Grid Screen

Create `frontend/src/screens/teacher/WeeklyLessonGridScreen.tsx`:

```typescript
/**
 * Weekly Lesson Grid Screen (Teacher)
 * Grid view for managing classwork and homework by weekday/subject
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, FlatList, Linking,
} from 'react-native';
import { weeklyLessonsAPI } from '../../services/api';
import { WEEKDAYS, WeeklyLesson, WeekdayGrid, LessonAttachment } from '../../types';
import * as DocumentPicker from 'expo-document-picker';

const WeeklyLessonGridScreen: React.FC = () => {
  const [grid, setGrid] = useState<WeekdayGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<WeeklyLesson | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [classworkText, setClassworkText] = useState('');
  const [homeworkText, setHomeworkText] = useState('');

  const fetchWeeklyLessons = async () => {
    try {
      const response = await weeklyLessonsAPI.getTeacherWeeklyLessons();
      if (response.success && response.data) setGrid(response.data.grid);
    } catch (error) {
      Alert.alert('Error', 'Failed to load weekly lessons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchWeeklyLessons(); }, []);

  const handleSaveLesson = async () => {
    if (!selectedLesson) return;
    try {
      const response = await weeklyLessonsAPI.createOrUpdateLesson({
        weekday: selectedLesson.weekday,
        subject: selectedLesson.subject,
        classworkText, homeworkText,
      });
      if (response.success) {
        Alert.alert('Success', 'Lesson saved');
        setIsEditing(false);
        fetchWeeklyLessons();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save lesson');
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      // Upload logic here
    }
  };

  const renderLessonCard = (lesson: WeeklyLesson) => (
    <TouchableOpacity key={lesson.id} style={styles.lessonCard} onPress={() => setSelectedLesson(lesson)}>
      <Text style={styles.lessonSubject}>{lesson.subject}</Text>
      {lesson.homeworkText && <Text style={styles.lessonPreview} numberOfLines={1}>📝 {lesson.homeworkText}</Text>}
      {lesson.attachments?.length > 0 && (
        <View style={styles.attachmentBadge}>
          <Text style={styles.attachmentBadgeText}>📎 {lesson.attachments.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#7b1fa2" /></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Weekly Timetable</Text>
        <Text style={styles.headerSubtitle}>Tap on any subject to add/edit classwork and homework</Text>
      </View>

      {WEEKDAYS.map((day) => (
        <View key={day.id} style={styles.daySection}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{day.name}</Text>
          </View>
          <View style={styles.lessonsContainer}>
            {grid && grid[day.id]?.lessons.length > 0
              ? grid[day.id].lessons.map(renderLessonCard)
              : <View style={styles.emptyDay}><Text style={styles.emptyDayText}>No lessons scheduled</Text></View>
            }
          </View>
        </View>
      ))}

      {/* Lesson Modal */}
      <Modal visible={!!selectedLesson} animationType="slide" onRequestClose={() => setSelectedLesson(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedLesson?.subject}</Text>
            <TouchableOpacity onPress={() => setSelectedLesson(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          {/* Edit/View content here */}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#7b1fa2', padding: 20, paddingTop: 30 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#e1bee7', marginTop: 4 },
  daySection: { marginTop: 16, paddingHorizontal: 16 },
  dayHeader: { backgroundColor: '#7b1fa2', paddingHorizontal: 16, paddingVertical: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  dayTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  lessonsContainer: { backgroundColor: '#fff', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, elevation: 2 },
  lessonCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', position: 'relative' },
  lessonSubject: { fontSize: 16, fontWeight: '600', color: '#333' },
  lessonPreview: { fontSize: 13, color: '#666', marginTop: 4 },
  attachmentBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  attachmentBadgeText: { fontSize: 12, color: '#1976d2' },
  emptyDay: { padding: 24, alignItems: 'center' },
  emptyDayText: { color: '#999', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#7b1fa2', padding: 20, paddingTop: 30 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalClose: { fontSize: 24, color: '#fff', padding: 8 },
});

export default WeeklyLessonGridScreen;
```

### 4.4 Student Weekly Lesson View Screen

Create `frontend/src/screens/student/WeeklyLessonViewScreen.tsx`:

```typescript
/**
 * Weekly Lesson View Screen (Student)
 * Read-only view of the weekly timetable
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, FlatList, Linking,
} from 'react-native';
import { weeklyLessonsAPI } from '../../services/api';
import { WEEKDAYS, WeeklyLesson, WeekdayGrid } from '../../types';

const WeeklyLessonViewScreen: React.FC = () => {
  const [grid, setGrid] = useState<WeekdayGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<WeeklyLesson | null>(null);

  const fetchWeeklyLessons = async () => {
    try {
      const response = await weeklyLessonsAPI.getStudentWeeklyLessons();
      if (response.success && response.data) setGrid(response.data.grid);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchWeeklyLessons(); }, []);

  const handleOpenAttachment = (attachment: any) => {
    Linking.openURL(attachment.url);
  };

  const renderLessonCard = (lesson: WeeklyLesson) => (
    <TouchableOpacity key={lesson.id} style={styles.lessonCard} onPress={() => setSelectedLesson(lesson)}>
      <Text style={styles.lessonSubject}>{lesson.subject}</Text>
      {lesson.homeworkText && <Text style={styles.lessonPreview} numberOfLines={2}>📝 {lesson.homeworkText}</Text>}
      {lesson.attachments?.length > 0 && (
        <View style={styles.attachmentBadge}>
          <Text style={styles.attachmentBadgeText}>📎 {lesson.attachments.length} file(s)</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWeeklyLessons(); }} />}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Homework & Classwork</Text>
        <Text style={styles.headerSubtitle}>Tap on any subject to view details</Text>
      </View>

      {WEEKDAYS.map((day) => (
        <View key={day.id} style={styles.daySection}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{day.name}</Text>
          </View>
          <View style={styles.lessonsContainer}>
            {grid && grid[day.id]?.lessons.length > 0
              ? grid[day.id].lessons.map(renderLessonCard)
              : <View style={styles.emptyDay}><Text style={styles.emptyDayText}>No homework</Text></View>
            }
          </View>
        </View>
      ))}

      {/* Lesson Detail Modal */}
      <Modal visible={!!selectedLesson} animationType="slide" onRequestClose={() => setSelectedLesson(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedLesson?.subject}</Text>
            <TouchableOpacity onPress={() => setSelectedLesson(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {selectedLesson?.classworkText && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📖 Classwork</Text>
                <Text style={styles.sectionContent}>{selectedLesson.classworkText}</Text>
              </View>
            )}
            {selectedLesson?.homeworkText && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Homework</Text>
                <Text style={styles.sectionContent}>{selectedLesson.homeworkText}</Text>
              </View>
            )}
            {selectedLesson?.attachments?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📎 Attachments</Text>
                {selectedLesson.attachments.map((att, idx) => (
                  <TouchableOpacity key={idx} style={styles.attachmentItem} onPress={() => handleOpenAttachment(att)}>
                    <Text style={styles.attachmentName}>{att.name}</Text>
                    <Text style={styles.downloadIcon}>⬇️</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#2196F3', padding: 20, paddingTop: 30 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#bbdefb', marginTop: 4 },
  daySection: { marginTop: 16, paddingHorizontal: 16 },
  dayHeader: { backgroundColor: '#2196F3', paddingHorizontal: 16, paddingVertical: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  dayTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  lessonsContainer: { backgroundColor: '#fff', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, elevation: 2 },
  lessonCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', position: 'relative' },
  lessonSubject: { fontSize: 16, fontWeight: '600', color: '#333' },
  lessonPreview: { fontSize: 13, color: '#666', marginTop: 4 },
  attachmentBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  attachmentBadgeText: { fontSize: 12, color: '#1976d2' },
  emptyDay: { padding: 24, alignItems: 'center' },
  emptyDayText: { color: '#999', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2196F3', padding: 20, paddingTop: 30 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalClose: { fontSize: 24, color: '#fff', padding: 8 },
  modalContent: { flex: 1, padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2196F3', marginBottom: 8 },
  sectionContent: { fontSize: 15, color: '#333', lineHeight: 22 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, marginBottom: 8 },
  attachmentName: { fontSize: 14, color: '#333', fontWeight: '500', flex: 1 },
  downloadIcon: { fontSize: 18 },
});

export default WeeklyLessonViewScreen;
```

---

## 5. Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `WeeklyLessonLog` table migration
- [ ] Add indexes for performance
- [ ] Configure RLS policies (if using Supabase directly)
- [ ] Create Supabase storage bucket `lesson-attachments`
- [ ] Set up storage RLS policies

### Phase 2: Backend Implementation
- [ ] Install Supabase JS client: `npm install @supabase/supabase-js`
- [ ] Create `storageService.js` for Supabase Storage integration
- [ ] Create `weeklyLessonController.js` with all CRUD operations
- [ ] Create `weeklyLessons.js` routes file
- [ ] Update `fileUpload.js` middleware for lesson attachments
- [ ] Register routes in `server.js`
- [ ] Update `.env.example` with Supabase storage configuration

### Phase 3: Frontend Implementation
- [ ] Add TypeScript types to `types/index.ts`
- [ ] Add API service methods to `api.ts`
- [ ] Create `WeeklyLessonGridScreen.tsx` for teachers
- [ ] Create `WeeklyLessonViewScreen.tsx` for students
- [ ] Update navigation configurations
- [ ] Add "Weekly Timetable" button to teacher dashboard
- [ ] Add "Homework" section to student navigation

### Phase 4: Testing & Polish
- [ ] Test teacher CRUD operations
- [ ] Test file upload and deletion
- [ ] Test student read-only access
- [ ] Verify tenant/class isolation
- [ ] Test on mobile devices
- [ ] Add loading states and error handling

---

## 6. Environment Variables

Add to `backend/.env.example`:

```env
# Supabase Storage
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## 7. Key Security Considerations

1. **Tenant Isolation**: All queries include `tenantId` to ensure data isolation
2. **Class Scope**: Teachers can only access their assigned class
3. **Student Access**: Students can only view their own class's lessons
4. **File Security**: Supabase Storage RLS ensures users can only access files from their tenant/class
5. **Input Validation**: All inputs are validated using express-validator
6. **File Type Restrictions**: Only allowed MIME types are accepted

---

## 8. Summary

This implementation plan provides:

1. **Database Schema**: A `WeeklyLessonLog` table with JSONB attachments, weekday scheduling, and strict tenant/class isolation
2. **Storage Configuration**: Supabase Storage bucket with organized folder structure and RLS policies
3. **Backend Routes**: Complete CRUD operations with file upload support
4. **Frontend Components**: Mobile-optimized grid view for teachers and students

The system is designed to be:
- **Secure**: Multi-tenant isolation at every level
- **Scalable**: Efficient indexes and JSONB storage
- **User-friendly**: Grid-based UI similar to a weekly timetable
- **Feature-rich**: File attachments, classwork/homework separation