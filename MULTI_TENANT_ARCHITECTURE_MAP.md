# Multi-Tenant School Management System - Complete Architecture Map

## System Overview

This is a **multi-tenant school management system** with role-based access control across 5 user types: Super Admin, Admin (School), Teacher, Student, and Class Controller (class-based login).

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Ionic React + Vite
- **Backend**: Node.js + Express + PostgreSQL
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: PostgreSQL with multi-tenant data isolation

---

## 1. AUTHENTICATION & LOGIN FLOW

### Frontend Authentication

#### Entry Points
- **Main Entry**: `frontend/src/main.tsx`
- **App Root**: `frontend/App.tsx`
- **Router**: `IonReactRouter` (Ionic React Router v5)

#### Authentication Context
- **File**: `frontend/src/contexts/AuthContext.tsx`
- **Provider**: `AuthProvider`
- **Hook**: `useAuth()`
- **State Variables**:
  - `user`: Current user object (null if not logged in)
  - `token`: JWT token string
  - `currentClass`: Class data when logged in as class
  - `isLoading`: Boolean loading state
  - `isAuthenticated`: Computed boolean (`!!token`)
  - `isSuperAdmin`: `user?.role === 'SUPER_ADMIN'`
  - `isAdmin`: `user?.role === 'ADMIN'`
  - `isStudent`: `user?.role === 'STUDENT'`
  - `isTeacher`: `user?.role === 'TEACHER'`
  - `isClass`: `!!currentClass`

#### Login Methods
```typescript
// User login (email OR student ID)
login(usernameOrEmailOrId: string, password: string): Promise<void>

// Class login (class code)
classLogin(classCode: string, password: string): Promise<void>

// User registration
register(name: string, email: string, password: string): Promise<void>

// Logout
logout(): Promise<void>
```

#### Login Screen
- **File**: `frontend/src/screens/LoginScreen.tsx`
- **Route**: `/login`
- **Login Modes**:
  1. **Student**: Student ID + Password (e.g., `STU-0001`)
  2. **Staff**: Email + Password
  3. **Class**: Class Code + Password (e.g., `CLS-1`)

#### Storage Service
- **File**: `frontend/src/services/api.ts` (storage object)
- **Methods**:
  - `getToken()`: Get JWT from localStorage
  - `saveToken(token)`: Save JWT to localStorage
  - `getUser()`: Get user object from localStorage
  - `saveUser(user)`: Save user to localStorage
  - `getClass()`: Get class data from localStorage
  - `saveClass(classData)`: Save class to localStorage
  - `clearAuth()`: Remove token and user
  - `clearClass()`: Remove class data

### Backend Authentication

#### Server Entry Point
- **File**: `backend/src/server.js`
- **Port**: `process.env.PORT || 3000`
- **CORS**: Dynamic origin matching (localhost, local IPs, ngrok)

#### Auth Routes
- **Base Path**: `/api/auth`
- **File**: `backend/src/routes/auth.js`

#### Auth Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| POST | `/api/auth/register` | `authController.register` | Register new user |
| POST | `/api/auth/login` | `authController.login` | Login with email OR student ID |
| POST | `/api/auth/class-login` | `classAuthController.classLogin` | Login as class |
| GET | `/api/auth/me` | `authController.getMe` | Get current user (protected) |
| PUT | `/api/auth/me` | `authController.updateProfile` | Update profile (protected) |
| PUT | `/api/auth/password` | `authController.updatePassword` | Change password (protected) |
| GET | `/api/auth/class/dashboard` | `classAuthController.getClassDashboard` | Get class dashboard (protected) |

#### Auth Controllers
- **File**: `backend/src/controllers/authController.js`
- **Class Auth**: `backend/src/controllers/classAuthController.js`

#### Authentication Middleware
- **File**: `backend/src/middleware/auth.js`
- **Function**: `protect` - Verifies JWT token and attaches user to request
- **Token Location**: `Authorization: Bearer <token>` header

#### JWT Configuration
- **Secret**: `process.env.JWT_SECRET`
- **Expiration**: `process.env.JWT_EXPIRES_IN` (default: 7d)
- **Algorithm**: HS256

### Database Authentication Tables

