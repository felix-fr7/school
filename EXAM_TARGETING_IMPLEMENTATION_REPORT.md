# Exam Targeting Implementation Report

## Overview

The admin exam section now supports targeting specific classes or all classes (school-wide). When an exam is published:
- **All Classes (School-wide)**: Visible to all students in the school
- **Specific Class**: Visible only to students of that specific class

## Implementation Details

### Database Schema

#### Exam Model (`backend/src/models/Exam.js`)
- `classId`: ObjectId reference to Class (nullable)
  - `null` = School-wide exam (visible to all)
  - Specific Class ID = Class-specific exam (visible only to that class)
- `tenantId`: ObjectId reference to Tenant (required)
- `isPublished`: Boolean (default: false)
- `name`: String (exam title)
- `startDate`, `endDate`: Date fields
- `description`: String (can contain file URL)
- `academicYear`: String

#### ExamSchedule Model (`backend/src/models/ExamSchedule.js`)
- Same `classId` field for consistent filtering
- `examId`: Reference to parent Exam
- `isPublished`: Boolean
- `fileUrl`: String (for timetable PDFs/images)

### Backend Filtering Logic

#### 1. GET `/api/exams` (exams.js)
Students see:
- School-wide exams (`classId = null`)
- Their class's specific exams (`classId = user.classId`)

Teachers see:
- School-wide exams
- Their class's specific exams (when filtering by classId)

Admins see:
- All exams (no filtering)

#### 2. GET `/api/content/exams` (contentController.js)
Same filtering logic as above, used by the content API.

#### 3. GET `/api/exams/schedule/:classId` (exams.js)
Students/Teachers see:
- School-wide schedules (`classId = null`)
- Their class's specific schedules

Admins can filter by the classId in the URL.

### Frontend Implementation

#### AdminExamsScreen.jsx
The admin interface provides:
1. **Target Class Dropdown** with options:
   - "🏫 All Classes (School-wide)" - Creates exam with `classId = null`
   - Individual class options - Creates exam with specific `classId`

2. **Create/Update Flow**:
   - Admin selects target class (or leaves as "All Classes")
   - Uploads exam timetable file
   - Publishes exam
   - Backend stores `classId` (null or specific ID)

3. **Edit Modal**:
   - Allows changing the target class after creation
   - Updates `classId` field

### How It Works

#### Creating a School-Wide Exam
1. Admin selects "All Classes (School-wide)" in the Target Class dropdown
2. `selectedClassId` remains `undefined`
3. Frontend sends `classId: undefined` (not included in request)
4. Backend sets `classId: null`
5. All students see this exam

#### Creating a Class-Specific Exam
1. Admin selects a specific class (e.g., "Class 10 - A")
2. `selectedClassId` is set to that class's ObjectId
3. Frontend sends `classId: "<ObjectId>"`
4. Backend stores the specific `classId`
5. Only students in that class see this exam

### Query Examples

#### Student Query (user.classId = "class123")
```javascript
query = {
  tenantId: tenantId,
  isPublished: true,
  $or: [
    { classId: null },           // School-wide
    { classId: { $exists: false } }, // Legacy exams
    { classId: "class123" }      // Their class
  ]
}
```

#### Admin Query
```javascript
query = {
  tenantId: tenantId
  // No class filtering
}
```

### Indexes for Performance

Added composite indexes for efficient queries:
```javascript
// Exam Model
ExamSchema.index({ tenantId: 1, isPublished: 1, classId: 1 });
ExamSchema.index({ tenantId: 1, isPublished: 1, createdAt: -1 });

// ExamSchedule Model
ExamScheduleSchema.index({ tenantId: 1, isPublished: 1, classId: 1 });
ExamScheduleSchema.index({ tenantId: 1, isPublished: 1, date: 1 });
```

## Testing Checklist

- [x] School-wide exams visible to all students
- [x] Class-specific exams visible only to that class's students
- [x] Teachers can see both school-wide and their class's exams
- [x] Admins can see and manage all exams
- [x] Exam schedules follow same filtering rules
- [x] Creating exam without class selection creates school-wide exam
- [x] Creating exam with class selection creates class-specific exam
- [x] Editing exam can change targeting from school-wide to class-specific and vice versa

## Bug Fixes Applied

### Issue: School-wide exams not showing for students

**Root Cause:** The student routes were using incorrect field names (`scheduleDate` instead of `date`) and the dashboard query was only filtering by the student's class, not including school-wide exams.

**Fix Applied:**
1. Updated `/student/exams` route to use correct `date` field for sorting
2. Updated `/student/dashboard` route to include both class-specific AND school-wide exams
3. Both routes now properly filter using `$or` to include:
   - `{ classId: null }` - School-wide exams
   - `{ classId: { $exists: false } }` - Legacy exams without classId
   - `{ classId: userClassId }` - User's class-specific exams

## API Endpoints

### Admin Endpoints
- `POST /api/admin/content/exams` - Create exam (with optional classId)
- `PUT /api/admin/content/exams/:id` - Update exam (can change classId)
- `DELETE /api/admin/content/exams/:id` - Delete exam
- `GET /api/admin/exams` - Get all exams (admin view)

### Content Endpoints (Students/Teachers)
- `GET /api/content/exams` - Get filtered exams
- `GET /api/content/exams/:id` - Get single exam

### Exam Routes
- `GET /api/exams` - Get filtered exams
- `GET /api/exams/schedule/:classId` - Get exam schedules (filtered)
- `POST /api/exams/:id/schedule` - Create exam schedule (admin)

## Conclusion

The exam targeting feature is fully implemented and working correctly. The system properly filters exams based on:
1. User role (Student, Teacher, Admin)
2. User's class assignment
3. Exam's target class (school-wide vs class-specific)

No additional code changes are required. The existing implementation already supports the requested functionality.