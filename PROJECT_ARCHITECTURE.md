# Multi-Tenant School Management System - Project Architecture

## Overview

This is a comprehensive **Multi-Tenant School Management System** built with **Ionic React TypeScript** for the frontend and **Node.js/Express** with **PostgreSQL (Supabase)** for the backend. The system supports multiple user roles with role-based access control (RBAC) and is designed to manage schools, classes, teachers, students, homework, marks, attendance, and communications.

---

## 1. Folder & Directory Structure

### Frontend Structure (`frontend/src/`)

```
frontend/src/
├── components/           # Shared React components
│   └── ErrorBoundary.tsx # Error boundary for graceful error handling
├── contexts/             # React Context providers for state management
│   ├── AuthContext.tsx   # Authentication state and user info
│   └── index.ts          # Barrel export (optional)
├── screens/              # Page components organized by feature/role
│   ├── LoginScreen.tsx   # Authentication login page
│   ├── RegisterScreen.tsx# User registration page
│   ├── admin/            # School Admin screens
│   ├── superadmin/       # Super Admin screens
│   ├── teacher/          # Teacher screens
│   ├── student/          # Student screens
│   └── classcontroller/  # Class Controller screens (class-based login)
├── services/             # API service layer
│   ├── api.ts            # Centralized API client with all endpoints
│   └── index.ts          # Barrel export
├── types/                # TypeScript type definitions
│   └── index.ts          # All interfaces and types
├── App.tsx               # Main app component with routing
├── main.tsx              # Application entry point
└── theme.css             # Global styles and CSS variables
```

### Backend Structure (`backend/src/`)

```
backend/src/
├── config/               # Configuration files
│   └── db.js             # PostgreSQL connection pool setup
├── controllers/          # Request handlers for each domain
│   ├── authController.js # Authentication logic
│   ├── tenantController.js # School/Tenant management
│   ├── classController.js  # Class management
│   ├── homeworkController.js
│   ├── markController.js
│   ├── attendanceController.js
│   ├── newsController.js
│   ├── circularController.js
│   └── ...
├── middleware/           # Express middleware
│   ├── auth.js           # JWT verification and role checking
│   ├── errorHandler.js   # Global error handling
│   └── maintenanceGuard.js
├── routes/               # Route definitions
│   ├── auth.js
│   ├── tenants.js
│   ├── admin.js
│   ├── teacher.js
│   ├── student.js
│   └── ...
├── utils/                # Utility functions
│   └── cache.js          # In-memory caching utilities
└── server.js             # Main server entry point
```

### Database Structure (`database/`)

```
database/
├── schema.sql            # Main database schema
├── supabase_schema.sql   # Supabase-specific schema with RLS
├── migrations/           # Database migration files
└── performance_indexes.sql # Performance optimization indexes
```

---

## 2. Role-Based Architecture & Access Control (RBAC)