#### User Table
```sql
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) NOT NULL, -- SUPER_ADMIN, ADMIN, TEACHER, STUDENT
  tenant_id UUID, -- References Tenant (NULL for SUPER_ADMIN)
  student_id VARCHAR(50), -- For students only
  class_id UUID, -- References Class
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tenant Table (Schools)
```sql
CREATE TABLE "Tenant" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  school_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Class Table
```sql
CREATE TABLE "Class" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code VARCHAR(50), -- Auto-generated (e.g., CLS-1)
  name VARCHAR(255) NOT NULL,
  section VARCHAR(10),
  teacher_id UUID, -- References User (class teacher)
  tenant_id UUID NOT NULL, -- References Tenant
  password VARCHAR(255), -- For class-based login
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Password Hashing
- **Algorithm**: bcrypt
- **Salt Rounds**: `process.env.BCRYPT_SALT_ROUNDS` (default: 10)
- **Location**: `backend/src/controllers/authController.js`

#### Super Admin Seeding
- **File**: `backend/src/server.js` (seedSuperAdmin function)
- **Email**: `process.env.SUPER_ADMIN_EMAIL` (default: superadmin@school.com)
- **Password**: `process.env.SUPER_ADMIN_PASSWORD` (default: SuperAdmin@123)
- **Role**: SUPER_ADMIN (hardcoded)

---

## 2. SUPERADMIN MODULE (Global Layer)

### Frontend Super Admin Screens

#### Screen Files
| Screen | File Path | Route |
|--------|-----------|-------|
| Dashboard | `frontend/src/screens/superadmin/DashboardScreen.tsx` | `/superadmin/dashboard` |
| Schools List | `frontend/src/screens/superadmin/SchoolsListScreen.tsx` | `/superadmin/schools` |
| Create School | `frontend/src/screens/superadmin/CreateSchoolScreen.tsx` | `/superadmin/schools/create` |
| School Detail | `frontend/src/screens/superadmin/SchoolDetailScreen.tsx` | `/superadmin/schools/:tenantId` |

#### Super Admin State Flow
- All screens are lazy-loaded with `React.lazy()`
- Protected by `ProtectedRoute` component
- Requires `isSuperAdmin` flag from AuthContext
- Uses `tenantsAPI` from `frontend/src/services/api.ts`

#### Service Handlers
- **File**: `frontend/src/services/api.ts`
- **API Module**: `tenantsAPI`

```typescript
// Tenant API Methods
tenantsAPI.getAllTenants(page, limit, search)
tenantsAPI.getTenant(id)
tenantsAPI.createTenant(data)
tenantsAPI.updateTenant(id, data)
tenantsAPI.deleteTenant(id)
tenantsAPI.getTenantStats(id)
```

### Backend Super Admin Routes

#### Routes File
- **Base Path**: `/api/tenants`
- **File**: `backend/src/routes/tenants.js`

#### Tenant Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/tenants` | `tenantController.getAllTenants` | List all tenants (paginated) |
| GET | `/api/tenants/:id` | `tenantController.getTenant` | Get single tenant |
| POST | `/api/tenants` | `tenantController.createTenant` | Create new tenant (school) |
| PUT | `/api/tenants/:id` | `tenantController.updateTenant` | Update tenant |
| DELETE | `/api/tenants/:id` | `tenantController.deleteTenant` | Delete tenant |
| GET | `/api/tenants/:id/stats` | `tenantController.getTenantStats` | Get tenant statistics |

#### Tenant Controller
- **File**: `backend/src/controllers/tenantController.js`

#### Super Admin Middleware
- **File**: `backend/src/middleware/auth.js`
- **Check**: `user.role === 'SUPER_ADMIN'`

### Database Super Admin Tables

#### Tenant Table (as above)
- Stores school/tenant information
- Each tenant has unique `code` for identification
- Linked to `User` table via `tenant_id`

#### System Settings (Optional)
```sql
CREATE TABLE "SystemSettings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. ADMIN MODULE (School Admin)

### Frontend Admin Screens

#### Dashboard & Management Screens
| Screen | File Path | Route |
|--------|-----------|-------|
| Dashboard | `frontend/src/screens/admin/DashboardScreen.tsx` | `/admin/dashboard` |
| Classes List | `frontend/src/screens/admin/ClassesListScreen.tsx` | `/admin/classes` |
| Create Class | `frontend/src/screens/admin/CreateClassScreen.tsx` | `/admin/classes/create` |
| Class Dashboard | `frontend/src/screens/admin/ClassDashboardScreen.tsx` | `/admin/classes/:classId` |
| Edit Class | `frontend/src/screens/admin/EditClassScreen.tsx` | `/admin/classes/:classId/edit` |
| Teachers List | `frontend/src/screens/admin/TeachersListScreen.tsx` | `/admin/teachers` |
| Teacher Detail | `frontend/src/screens/admin/TeacherDetailScreen.tsx` | `/admin/teachers/:teacherId` |
| Edit Teacher | `frontend/src/screens/admin/EditTeacherScreen.tsx` | `/admin/teachers/:teacherId/edit` |
| Create Teacher | `frontend/src/screens/admin/CreateTeacherScreen.tsx` | `/admin/teachers/create` |
| Students List | `frontend/src/screens/admin/StudentsListScreen.tsx` | `/admin/students` |
| Create Student | `frontend/src/screens/admin/CreateStudentScreen.tsx` | `/admin/students/create` |
| Add Student (Manual) | `frontend/src/screens/admin/AddStudentScreen.tsx` | (legacy) |
| Bulk Upload | `frontend/src/screens/admin/BulkUploadStudentsScreen.tsx` | (legacy) |
| Homework List | `frontend/src/screens/admin/HomeworkListScreen.tsx` | `/admin/homework` |
| Create Homework | `frontend/src/screens/admin/CreateHomeworkScreen.tsx` | `/admin/homework/create` |
| Marks List | `frontend/src/screens/admin/MarksListScreen.tsx` | `/admin/marks` |
| Add Marks | `frontend/src/screens/admin/AddMarksScreen.tsx` | `/admin/marks/add` |
| News List | `frontend/src/screens/admin/NewsListScreen.tsx` | `/admin/news` |
| Create News | `frontend/src/screens/admin/CreateNewsScreen.tsx` | `/admin/news/create` |
| Circulars List | `frontend/src/screens/admin/CircularsListScreen.tsx` | `/admin/circulars` |
| Create Circular | `frontend/src/screens/admin/CreateCircularScreen.tsx` | `/admin/circulars/create` |
| Exam Schedules | `frontend/src/screens/admin/ExamSchedulesListScreen.tsx` | `/admin/exams` |
| Create Exam Schedule | `frontend/src/screens/admin/CreateExamScheduleScreen.tsx` | `/admin/exams/create` |
| Admin News (Visibility) | `frontend/src/screens/admin/AdminNewsScreen.tsx` | `/admin/admin-news` |
| Admin Circulars (Visibility) | `frontend/src/screens/admin/AdminCircularsScreen.tsx` | `/admin/admin-circulars` |
| Admin Exams (PDF/Image) | `frontend/src/screens/admin/AdminExamsScreen.tsx` | `/admin/admin-exams` |
| Placeholder | `frontend/src/screens/admin/PlaceholderScreen.tsx` | (fallback) |

#### Admin Service Handlers
- **File**: `frontend/src/services/api.ts`
- **API Module**: `adminAPI`

```typescript
// Classes
adminAPI.getClasses()
adminAPI.getClassDashboard(id)
adminAPI.getClass(id)
adminAPI.createClass(data)
adminAPI.updateClass(id, data)
adminAPI.deleteClass(id)
adminAPI.resetClassPassword(id, password)

