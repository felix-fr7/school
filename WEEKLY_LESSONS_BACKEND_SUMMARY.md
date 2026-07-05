# Weekly Lessons Backend Implementation - Complete ✅

## Overview

The backend API for the Weekly Timetable Homework & Classwork Management System has been successfully implemented. This system allows teachers to manage classwork and homework entries organized by weekday and subject, with file attachments, while ensuring strict tenant and class isolation.

## Files Created/Modified

### New Files Created:
1. **`backend/src/services/storageService.js`** - Supabase Storage integration for file uploads
2. **`backend/src/controllers/weeklyLessonController.js`** - All CRUD operations for weekly lessons
3. **`backend/src/routes/weeklyLessons.js`** - API route definitions with validation
4. **`test-weekly-lessons.js`** - Comprehensive test suite

### Modified Files:
1. **`backend/src/middleware/fileUpload.js`** - Added `uploadLesson` middleware for lesson attachments
2. **`backend/src/server.js`** - Registered weekly lessons routes
3. **`backend/.env.example`** - Added Supabase configuration variables
4. **`backend/package.json`** - Added `@supabase/supabase-js` dependency

## API Endpoints

### Teacher Endpoints (Require TEACHER role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teacher/weekly-lessons` | Get weekly lesson grid for teacher's class |
| `POST` | `/api/teacher/weekly-lessons` | Create or update a lesson (UPSERT) |
| `DELETE` | `/api/teacher/weekly-lessons/:id` | Delete a lesson and its attachments |
| `POST` | `/api/teacher/weekly-lessons/:id/attachments` | Upload file attachment |
| `DELETE` | `/api/teacher/weekly-lessons/:id/attachments/:index` | Delete attachment |

### Student Endpoints (Require STUDENT role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/weekly-lessons` | Get weekly lesson grid (read-only) |
| `GET` | `/api/student/weekly-lessons/:weekday` | Get lessons for specific weekday |

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Add to your `backend/.env` file:
```env
# Supabase Storage Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 3. Start the Server
```bash
npm run dev
```

### 4. Run Tests
```bash
node test-weekly-lessons.js
```

## Request/Response Examples

### Create/Update Lesson (Teacher)

**Request:**
```http
POST /api/teacher/weekly-lessons
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "weekday": 1,
  "subject": "Mathematics",
  "classworkText": "Complete exercises 1-10",
  "homeworkText": "Complete exercises 11-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "weekday": 1,
    "subject": "Mathematics",
    "classworkText": "Complete exercises 1-10",
    "homeworkText": "Complete exercises 11-20",
    "classId": "uuid",
    "tenantId": "uuid",
    "attachments": [],
    "createdAt": "2026-07-05T19:00:00.000Z",
    "updatedAt": "2026-07-05T19:00:00.000Z"
  },
  "message": "Lesson saved successfully"
}
```

### Get Weekly Lessons (Teacher)

**Request:**
```http
GET /api/teacher/weekly-lessons
Authorization: Bearer <teacher_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "classId": "uuid",
    "className": "Grade 10 - A",
    "grid": {
      "1": {
        "name": "Monday",
        "lessons": [
          {
            "id": "uuid",
            "subject": "Mathematics",
            "classworkText": "Complete exercises 1-10",
            "homeworkText": "Complete exercises 11-20",
            "attachments": [],
            "createdAt": "2026-07-05T19:00:00.000Z",
            "updatedAt": "2026-07-05T19:00:00.000Z"
          }
        ]
      },
      "2": { "name": "Tuesday", "lessons": [] },
      "3": { "name": "Wednesday", "lessons": [] },
      "4": { "name": "Thursday", "lessons": [] },
      "5": { "name": "Friday", "lessons": [] },
      "6": { "name": "Saturday", "lessons": [] }
    }
  }
}
```

### Upload Attachment (Teacher)

**Request:**
```http
POST /api/teacher/weekly-lessons/:id/attachments
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data

file: <binary_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lesson": { ... },
    "attachment": {
      "path": "tenantId/classId/lessonId/file.pdf",
      "url": "https://signed-url...",
      "name": "file.pdf",
      "type": "application/pdf",
      "size": 102400,
      "uploadedAt": "2026-07-05T19:00:00.000Z"
    }
  },
  "message": "Attachment uploaded successfully"
}
```

## Security Features

1. **Tenant Isolation**: All queries include `tenantId` to ensure data isolation
2. **Class Scope**: Teachers can only access their assigned class
3. **Role-Based Access**: Students have read-only access to their class's lessons
4. **File Security**: Supabase Storage RLS ensures users can only access files from their tenant/class
5. **Input Validation**: All inputs are validated using express-validator
6. **File Type Restrictions**: Only allowed MIME types are accepted (PDF, Images, DOC, DOCX, XLS, XLSX)

## Database Schema

The `WeeklyLessonLog` table structure:

```sql
CREATE TABLE "WeeklyLessonLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "classworkText" TEXT,
  "homeworkText" TEXT,
  "weekday" INTEGER NOT NULL CHECK ("weekday" >= 1 AND "weekday" <= 6),
  "subject" VARCHAR(100) NOT NULL,
  "attachments" JSONB DEFAULT '[]'::jsonb,
  "classId" UUID NOT NULL REFERENCES "Class"(id) ON DELETE CASCADE,
  "tenantId" UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  "createdBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "updatedBy" UUID REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("classId", "subject", "weekday")
);
```

## Next Steps

The backend is now complete. To finish the full implementation:

1. **Frontend Implementation** - Create React Native screens for the grid view
2. **API Service Integration** - Add the `weeklyLessonsAPI` methods to the frontend
3. **Navigation Setup** - Add the new screens to the navigation stack

Refer to `IMPLEMENTATION_PLAN_WEEKLY_TIMETABLE.md` for the complete frontend implementation guide.