### User Roles Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUPER_ADMIN                             │
│  (Platform-level access - manages all schools and system config)│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ADMIN                                  │
│         (School-level access - manages one specific school)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│         TEACHER           │     │          STUDENT              │
│  (Manages assigned classes)│     │  (Views personal data only)   │
└───────────────────────────┘     └───────────────────────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│     CLASS_CONTROLLER      │     │       CLASS-BASED USER        │
│  (Class representative)   │     │  (Shared class account)       │
└───────────────────────────┘     └───────────────────────────────┘
```

### Role Responsibilities

#### **Super Admin**
- **Scope:** Platform-wide access across all tenants (schools)
- **Capabilities:**
  - Create, read, update, delete schools/tenants
  - View system-wide statistics and telemetry
  - Manage system configuration (rate limiting, audit logs, auto-backup)
  - View database latency and system health
  - Provision new school accounts

#### **Admin (School Admin)**
- **Scope:** Single school/tenant
- **Capabilities:**
  - Manage classes (create, edit, delete)
  - Manage teachers (add, edit, remove)
  - Manage students (enroll, edit, remove)
  - Create and manage homework assignments
  - Record and manage marks/grades
  - Post news and circulars
  - Manage exam schedules
  - View school-wide reports and analytics

#### **Teacher**
- **Scope:** Assigned classes within a school
- **Capabilities:**
  - View student lists for assigned classes
  - Create and grade homework
  - Record marks for assigned subjects
  - Take attendance for assigned classes
  - Post class-specific news and circulars
  - View weekly lesson plans
  - Manage class timetable

#### **Student**
- **Scope:** Personal data only
- **Capabilities:**
  - View personal timetable
  - View submitted homework and grades
  - View marks and report cards
  - Read school news and circulars
  - View exam schedules
  - View attendance records
  - View class materials

#### **Class Controller**
- **Scope:** Shared class account (e.g., "CLS-10A")
- **Capabilities:**
  - Similar to teacher but for a specific class
  - Manage class student list
  - Record attendance for the class
  - Post class announcements
  - View class homework and marks

---

## 3. Module Breakdown & Page Workflow

### Authentication Flow

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  /login     │───▶│ AuthContext  │───▶│ Role Check    │───▶│ Dashboard    │
│  /register  │    │ (JWT Token)  │    │ (RBAC)        │    │ (Role-based) │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘
```

### Route Structure

#### Public Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/login` | LoginScreen | User authentication |
| `/register` | RegisterScreen | User registration |

#### Super Admin Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/superadmin/dashboard` | SuperAdminDashboardScreen | System overview and telemetry |
| `/superadmin/schools` | SchoolsListScreen | List all schools |
| `/superadmin/schools/create` | CreateSchoolScreen | Create new school |
| `/superadmin/schools/:tenantId` | SchoolDetailScreen | View/edit school details |

#### Admin Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/admin/dashboard` | AdminDashboardScreen | School overview |
| `/admin/classes` | ClassesListScreen | Manage classes |
| `/admin/classes/create` | CreateClassScreen | Create new class |
| `/admin/classes/:classId` | ClassDashboardScreen | Class details |
| `/admin/teachers` | TeachersListScreen | Manage teachers |
| `/admin/students` | StudentsListScreen | Manage students |
| `/admin/homework` | HomeworkListScreen | Manage homework |
| `/admin/marks` | MarksListScreen | Manage marks |
| `/admin/news` | NewsListScreen | School news |
| `/admin/circulars` | CircularsListScreen | School circulars |
| `/admin/exams` | ExamSchedulesListScreen | Exam schedules |

#### Teacher Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/teacher/dashboard` | TeacherDashboardScreen | Teacher overview |
| `/teacher/students` | TeacherStudentsScreen | Student lists |
| `/teacher/homework` | TeacherHomeworkScreen | Homework management |
| `/teacher/marks` | TeacherMarksScreen | Mark entry |
| `/teacher/attendance` | TeacherAttendanceScreen | Attendance tracking |
| `/teacher/weekly-lessons` | WeeklyLessonGridScreen | Lesson plans |
| `/teacher/timetable` | WeeklyTimetableScreen | Class timetable |

#### Student Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/student/dashboard` | StudentDashboardScreen | Student overview |
| `/student/homework` | StudentHomeworkListScreen | View homework |
| `/student/marks` | StudentMarksListScreen | View marks |
| `/student/news` | StudentNewsListScreen | School news |
| `/student/circulars` | StudentCircularsListScreen | School circulars |
| `/student/exams` | StudentExamSchedulesScreen | Exam schedules |
| `/student/profile` | StudentProfileScreen | Student profile |
| `/student/weekly-lessons` | WeeklyLessonViewScreen | View lessons |

#### Class Controller Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/class-controller/dashboard` | ClassControllerDashboardScreen | Class overview |
| `/class-controller/students` | ClassStudentsListScreen | Class students |
| `/class-controller/homework` | ClassHomeworkListScreen | Class homework |
| `/class-controller/attendance` | ClassAttendanceListScreen | Class attendance |
| `/class-controller/news` | ClassNewsListScreen | Class news |
| `/class-controller/circulars` | ClassCircularsListScreen | Class circulars |
| `/class-controller/exams` | ClassExamSchedulesListScreen | Class exams |
| `/class-controller/profile` | ClassProfileScreen | Class profile |