// Students
adminAPI.getStudents(page, limit, search, classId)
adminAPI.getStudent(id)
adminAPI.createStudent(data)
adminAPI.updateStudent(id, data)
adminAPI.deleteStudent(id)
adminAPI.getStudentTemplate()
adminAPI.createStudentManual(data)
adminAPI.bulkImportStudents(file)
adminAPI.bulkUploadStudentsCSV(file, classId)

// Teachers
adminAPI.getAvailableTeachers(classId, search, page, limit)
adminAPI.getTeachers(page, limit, classId, search)
adminAPI.getTeacher(id)
adminAPI.createTeacher(data)
adminAPI.updateTeacher(id, data)
adminAPI.deleteTeacher(id)

// Homework
adminAPI.getHomework(page, limit, classId, isPublished)
adminAPI.getHomeworkById(id)
adminAPI.createHomework(data)
adminAPI.updateHomework(id, data)
adminAPI.deleteHomework(id)

// Marks
adminAPI.getMarks(page, limit, studentId, examType)
adminAPI.createMark(data)
adminAPI.updateMark(id, data)
adminAPI.deleteMark(id)

// News
adminAPI.getNews(page, limit, category, isPublished)
adminAPI.createNews(data)
adminAPI.updateNews(id, data)
adminAPI.deleteNews(id)

// Circulars
adminAPI.getCirculars(page, limit, isPublished)
adminAPI.createCircular(data)
adminAPI.deleteCircular(id)

// Exam Schedules
adminAPI.getExamSchedules(page, limit, classId, isPublished)
adminAPI.createExamSchedule(data)
adminAPI.deleteExamSchedule(id)
```

### Backend Admin Routes

#### Routes Files
- **Base Path**: `/api/admin`
- **File**: `backend/src/routes/admin.js`
- **Content Routes**: `backend/src/routes/adminContent.js`

#### Admin Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/admin/classes` | `adminController.getClasses` | List classes |
| GET | `/api/admin/classes/:id/dashboard` | `adminController.getClassDashboard` | Class dashboard stats |
| GET | `/api/admin/classes/:id` | `adminController.getClass` | Get single class |
| POST | `/api/admin/classes` | `adminController.createClass` | Create class |
| PUT | `/api/admin/classes/:id` | `adminController.updateClass` | Update class |
| DELETE | `/api/admin/classes/:id` | `adminController.deleteClass` | Delete class |
| POST | `/api/admin/classes/:id/reset-password` | `adminController.resetClassPassword` | Reset class password |
| GET | `/api/admin/students` | `adminController.getStudents` | List students |
| GET | `/api/admin/students/:id` | `adminController.getStudent` | Get student |
| POST | `/api/admin/students` | `adminController.createStudent` | Create student |
| PUT | `/api/admin/students/:id` | `adminController.updateStudent` | Update student |
| DELETE | `/api/admin/students/:id` | `adminController.deleteStudent` | Delete student |
| GET | `/api/admin/students/template` | `adminController.getStudentTemplate` | Get import template |
| POST | `/api/admin/students/manual` | `adminController.createStudentManual` | Manual student creation |
| POST | `/api/admin/students/bulk` | `adminController.bulkImportStudents` | Bulk import from CSV |
| POST | `/api/admin/students/bulk-upload` | `adminController.bulkUploadStudentsCSV` | Upload CSV for class |
| GET | `/api/admin/teachers/available` | `adminController.getAvailableTeachers` | Get available teachers |
| GET | `/api/admin/teachers` | `adminController.getTeachers` | List teachers |
| GET | `/api/admin/teachers/:id` | `adminController.getTeacher` | Get teacher |
| POST | `/api/admin/teachers` | `adminController.createTeacher` | Create teacher |
| PUT | `/api/admin/teachers/:id` | `adminController.updateTeacher` | Update teacher |
| DELETE | `/api/admin/teachers/:id` | `adminController.deleteTeacher` | Delete teacher |
| GET | `/api/admin/homework` | `adminController.getHomework` | List homework |
| GET | `/api/admin/homework/:id` | `adminController.getHomeworkById` | Get homework |
| POST | `/api/admin/homework` | `adminController.createHomework` | Create homework |
| PUT | `/api/admin/homework/:id` | `adminController.updateHomework` | Update homework |
| DELETE | `/api/admin/homework/:id` | `adminController.deleteHomework` | Delete homework |
| GET | `/api/admin/marks` | `adminController.getMarks` | List marks |
| POST | `/api/admin/marks` | `adminController.createMark` | Create mark |
| PUT | `/api/admin/marks/:id` | `adminController.updateMark` | Update mark |
| DELETE | `/api/admin/marks/:id` | `adminController.deleteMark` | Delete mark |
| GET | `/api/admin/news` | `adminController.getNews` | List news |
| POST | `/api/admin/news` | `adminController.createNews` | Create news |
| PUT | `/api/admin/news/:id` | `adminController.updateNews` | Update news |
| DELETE | `/api/admin/news/:id` | `adminController.deleteNews` | Delete news |
| GET | `/api/admin/circulars` | `adminController.getCirculars` | List circulars |
| POST | `/api/admin/circulars` | `adminController.createCircular` | Create circular |
| DELETE | `/api/admin/circulars/:id` | `adminController.deleteCircular` | Delete circular |
| GET | `/api/admin/exam-schedules` | `adminController.getExamSchedules` | List exam schedules |
| POST | `/api/admin/exam-schedules` | `adminController.createExamSchedule` | Create exam schedule |
| DELETE | `/api/admin/exam-schedules/:id` | `adminController.deleteExamSchedule` | Delete exam schedule |

