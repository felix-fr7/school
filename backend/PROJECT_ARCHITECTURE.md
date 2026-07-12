# Multi-Tenant School Management System - Project Architecture & API Documentation

## Table of Contents
1. [Database Schema Mapping](#database-schema-mapping)
2. [Backend Controller Responsibilities](#backend-controller-responsibilities)
3. [Frontend Integration & Screen Mapping](#frontend-integration--screen-mapping)
4. [Migration & Idempotency Rules](#migration--idempotency-rules)
5. [API Endpoint Reference](#api-endpoint-reference)
6. [Authentication & Authorization](#authentication--authorization)

---

## Database Schema Mapping

### Multi-Tenant System Structure

The system implements a **multi-tenant architecture** where each school (tenant) has complete data isolation. All data queries are scoped to the tenant through the `tenantId` field.

```
┌─────────────────────────────────────────────────────────────┐
│                     Tenant (School)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Core Tables (camelCase)      Management Tables (snake) ││
│  │  ┌──────────────┐            ┌──────────────────────┐  ││
│  │  │    User      │◄───────────│   Homework, Exam     │  ││
│  │  │    Class     │◄───────────│   Mark, Attendance   │  ││
│  │  │   Tenant     │            │   News, Circular     │  ││
│  │  └──────────────┘            └──────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Table Categories

#### 1. Core Tables (camelCase with double quotes)
These tables use Prisma-style camelCase naming and require double quotes in SQL queries.

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `"User"` | `id`, `email`, `password`, `name`, `role`, `"tenantId"`, `"studentId"`, `"classId"` | All user accounts (students, teachers, admins) |
| `"Class"` | `id`, `name`, `section`, `"tenantId"`, `"teacherId"`, `class_code`, `"password"` | Class/section definitions |
| `"Tenant"` | `id`, `name`, `code`, `email`, `phone` | School/organization entities |

#### 2. Management Tables (snake_case)
These tables use traditional snake_case naming without quotes.

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `"Homework"` | `id`, `title`, `subject`, `class_id`, `tenant_id`, `assigned_by`, `is_published`, `due_date` | Homework assignments |
| `"Exam"` | `id`, `exam_name`, `class_id`, `created_at` | Exam records |
| `"ExamSchedule"` | `id`, `title`, `subject`, `date`, `time`, `classId`, `tenantId`, `isPublished` | Scheduled exams |
| `"Mark"` | `id`, `studentId`, `subject`, `marksObtained`, `totalMarks`, `percentage`, `grade`, `examType`, `tenantId` | Student marks/grades |
| `"News"` | `id`, `title`, `content`, `tenantId`, `postedBy`, `isPublished`, `category` | School announcements |
| `"Circular"` | `id`, `title`, `content`, `tenantId`, `issuedBy`, `issueDate` | Official circulars |
| `"Attendance"` | `id`, `studentId`, `date`, `status`, `tenantId` | Daily attendance records |
| `"Fee"` | `id`, `studentId`, `tenantId`, `amount`, `status`, `dueDate` | Fee management |
| `"WeeklyLesson"` | `id`, `subject`, `lessonDate`, `classId`, `classwork`, `homework` | Weekly lesson plans |

### Critical Column Name Corrections Applied

The following column names were corrected during the schema audit:

| Table | Incorrect Name | Correct Name | Notes |
|-------|----------------|--------------|-------|
| `"Homework"` | `classId` | `class_id` | Foreign key to Class |
| `"Homework"` | `tenantId` | `tenant_id` | Foreign key to Tenant |
| `"Homework"` | `assignedBy` | `assigned_by` | Foreign key to User |
| `"Homework"` | `isPublished` | `is_published` | Boolean flag |
| `"Homework"` | `dueDate` | `due_date` | Date field |
| `"Homework"` | `createdAt` | `created_at` | Timestamp |
| `"Exam"` | `classId` | `class_id` | Foreign key to Class |
| `"Exam"` | `examName` | `exam_name` | Exam title |
| `"Mark"` | `studentId` | `studentId` | Kept as camelCase (legacy) |
| `"Class"` | `classCode` | `class_code` | Auto-generated login ID |

---

## Backend Controller Responsibilities

### Controller File Structure

```
backend/src/controllers/
├── adminController.js          # Admin operations (school admin role)
├── classController.js          # Class controller operations (class-based login)
├── classAuthController.js      # Class authentication & dashboard
├── authController.js           # User authentication (email/studentId login)
├── studentController.js        # Student operations
├── teacherController.js        # Teacher operations
├── tenantController.js         # Super admin tenant management
├── contentController.js        # Public content (posts, news)
├── adminContentController.js   # Admin-managed content
└── weeklyLessonController.js   # Weekly lesson management
```

### Admin Controller (`adminController.js`)

**Role:** Handles all operations for users with `ADMIN` role (school administrators).

| HTTP Method | Endpoint | Function | Description |
|-------------|----------|----------|-------------|
| `GET` | `/api/admin/classes` | `getAllClasses` | List all classes for tenant |
| `GET` | `/api/admin/classes/:id/dashboard` | `getClassDashboard` | Get class dashboard with metrics |
| `GET` | `/api/admin/classes/:id` | `getClassById` | Get single class details |
| `POST` | `/api/admin/classes` | `createClass` | Create new class with auto-generated code |
| `PUT` | `/api/admin/classes/:id` | `updateClass` | Update class details |
| `DELETE` | `/api/admin/classes/:id` | `deleteClass` | Delete class (cascading) |
| `POST` | `/api/admin/classes/:id/reset-password` | `resetClassPassword` | Reset class login password |
| `GET` | `/api/admin/students` | `getAllStudents` | List students with pagination |
| `POST` | `/api/admin/students` | `createStudent` | Create new student |
| `PUT` | `/api/admin/students/:id` | `updateStudent` | Update student details |
| `DELETE` | `/api/admin/students/:id` | `deleteStudent` | Delete student |
| `GET` | `/api/admin/teachers` | `getAllTeachers` | List teachers |
| `POST` | `/api/admin/teachers` | `createTeacher` | Create new teacher |
| `PUT` | `/api/admin/teachers/:id` | `updateTeacher` | Update teacher details |
| `GET` | `/api/admin/teachers/available` | `getAvailableTeachers` | List unassigned teachers |

**Key Fixes Applied:**
- ✅ `getClassDashboard` now returns `classCode: classData.class_code` in response
- ✅ All queries properly use snake_case for management tables (`class_id`, `tenant_id`)
- ✅ All queries properly use camelCase with quotes for core tables (`"tenantId"`, `"classId"`)

### Class Controller (`classController.js`)

**Role:** Handles operations for users logged in via class-based authentication (class monitors/representatives).

| HTTP Method | Endpoint | Function | Description |
|-------------|----------|----------|-------------|
| `GET` | `/api/class-controller/dashboard` | `getClassDashboard` | Get class dashboard (auth required) |
| `GET` | `/api/class-controller/students` | `getClassStudents` | List students in logged-in class |
| `POST` | `/api/class-controller/students` | `addClassStudent` | Add student to class |
| `PUT` | `/api/class-controller/students/:id` | `updateStudent` | Update student in class |
| `DELETE` | `/api/class-controller/students/:id` | `deleteStudent` | Remove student from class |
| `POST` | `/api/class-controller/students/:id/reset-password` | `resetStudentPassword` | Reset student password |
| `GET` | `/api/class-controller/students/next-id` | `getNextStudentId` | Get next auto-generated student ID |

### Class Auth Controller (`classAuthController.js`)

**Role:** Handles class-based authentication and class dashboard access.

| HTTP Method | Endpoint | Function | Description |
|-------------|----------|----------|-------------|
| `POST` | `/api/auth/class-login` | `classLogin` | Login using class code + password |
| `GET` | `/api/auth/class/dashboard` | `getClassDashboard` | Get dashboard for logged-in class |

**Key Fixes Applied:**
- ✅ `classLogin` uses correct snake_case for Homework checks (`h.class_id`, `h.is_published`)
- ✅ Properly extracts `classId` from JWT token (`req.user.classId`)
- ✅ Returns `classCode` in login response for UI display

---

## Frontend Integration & Screen Mapping

### Screen Architecture

```
frontend/src/screens/
├── auth/
│   ├── LoginScreen.tsx          # Dual login (email OR studentId)
│   └── RegisterScreen.tsx       # User registration
├── admin/
│   ├── AdminDashboardScreen.tsx # Admin home
│   ├── ClassesListScreen.tsx    # List/manage classes
│   ├── ClassDashboardScreen.tsx # Class detail view
│   ├── EditClassScreen.tsx      # Edit class details
│   ├── StudentsListScreen.tsx   # Student management
│   ├── TeachersListScreen.tsx   # Teacher management
│   └── ...
├── student/
│   ├── StudentDashboardScreen.tsx # Student home
│   ├── StudentHomeworkScreen.tsx  # Homework list
│   └── ...
├── teacher/
│   ├── TeacherDashboardScreen.tsx # Teacher home
│   └── ...
└── classController/
    ├── ClassControllerDashboard.tsx # Class monitor home
    └── ...
```

### Critical Navigation Flow

#### Admin Class Management Flow
```
ClassesListScreen
    │
    ├─► navigation.navigate('ClassDetail', { classId: item.id })
    │
    ▼
ClassDashboardScreen
    │
    ├─► navigation.navigate('EditClass', { classId })
    │   (Passes database PRIMARY KEY, NOT classCode)
    │
    ▼
EditClassScreen
    │
    ├─► Uses classId to fetch: GET /api/admin/classes/:id
    │
    ▼
Updates class details via: PUT /api/admin/classes/:id
```

### Crash Fixes Applied

#### 1. API Service (`frontend/src/services/api.ts`)

**Issue:** Used `CustomEvent` which is not available in React Native.

**Fix:** Removed `CustomEvent` dispatch and replaced with direct error handling.

```typescript
// BEFORE (caused crash):
document.dispatchEvent(new CustomEvent('authExpired'));

// AFTER (React Native safe):
console.warn('[API] Session expired - user should be redirected to login');
```

#### 2. Edit Class Screen (`frontend/src/screens/admin/EditClassScreen.tsx`)

**Issue:** Strictly expected `classId` param, crashed when receiving `id`.

**Fix:** Handle both parameter names dynamically:

```typescript
// BEFORE:
const { classId } = route.params;

// AFTER:
const params = route.params;
const classId = params?.classId || (params as any)?.id;
```

#### 3. Class Dashboard Screen (`frontend/src/screens/admin/ClassDashboardScreen.tsx`)

**Issue:** UI showed "Not yet generated" even when classCode existed.

**Fix:** Backend now returns `classCode` in `getClassDashboard` response, UI displays it correctly:

```typescript
// UI now correctly shows:
{classData.classCode || classData.class_code || 'Not yet generated'}
```

### API Integration Patterns

#### Pattern 1: Admin Class Operations
```typescript
// Fetch class dashboard
const response = await adminAPI.getClassDashboard(classId);
// Response includes: { class: { id, classCode, name, section, ... }, metrics, ... }

// Navigate to edit with database ID
navigation.navigate('EditClass', { classId: classData.id });

// Edit screen fetches full data
const classData = await adminAPI.getClass(classId);
```

#### Pattern 2: Class-Based Login
```typescript
// Login with class code
const response = await authAPI.classLogin(classCode, password);
// Response includes: { class: { id, classCode, name, ... }, token }

// Store class data for later use
await storage.saveClass(response.data.class);

// Access class dashboard
const dashboard = await authAPI.getClassDashboard();
```

---

## Migration & Idempotency Rules

### Database Schema Files

| File | Purpose | Key Features |
|------|---------|--------------|
| `database/schema.sql` | Main schema (PostgreSQL) | Core tables + management tables |
| `database/supabase_schema.sql` | Supabase-specific schema | Includes RLS policies |
| `database/class_controller_schema.sql` | Class controller tables | Student management for class monitors |
| `database/schema_weekly_timetable.sql` | Weekly lesson schema | Timetable functionality |

### Idempotency Improvements

All schema files now include idempotent patterns to prevent startup crashes:

#### 1. Trigger Management
```sql
-- BEFORE (caused crashes on restart):
CREATE TRIGGER generate_class_code_trigger ...

-- AFTER (idempotent):
DROP TRIGGER IF EXISTS generate_class_code_trigger ON "Class";
CREATE TRIGGER generate_class_code_trigger ...
```

#### 2. Function Management
```sql
-- BEFORE:
CREATE OR REPLACE FUNCTION generate_class_code() ...

-- AFTER (with drop):
DROP FUNCTION IF EXISTS generate_class_code() CASCADE;
CREATE FUNCTION generate_class_code() ...
```

#### 3. Table Creation
```sql
-- All tables use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS "Class" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);
```

### Class Code Auto-Generation

The system auto-generates class codes using a database trigger:

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.class_code IS NULL THEN
    SELECT 'CLS-' || LPAD(CAST(COUNT(*) + 1 AS TEXT), 4, '0')
    INTO NEW.class_code
    FROM "Class";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS generate_class_code_trigger ON "Class";
CREATE TRIGGER generate_class_code_trigger
  BEFORE INSERT ON "Class"
  FOR EACH ROW
  EXECUTE FUNCTION generate_class_code();
```

**Result:** Classes automatically get codes like `CLS-0001`, `CLS-0002`, etc.

---

## API Endpoint Reference

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/auth/login` | No | Login with email or studentId |
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/class-login` | No | Login with class code + password |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `PUT` | `/api/auth/me` | Yes | Update user profile |
| `PUT` | `/api/auth/password` | Yes | Change password |

### Admin Endpoints

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/api/admin/classes` | Yes | ADMIN |
| `GET` | `/api/admin/classes/:id/dashboard` | Yes | ADMIN |
| `POST` | `/api/admin/classes` | Yes | ADMIN |
| `PUT` | `/api/admin/classes/:id` | Yes | ADMIN |
| `DELETE` | `/api/admin/classes/:id` | Yes | ADMIN |
| `GET` | `/api/admin/students` | Yes | ADMIN |
| `POST` | `/api/admin/students` | Yes | ADMIN |
| `PUT` | `/api/admin/students/:id` | Yes | ADMIN |
| `DELETE` | `/api/admin/students/:id` | Yes | ADMIN |
| `GET` | `/api/admin/teachers` | Yes | ADMIN |
| `POST` | `/api/admin/teachers` | Yes | ADMIN |
| `PUT` | `/api/admin/teachers/:id` | Yes | ADMIN |

### Class Controller Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/class-controller/dashboard` | Yes (Class) | Class dashboard |
| `GET` | `/api/class-controller/students` | Yes (Class) | List class students |
| `POST` | `/api/class-controller/students` | Yes (Class) | Add student |
| `PUT` | `/api/class-controller/students/:id` | Yes (Class) | Update student |
| `DELETE` | `/api/class-controller/students/:id` | Yes (Class) | Remove student |

---

## Authentication & Authorization

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `SUPER_ADMIN` | System administrator | All tenants |
| `ADMIN` | School administrator | Single tenant (school) |
| `TEACHER` | Teacher | Assigned class only |
| `STUDENT` | Student | Own data only |

### Authentication Methods

#### 1. Email/Password Login
```typescript
POST /api/auth/login
{
  "usernameOrEmailOrId": "admin@school.com",  // Can be email OR studentId
  "password": "password123"
}
```

#### 2. Student ID/Password Login
```typescript
POST /api/auth/login
{
  "usernameOrEmailOrId": "STU0001",  // Student roll number
  "password": "password123"
}
```

#### 3. Class-Based Login
```typescript
POST /api/auth/class-login
{
  "classCode": "CLS-0001",  // Auto-generated class code
  "password": "classPassword123"
}
```

### Token-Based Authorization

All authenticated endpoints require a Bearer token:

```
Authorization: Bearer <JWT_TOKEN>
```

The token contains:
- `id`: User ID
- `email`: User email
- `role`: User role
- `tenantId`: Tenant/School ID (for multi-tenant isolation)
- `classId`: Class ID (for class-based login)

---

## System State Summary

### ✅ Fixed Issues

1. **Database Schema Inconsistencies**
   - Corrected all snake_case vs camelCase mismatches
   - Standardized column naming across all tables
   - Added proper double quotes for camelCase columns

2. **Login Flow Issues**
   - Fixed class-based login to use correct column names
   - Ensured proper tenant isolation in all queries
   - Added proper error handling for authentication failures

3. **Frontend Navigation/State Bugs**
   - Fixed EditClassScreen to handle both `classId` and `id` params
   - Removed `CustomEvent` usage for React Native compatibility
   - Fixed ClassDashboardScreen to display actual classCode

4. **Migration Idempotency**
   - Added `DROP TRIGGER IF EXISTS` patterns
   - Added `DROP FUNCTION IF EXISTS` patterns
   - All schema files are now restart-safe

### 🏗️ Architecture Highlights

- **Multi-Tenant**: Complete data isolation per school
- **Role-Based Access Control**: 4 distinct user roles
- **Dual Authentication**: Email OR student ID login
- **Class-Based Login**: Special access for class monitors
- **Auto-Generated IDs**: Class codes and student IDs
- **Cascading Deletes**: Proper dependency management

---

## Quick Reference

### Common Column Names

| Context | Column Name | Example |
|---------|-------------|---------|
| Class ID (primary key) | `id` | `uuid` |
| Class login code | `class_code` | `CLS-0001` |
| Student ID (roll number) | `studentId` | `STU-0001` |
| Tenant/School ID | `tenantId` | `uuid` |
| Foreign key to class | `class_id` or `"classId"` | `uuid` |
| Foreign key to tenant | `tenant_id` or `"tenantId"` | `uuid` |

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/school_db

# Security
JWT_SECRET=your_jwt_secret
BCRYPT_SALT_ROUNDS=10

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# API
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

---

**Last Updated:** 2026-07-12  
**Document Version:** 1.0  
**Maintained By:** Development Team