### API Service Layer (`frontend/src/services/api.ts`)

The API service provides a centralized client for all backend communication:

```typescript
// Example API structure
export const tenantsAPI = {
  getAllTenants: (page, limit) => api.get('/tenants', { params: { page, limit } }),
  getTenantById: (id) => api.get(`/tenants/${id}`),
  createTenant: (data) => api.post('/tenants', data),
  updateTenant: (id, data) => api.put(`/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/tenants/${id}`),
  getTenantStats: (id) => api.get(`/tenants/${id}/stats`),
};

export const adminAPI = {
  // Admin-specific endpoints
};

export const teacherAPI = {
  // Teacher-specific endpoints
};

export const studentAPI = {
  // Student-specific endpoints
};

export const classControllerAPI = {
  // Class controller endpoints
};
```

### Context Providers

#### AuthContext (`frontend/src/contexts/AuthContext.tsx`)
Manages authentication state and provides user information:

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isClass: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}
```

---

## 4. Database Schema Overview

### Core Tables

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Tenant       │────▶│      User       │────▶│     Class       │
│  (Schools)      │◀────│  (All users)    │◀────│  (Classes)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Homework     │     │      Mark       │     │   Attendance    │
│  (Assignments)  │     │   (Grades)      │     │  (Records)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      News       │     │    Circular     │     │  ExamSchedule   │
│ (Announcements) │     │ (Official docs) │     │   (Exams)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Relationships

- **Tenant** (1) ──▶ (Many) **User** (tenantId)
- **Tenant** (1) ──▶ (Many) **Class** (tenantId)
- **Tenant** (1) ──▶ (Many) **Homework** (tenantId)
- **Class** (1) ──▶ (Many) **User** (classId)
- **User** (1) ──▶ (Many) **Mark** (studentId)
- **User** (1) ──▶ (Many) **Attendance** (studentId)

---

## 5. Technology Stack

### Frontend
- **Ionic React** v5+ - UI framework
- **React** v18 - UI library
- **React Router** v5 - Client-side routing
- **TypeScript** - Type safety
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **PostgreSQL** (Supabase) - Database
- **node-postgres** (pg) - Database client
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication

### DevOps
- **Supabase** - PostgreSQL hosting
- **Capacitor** - Mobile app wrapper
- **Vite** - Frontend build tool

---

## 6. Security Features

1. **JWT Authentication** - Secure token-based auth
2. **Password Hashing** - bcrypt with configurable salt rounds
3. **Role-Based Access Control** - Middleware-based role verification
4. **Tenant Isolation** - Data isolation per school
5. **Input Validation** - express-validator for request validation
6. **CORS Protection** - Configurable CORS policies
7. **Rate Limiting** - Configurable rate limiting middleware

---

## 7. Performance Optimizations

1. **Database Connection Pooling** - Efficient connection management
2. **In-Memory Caching** - 5-minute TTL cache for user data
3. **Lazy Loading** - React.lazy for code splitting
4. **Indexing** - Performance indexes on frequently queried columns
5. **Query Optimization** - Parameterized queries to prevent SQL injection

---

## 8. Deployment Considerations

### Frontend
- Build with `npm run build`
- Deploy to Vercel, Netlify, or static hosting
- Configure environment variables (VITE_API_URL)

### Backend
- Start with `npm start`
- Deploy to Heroku, Railway, or VPS
- Configure environment variables (DATABASE_URL, JWT_SECRET)

### Database
- Supabase PostgreSQL with connection pooling
- Automatic backups and point-in-time recovery
- Row Level Security (RLS) policies

---

## Conclusion

This architecture provides a scalable, secure, and maintainable foundation for a multi-tenant school management system. The clear separation of concerns, role-based access control, and modular design allow for easy extension and maintenance as requirements evolve.