#### Admin Content Routes (Visibility Control)
- **Base Path**: `/api/admin/content`
- **File**: `backend/src/routes/adminContent.js`

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/admin/content/news` | `adminContentController.getNews` | News with visibility |
| POST | `/api/admin/content/news` | `adminContentController.createNews` | Create with visibility |
| PUT | `/api/admin/content/news/:id` | `adminContentController.updateNews` | Update visibility |
| DELETE | `/api/admin/content/news/:id` | `adminContentController.deleteNews` | Delete news |
| GET | `/api/admin/content/circulars` | `adminContentController.getCirculars` | Circulars with visibility |
| POST | `/api/admin/content/circulars` | `adminContentController.createCircular` | Create with visibility |
| DELETE | `/api/admin/content/circulars/:id` | `adminContentController.deleteCircular` | Delete circular |
| GET | `/api/admin/content/exams` | `adminContentController.getExams` | Exams (PDF/Image) |
| POST | `/api/admin/content/exams` | `adminContentController.createExam` | Upload exam file |
| DELETE | `/api/admin/content/exams/:id` | `adminContentController.deleteExam` | Delete exam |

#### Admin Controllers
- **Main Admin**: `backend/src/controllers/adminController.js`
- **Admin Content**: `backend/src/controllers/adminContentController.js`

#### File Upload Middleware
- **File**: `backend/src/middleware/fileUpload.js`
- **Storage**: `backend/uploads/` directory
- **Service**: `backend/src/services/storageService.js`

### Database Admin Tables

#### Class Table (as above)
- Linked to `Tenant` via `tenant_id`
- Linked to `User` (teacher) via `teacher_id`
- Has `password` for class-based login

#### Homework Table
```sql
CREATE TABLE "Homework" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  class_id UUID NOT NULL, -- References Class
  tenant_id UUID NOT NULL, -- References Tenant
  assigned_by UUID NOT NULL, -- References User (teacher)
  due_date TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Mark Table
```sql
CREATE TABLE "Mark" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL, -- References User
  subject VARCHAR(100) NOT NULL,
  marks_obtained INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  grade VARCHAR(10),
  exam_type VARCHAR(100),
  exam_date DATE,
  tenant_id UUID NOT NULL, -- References Tenant
  remarks TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### News Table
```sql
CREATE TABLE "News" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(100),
  image_url TEXT,
  pdf_url TEXT,
  visibility VARCHAR(50) DEFAULT 'ALL', -- ALL or SPECIFIC_CLASSES
  tenant_id UUID NOT NULL, -- References Tenant
  posted_by UUID NOT NULL, -- References User
  is_published BOOLEAN DEFAULT false,
  publish_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Circular Table
```sql
CREATE TABLE "Circular" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  circular_no VARCHAR(50),
  image_url TEXT,
  visibility VARCHAR(50) DEFAULT 'ALL', -- ALL or SPECIFIC_CLASSES
  tenant_id UUID NOT NULL, -- References Tenant
  issued_by UUID NOT NULL, -- References User
  is_published BOOLEAN DEFAULT false,
  issue_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ExamSchedule Table
```sql
CREATE TABLE "ExamSchedule" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  duration INTEGER, -- in minutes
  room_no VARCHAR(50),
  class_id UUID NOT NULL, -- References Class
  tenant_id UUID NOT NULL, -- References Tenant
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Exam Table (PDF/Image based)
```sql
CREATE TABLE "Exam" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  class_id UUID, -- NULL for global exams
  tenant_id UUID NOT NULL,
  file_url TEXT, -- PDF or image URL
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### News/Class Visibility Junction
```sql
CREATE TABLE "NewsClassVisibility" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL, -- References News
  class_id UUID NOT NULL, -- References Class
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "CircularClassVisibility" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_id UUID NOT NULL, -- References Circular
  class_id UUID NOT NULL, -- References Class
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. CLASSES & TEACHERS MODULE

### Frontend Class Controller Screens

#### Class Controller Dashboard
| Screen | File Path | Route |
|--------|-----------|-------|
| Dashboard | `frontend/src/screens/classcontroller/ClassControllerDashboardScreen.tsx` | `/class-controller/dashboard` |
| Students List | `frontend/src/screens/classcontroller/ClassStudentsListScreen.tsx` | `/class-controller/students` |
| Add Student | `frontend/src/screens/classcontroller/ClassAddStudentScreen.tsx` | `/class-controller/students/add` |
| Edit Student | `frontend/src/screens/classcontroller/ClassEditStudentScreen.tsx` | `/class-controller/students/:studentId/edit` |
| Homework List | `frontend/src/screens/classcontroller/ClassHomeworkListScreen.tsx` | `/class-controller/homework` |
| Homework Detail | `frontend/src/screens/classcontroller/ClassHomeworkDetailScreen.tsx` | `/class-controller/homework/:homeworkId` |
| Create Homework | `frontend/src/screens/classcontroller/ClassCreateHomeworkScreen.tsx` | `/class-controller/homework/create` |
| Attendance List | `frontend/src/screens/classcontroller/ClassAttendanceListScreen.tsx` | `/class-controller/attendance` |
| Mark Attendance | `frontend/src/screens/classcontroller/ClassMarkAttendanceScreen.tsx` | `/class-controller/attendance/mark` |
| News List | `frontend/src/screens/classcontroller/ClassNewsListScreen.tsx` | `/class-controller/news` |
| News Detail | `frontend/src/screens/classcontroller/ClassNewsDetailScreen.tsx` | `/class-controller/news/:newsId` |
| Circulars List | `frontend/src/screens/classcontroller/ClassCircularsListScreen.tsx` | `/class-controller/circulars` |
| Create Circular | `frontend/src/screens/classcontroller/ClassCreateCircularScreen.tsx` | `/class-controller/circulars/create` |
| Exam Schedules | `frontend/src/screens/classcontroller/ClassExamSchedulesListScreen.tsx` | `/class-controller/exams` |
| Create Exam Schedule | `frontend/src/screens/classcontroller/ClassCreateExamScheduleScreen.tsx` | `/class-controller/exams/create` |
| Exam Detail | `frontend/src/screens/classcontroller/ClassExamDetailScreen.tsx` | `/class-controller/exams/:examId` |
| Profile | `frontend/src/screens/classcontroller/ClassProfileScreen.tsx` | `/class-controller/profile` |

#### Class Controller Service Handlers
- **File**: `frontend/src/services/api.ts`
- **API Module**: `classControllerAPI`

```typescript
// Dashboard
classControllerAPI.getDashboard()

// Students
classControllerAPI.getStudents(classId, page, limit, search)

// Homework
classControllerAPI.getHomework(classId, page, limit, isPublished)
classControllerAPI.getHomeworkById(id)
classControllerAPI.createHomework(data)
classControllerAPI.updateHomework(id, data)
classControllerAPI.deleteHomework(id)

// Attendance
classControllerAPI.getAttendance(classId, date)
classControllerAPI.markAttendance(date, attendanceData)

// News
classControllerAPI.getNews(classId, page, limit, category)
classControllerAPI.getNewsById(id)

// Circulars
classControllerAPI.getCirculars(classId, page, limit)
classControllerAPI.getCircularById(id)
classControllerAPI.createCircular(data)
classControllerAPI.deleteCircular(id)

// Exams
classControllerAPI.getExamSchedules(classId, page, limit)
classControllerAPI.getExamScheduleById(id)
classControllerAPI.createExamSchedule(data)
classControllerAPI.deleteExamSchedule(id)
```

### Frontend Teacher Screens

#### Teacher Dashboard & Management
| Screen | File Path | Route |
|--------|-----------|-------|
| Dashboard | `frontend/src/screens/teacher/TeacherDashboardScreen.tsx` | `/teacher/dashboard` |
| Students | `frontend/src/screens/teacher/TeacherStudentsScreen.tsx` | `/teacher/students` |
| Homework | `frontend/src/screens/teacher/TeacherHomeworkScreen.tsx` | `/teacher/homework` |
| Marks | `frontend/src/screens/teacher/TeacherMarksScreen.tsx` | `/teacher/marks` |
| News | `frontend/src/screens/teacher/TeacherNewsScreen.tsx` | `/teacher/news` |
| Circulars | `frontend/src/screens/teacher/TeacherCircularsScreen.tsx` | `/teacher/circulars` |
| Weekly Lesson Grid | `frontend/src/screens/teacher/WeeklyLessonGridScreen.tsx` | `/teacher/weekly-lessons` |
| Attendance | `frontend/src/screens/teacher/TeacherAttendanceScreen.tsx` | `/teacher/attendance` |
| Weekly Timetable | `frontend/src/screens/teacher/WeeklyTimetableScreen.tsx` | `/teacher/timetable` |

#### Teacher Service Handlers
- **File**: `frontend/src/services/api.ts`
- **API Module**: `teacherAPI`

```typescript
// Dashboard
teacherAPI.getDashboardProfile()
teacherAPI.getMyClass()

// Students
teacherAPI.getMyStudents(page, limit, search)
teacherAPI.updateStudent(id, data)
teacherAPI.createStudentManual(data)
teacherAPI.bulkUploadStudents(file)

// Homework
teacherAPI.getHomework(page, limit)
teacherAPI.createHomework(data)
teacherAPI.updateHomework(id, data)
teacherAPI.deleteHomework(id)

// Marks
teacherAPI.getMarks(page, limit, studentId, examType)
teacherAPI.createMarks(marksData)
teacherAPI.updateMark(id, data)
teacherAPI.deleteMark(id)

// Attendance
teacherAPI.markAttendance(date, attendanceData)
teacherAPI.getClassAttendance(date)

// Weekly Lessons
teacherAPI.getWeeklyLessons(classId, startDate, endDate)
teacherAPI.createWeeklyLesson(data)
teacherAPI.updateWeeklyLesson(id, data)
teacherAPI.deleteWeeklyLesson(id)
```

### Backend Class Controller Routes

#### Routes File
- **Base Path**: `/api/class-controller`
- **File**: `backend/src/routes/classController.js`

#### Class Controller Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/class-controller/dashboard` | `classController.getDashboard` | Class dashboard |
| GET | `/api/class-controller/students` | `classController.getStudents` | List class students |
| GET | `/api/class-controller/homework` | `classController.getHomework` | List class homework |
| GET | `/api/class-controller/homework/:id` | `classController.getHomeworkById` | Get homework detail |
| POST | `/api/class-controller/homework` | `classController.createHomework` | Create homework |
| PUT | `/api/class-controller/homework/:id` | `classController.updateHomework` | Update homework |
| DELETE | `/api/class-controller/homework/:id` | `classController.deleteHomework` | Delete homework |
| GET | `/api/class-controller/attendance` | `classController.getAttendance` | Get attendance records |
| POST | `/api/class-controller/attendance` | `classController.markAttendance` | Mark attendance |
| GET | `/api/class-controller/news` | `classController.getNews` | Get class news |
| GET | `/api/class-controller/news/:id` | `classController.getNewsById` | Get news detail |
| GET | `/api/class-controller/circulars` | `classController.getCirculars` | Get class circulars |
| GET | `/api/class-controller/circulars/:id` | `classController.getCircularById` | Get circular detail |
| POST | `/api/class-controller/circulars` | `classController.createCircular` | Create circular |
| DELETE | `/api/class-controller/circulars/:id` | `classController.deleteCircular` | Delete circular |
| GET | `/api/class-controller/exams` | `classController.getExamSchedules` | Get exam schedules |
| GET | `/api/class-controller/exams/:id` | `classController.getExamScheduleById` | Get exam detail |
| POST | `/api/class-controller/exams` | `classController.createExamSchedule` | Create exam schedule |
| DELETE | `/api/class-controller/exams/:id` | `classController.deleteExamSchedule` | Delete exam schedule |

#### Class Controller Controller
- **File**: `backend/src/controllers/classController.js`

### Backend Teacher Routes

#### Routes File
- **Base Path**: `/api/teacher`
- **File**: `backend/src/routes/teacher.js`

#### Teacher Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/teacher/dashboard-profile` | `teacherDashboardController.getDashboardProfile` | Teacher profile stats |
| GET | `/api/teacher/my-class` | `teacherDashboardController.getMyClass` | Get assigned class |
| GET | `/api/teacher/students` | `teacherController.getMyStudents` | List teacher's students |
| PUT | `/api/teacher/students/:id` | `teacherController.updateStudent` | Update student |
| POST | `/api/teacher/students/manual` | `teacherController.createStudentManual` | Manual student creation |
| POST | `/api/teacher/students/bulk-upload` | `teacherController.bulkUploadStudents` | Bulk upload students |
| GET | `/api/teacher/homework` | `teacherController.getHomework` | List teacher's homework |
| POST | `/api/teacher/homework` | `teacherController.createHomework` | Create homework |
| PUT | `/api/teacher/homework/:id` | `teacherController.updateHomework` | Update homework |
| DELETE | `/api/teacher/homework/:id` | `teacherController.deleteHomework` | Delete homework |
| GET | `/api/teacher/marks` | `teacherController.getMarks` | List marks |
| POST | `/api/teacher/marks` | `teacherController.createMarks` | Create multiple marks |
| PUT | `/api/teacher/marks/:id` | `teacherController.updateMark` | Update mark |
| DELETE | `/api/teacher/marks/:id` | `teacherController.deleteMark` | Delete mark |
| POST | `/api/teacher/attendance` | `teacherController.markAttendance` | Mark attendance |
| GET | `/api/teacher/attendance` | `teacherController.getClassAttendance` | Get attendance records |

#### Teacher Controllers
- **Dashboard**: `backend/src/controllers/teacherDashboardController.js`
- **Main**: `backend/src/controllers/teacherController.js`

### Weekly Lessons Routes

#### Routes File
- **Base Path**: `/api` (mounted at server level)
- **File**: `backend/src/routes/weeklyLessons.js`

#### Weekly Lesson Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/teacher/weekly-lessons` | `weeklyLessonController.getTeacherWeeklyLessons` | Get lessons for teacher's class |
| POST | `/api/teacher/weekly-lessons` | `weeklyLessonController.createWeeklyLesson` | Create lesson |
| PUT | `/api/teacher/weekly-lessons/:id` | `weeklyLessonController.updateWeeklyLesson` | Update lesson |
| DELETE | `/api/teacher/weekly-lessons/:id` | `weeklyLessonController.deleteWeeklyLesson` | Delete lesson |
| GET | `/api/student/weekly-lessons` | `weeklyLessonController.getStudentWeeklyLessons` | Get lessons for student's class |
| GET | `/api/student/weekly-lessons/:id` | `weeklyLessonController.getLessonDetail` | Get lesson with attachments |

#### Weekly Lesson Controller
- **File**: `backend/src/controllers/weeklyLessonController.js`

### Database Classes & Teachers Tables

#### Class Table (as defined above)
- Links students to teacher
- Has password for class login
- Linked to tenant

#### Attendance Table
```sql
CREATE TABLE "Attendance" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL, -- References User
  class_id UUID NOT NULL, -- References Class
  date DATE NOT NULL,
  status VARCHAR(20), -- PRESENT, ABSENT, LATE, EXCUSED
  remarks TEXT,
  marked_by UUID, -- References User (teacher)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);
```

#### WeeklyLesson Table
```sql
CREATE TABLE "WeeklyLesson" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(100) NOT NULL,
  lesson_date DATE NOT NULL, -- YYYY-MM-DD
  classwork_text TEXT,
  homework_text TEXT,
  class_id UUID NOT NULL, -- References Class
  created_by UUID, -- References User (teacher)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### WeeklyLessonAttachment Table
```sql
CREATE TABLE "WeeklyLessonAttachment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL, -- References WeeklyLesson
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER, -- in bytes
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 5. STUDENT MODULE

### Frontend Student Screens

#### Student Dashboard & Views
| Screen | File Path | Route |
|--------|-----------|-------|
| Dashboard | `frontend/src/screens/student/DashboardScreen.tsx` | `/student/dashboard` |
| Homework List | `frontend/src/screens/student/HomeworkListScreen.tsx` | `/student/homework` |
| Homework Detail | `frontend/src/screens/student/HomeworkDetailScreen.tsx` | `/student/homework/:homeworkId` |
| Marks List | `frontend/src/screens/student/MarksListScreen.tsx` | `/student/marks` |
| News List | `frontend/src/screens/student/NewsListScreen.tsx` | `/student/news` |
| News Detail | `frontend/src/screens/student/NewsDetailScreen.tsx` | `/student/news/:newsId` |
| Circulars List | `frontend/src/screens/student/CircularsListScreen.tsx` | `/student/circulars` |
| Exam Schedules | `frontend/src/screens/student/ExamSchedulesScreen.tsx` | `/student/exams` |
| Exam Detail | `frontend/src/screens/student/StudentExamDetailScreen.tsx` | `/student/exams/:examId` |
| Profile | `frontend/src/screens/student/ProfileScreen.tsx` | `/student/profile` |
| Weekly Lessons | `frontend/src/screens/student/WeeklyLessonViewScreen.tsx` | `/student/weekly-lessons` |

#### Student Service Handlers
- **File**: `frontend/src/services/api.ts`
- **API Module**: `studentAPI`

```typescript
// Dashboard
studentAPI.getDashboard()

// Homework
studentAPI.getHomework(page, limit, subject)
studentAPI.getHomeworkById(id)

// Marks
studentAPI.getMarks(page, limit, subject, examType)
studentAPI.getMarkById(id)

// News
studentAPI.getNews(page, limit, category)
studentAPI.getNewsById(id)

// Circulars
studentAPI.getCirculars(page, limit)
studentAPI.getCircularById(id)

// Exam Schedules
studentAPI.getExamSchedules(page, limit)
studentAPI.getExamScheduleById(id)

// Profile
studentAPI.getProfile()
studentAPI.getDashboardProfile()

// Weekly Lessons
studentAPI.getWeeklyLessons(classId, startDate, endDate)
studentAPI.getWeeklyLessonDetail(id)
```

### Backend Student Routes

#### Routes File
- **Base Path**: `/api/student`
- **File**: `backend/src/routes/student.js`

#### Student Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/student/dashboard` | `studentDashboardController.getDashboard` | Student dashboard stats |
| GET | `/api/student/dashboard-profile` | `studentDashboardController.getDashboardProfile` | Profile with school info |
| GET | `/api/student/homework` | `studentController.getHomework` | List student's homework |
| GET | `/api/student/homework/:id` | `studentController.getHomeworkById` | Get homework detail |
| GET | `/api/student/marks` | `studentController.getMarks` | List student's marks with stats |
| GET | `/api/student/marks/:id` | `studentController.getMarkById` | Get mark detail |
| GET | `/api/student/news` | `studentController.getNews` | List visible news |
| GET | `/api/student/news/:id` | `studentController.getNewsById` | Get news detail |
| GET | `/api/student/circulars` | `studentController.getCirculars` | List visible circulars |
| GET | `/api/student/circulars/:id` | `studentController.getCircularById` | Get circular detail |
| GET | `/api/student/exam-schedules` | `studentController.getExamSchedules` | List upcoming exams |
| GET | `/api/student/exam-schedules/:id` | `studentController.getExamScheduleById` | Get exam detail |
| GET | `/api/student/profile` | `studentController.getProfile` | Get student profile |

#### Student Controllers
- **Dashboard**: `backend/src/controllers/studentDashboardController.js`
- **Main**: `backend/src/controllers/studentController.js`

### Shared Content Routes (Students & Teachers)

#### Routes File
- **Base Path**: `/api/content`
- **File**: `backend/src/routes/content.js`

#### Content Endpoints

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/content/homework` | `contentController.getHomework` | Get homework (for class) |
| GET | `/api/content/homework/:id` | `contentController.getHomeworkById` | Get homework detail |
| GET | `/api/content/news` | `contentController.getNews` | Get visible news |
| GET | `/api/content/news/:id` | `contentController.getNewsById` | Get news detail |
| GET | `/api/content/circulars` | `contentController.getCirculars` | Get visible circulars |
| GET | `/api/content/circulars/:id` | `contentController.getCircularById` | Get circular detail |
| GET | `/api/content/exams` | `contentController.getExams` | Get exam files |
| GET | `/api/content/exams/:id` | `contentController.getExamById` | Get exam file detail |

#### Content Controller
- **File**: `backend/src/controllers/contentController.js`

### Database Student Tables

#### User Table (Student Records)
- Students are stored in `User` table with `role = 'STUDENT'`
- Linked to `Class` via `class_id`
- Has `student_id` field for roll number

#### Mark Table (as defined above)
- Stores student marks/grades
- Linked to `User` (student) via `student_id`
- Includes computed fields: `percentage`, `grade`

#### StudentStatistics (Computed View)
```sql
-- View for student statistics
CREATE OR REPLACE VIEW "StudentStatistics" AS
SELECT 
  student_id,
  COUNT(*) as total_subjects,
  SUM(marks_obtained) as total_marks_obtained,
  SUM(total_marks) as total_max_marks,
  ROUND((SUM(marks_obtained) / SUM(total_marks)) * 100, 2) as overall_percentage
FROM "Mark"
WHERE is_published = true
GROUP BY student_id;
```

#### DashboardStats (Computed View)
```sql
-- View for student dashboard stats
CREATE OR REPLACE VIEW "StudentDashboardStats" AS
SELECT 
  s.id as student_id,
  COUNT(DISTINCT h.id) as total_homework,
  COUNT(DISTINCT m.id) as total_marks,
  COUNT(DISTINCT n.id) as total_news,
  COUNT(DISTINCT c.id) as total_circulars,
  COUNT(DISTINCT es.id) as upcoming_exams
FROM "User" s
LEFT JOIN "Class" cl ON s.class_id = cl.id
LEFT JOIN "Homework" h ON h.class_id = cl.id AND h.is_published = true
LEFT JOIN "Mark" m ON m.student_id = s.id AND m.is_published = true
LEFT JOIN "News" n ON (n.visibility = 'ALL' OR n.id IN (SELECT news_id FROM "NewsClassVisibility" WHERE class_id = cl.id)) AND n.is_published = true
LEFT JOIN "Circular" c ON (c.visibility = 'ALL' OR c.id IN (SELECT circular_id FROM "CircularClassVisibility" WHERE class_id = cl.id)) AND c.is_published = true
LEFT JOIN "ExamSchedule" es ON es.class_id = cl.id AND es.date >= CURRENT_DATE AND es.is_published = true
WHERE s.role = 'STUDENT'
GROUP BY s.id;
```

---

## FILE UPLOAD & STORAGE

### Upload Configuration
- **Directory**: `backend/uploads/`
- **Middleware**: `backend/src/middleware/fileUpload.js`
- **Service**: `backend/src/services/storageService.js`

### Upload Endpoints
- News images/PDFs: `/api/admin/news` (POST)
- Circular images: `/api/admin/circulars` (POST)
- Exam files: `/api/admin/content/exams` (POST)
- Weekly lesson attachments: `/api/teacher/weekly-lessons` (POST with multipart)
- Student bulk upload: `/api/admin/students/bulk` (POST with multipart)

---

## ERROR HANDLING

### Error Handler Middleware
- **File**: `backend/src/middleware/errorHandler.js`
- **Response Format**:
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "errors": []
  }
}
```

### 404 Handler
- **Location**: `backend/src/server.js` (line 138-143)
- **Response**:
```json
{
  "error": "Route not found",
  "path": "/requested/path"
}
```

---

## ENVIRONMENT CONFIGURATION

### Backend Environment Variables
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=school_db
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=10

# Super Admin
SUPER_ADMIN_EMAIL=superadmin@school.com
SUPER_ADMIN_PASSWORD=SuperAdmin@123
SUPER_ADMIN_NAME=Super Admin

# CORS
ALLOWED_ORIGINS=localhost,192.168,ngrok
```

### Frontend Environment Variables
```env
# API Configuration
VITE_API_URL=https://your-ngrok-url.ngrok-free.dev/api
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.dev/api

# App Configuration
EXPO_PUBLIC_APP_NAME=School App
EXPO_PUBLIC_APP_VERSION=1.0.0
```

---

## API BASE URL CONFIGURATION

### Frontend API Service
- **File**: `frontend/src/services/api.ts`
- **Base URL Logic**:
```typescript
const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000/api';
```

### Axios Instance Configuration
- **Timeout**: 10 seconds
- **Credentials**: Enabled (cookies/sessions)
- **Headers**: 
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`
- **Request Interceptor**: Adds `Authorization: Bearer <token>` header
- **Response Interceptor**: Handles 401 errors (token expired)

---

## ROUTING & NAVIGATION

### Frontend Route Structure
- **Auth Routes**: `/login`, `/register`
- **Super Admin**: `/superadmin/*`
- **Admin**: `/admin/*`
- **Teacher**: `/teacher/*`
- **Student**: `/student/*`
- **Class Controller**: `/class-controller/*`
- **Legacy Posts**: `/posts/*`

### Route Protection
- **Component**: `ProtectedRoute` in `frontend/App.tsx`
- **Logic**: Checks `isAuthenticated` OR `isClass` before rendering
- **Redirect**: `/login` if not authenticated

### Role-Based Route Rendering
- Routes are conditionally rendered based on user role flags from AuthContext
- `isSuperAdmin`, `isAdmin`, `isTeacher`, `isStudent`, `isClass`

---

## DATA ISOLATION & MULTI-TENANCY

### Tenant Isolation Strategy
- Every school data record has `tenant_id` field
- Queries filter by `tenant_id` from authenticated user's tenant
- Super Admin can access all tenants

### Class Isolation
- Class-specific data filtered by `class_id`
- Teachers see only their assigned class
- Students see only their class data

### Visibility Control
- News/Circulars have `visibility` field: `ALL` or `SPECIFIC_CLASSES`
- Junction tables link content to specific classes
- Students/Teachers only see content visible to their class

---

This architecture map provides complete visibility into the multi-tenant school management system's structure, endpoints, database schema, and data flow across all modules.