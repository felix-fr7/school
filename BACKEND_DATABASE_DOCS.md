# Backend Technical Architecture & Database Documentation

## Overview

This document provides comprehensive documentation of the Express.js backend architecture, database structure, API routes, and data handling patterns for the School Management System.

---

## 1. Database Configuration & Connection

### Database System
- **Type**: PostgreSQL (via Supabase)
- **Connection Library**: `node-postgres` (pg)
- **Connection Mode**: Transaction Pooler (port 6543)

### Configuration File
**Location**: `backend/src/config/db.js`

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@host:6543/postgres
# OR
DIRECT_DATABASE_URL=postgresql://user:password@host:5432/postgres
```

### Connection Pool Configuration
```javascript
const pool = new Pool({
  connectionString,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // 30 second idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  application_name: 'school-backend'
});
```

### Key Features
- **Retry Logic**: Automatic retry for transient connection errors (exponential backoff)
- **Prepared Statements**: Disabled for Supabase transaction pooler compatibility
- **Transaction Support**: Full ACID transaction support with COMMIT/ROLLBACK
- **Query Logging**: Slow query logging (>1s) in development mode

---

## 2. Database Schema & Table Structure

### Core Tables

#### 2.1 Users Table
Stores all user accounts (Admins, Teachers, Students, Class Controllers)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| email | VARCHAR(255) | Unique email address |
| password | VARCHAR(255) | Bcrypt hashed password |
| name | VARCHAR(255) | User's full name |
| role | VARCHAR(50) | User role (ADMIN, TEACHER, STUDENT, CLASS_CONTROLLER) |
| classId | UUID | Foreign Key to Class (for students/class controllers) |
| studentId | VARCHAR(20) | Sequential student ID (e.g., STU-0001) |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Indexes**:
- `idx_users_email` - Fast email lookups
- `idx_user_classId_role` - Filter students by class
- `idx_user_studentId` - Sequential student ID lookup

#### 2.2 Class Table
Represents school classes

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| name | VARCHAR(255) | Class name (e.g., "Grade 10") |
| section | VARCHAR(10) | Class section (e.g., "A", "B") |
| classCode | VARCHAR(20) | Unique class code (e.g., "CLS-001") |
| tenantId | UUID | Foreign Key to Tenant |
| academicYear | VARCHAR(20) | Academic year (e.g., "2025-2026") |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

#### 2.3 Tenant Table
Multi-tenant support for multiple schools

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| name | VARCHAR(255) | School/institution name |
| subdomain | VARCHAR(50) | Unique subdomain |
| isActive | BOOLEAN | Active status |
| createdAt | TIMESTAMP | Creation timestamp |

#### 2.4 Homework Table
Homework assignments for classes

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| title | VARCHAR(255) | Assignment title |
| description | TEXT | Assignment description |
| subject | VARCHAR(100) | Subject name |
| classId | UUID | Foreign Key to Class |
| tenantId | UUID | Foreign Key to Tenant |
| assignedBy | UUID | Foreign Key to User (teacher) |
| dueDate | TIMESTAMP | Due date |
| isPublished | BOOLEAN | Publication status |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Indexes**:
- `idx_homework_classId` - Filter by class
- `idx_homework_tenantId` - Multi-tenant filtering
- `idx_homework_isPublished` - Filter published items
- `idx_homework_dueDate` - Sort by due date

#### 2.5 Attendance Table
Daily attendance records

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| studentId | UUID | Foreign Key to User (student) |
| classId | UUID | Foreign Key to Class |
| tenantId | UUID | Foreign Key to Tenant |
| attendanceDate | DATE | Date of attendance |
| status | VARCHAR(20) | Status (present, absent, excused, late) |
| remarks | TEXT | Optional notes |
| markedBy | UUID | Foreign Key to User (who marked) |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Constraints**:
- `UNIQUE(attendanceDate, studentId)` - One record per student per day

**Indexes**:
- `idx_attendance_classId_date` - Class attendance by date
- `idx_attendance_studentId` - Student attendance history
- `idx_attendance_date` - Date-based queries

#### 2.6 Exam Table
Exam timetables (PDF/Image based)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| examName | VARCHAR(255) | Exam name |
| classId | UUID | Foreign Key to Class |
| tenantId | UUID | Foreign Key to Tenant |
| pdfUrl | TEXT | Path to PDF file |
| imageUrl | TEXT | Path to image file |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

#### 2.7 ClassCircular Table
Class-specific announcements

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| title | VARCHAR(255) | Circular title |
| content | TEXT | Circular content |
| circularNo | VARCHAR(50) | Circular number |
| classId | UUID | Foreign Key to Class |
| tenantId | UUID | Foreign Key to Tenant |
| issuedBy | UUID | Foreign Key to User |
| isPublished | BOOLEAN | Publication status |
| issueDate | DATE | Date of issue |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

### Relationship Diagram

```
Tenant (1) ──── (Many) Class
Tenant (1) ──── (Many) User
Tenant (1) ──── (Many) Homework
Tenant (1) ──── (Many) Attendance
Tenant (1) ──── (Many) Exam
Tenant (1) ──── (Many) ClassCircular

Class (1) ──── (Many) User (students)
Class (1) ──── (Many) Homework
Class (1) ──── (Many) Attendance
Class (1) ──── (Many) Exam
Class (1) ──── (Many) ClassCircular

User (1) ──── (Many) Homework (assignedBy)
User (1) ──── (Many) Attendance (markedBy)
User (1) ──── (Many) ClassCircular (issuedBy)
```

---

## 3. Backend Architecture & Folder Flow

### Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection pool
│   ├── controllers/
│   │   ├── adminController.js  # Admin operations (homework, etc.)
│   │   ├── adminContentController.js
│   │   ├── attendanceController.js
│   │   ├── authController.js   # Authentication (login, register)
│   │   ├── classAuthController.js
│   │   ├── classController.js  # Class controller operations
│   │   ├── contentController.js # Content (circulars, exams)
│   │   ├── feeController.js
│   │   ├── postController.js
│   │   ├── studentController.js
│   │   ├── studentDashboardController.js
│   │   ├── teacherController.js
│   │   ├── teacherDashboardController.js
│   │   ├── telemetryController.js
│   │   ├── tenantController.js
│   │   └── weeklyLessonController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication middleware
│   │   ├── errorHandler.js     # Global error handling
│   │   ├── fileUpload.js       # Multer file upload config
│   │   └── maintenanceGuard.js # Maintenance mode
│   ├── routes/
│   │   ├── admin.js            # Admin routes
│   │   ├── adminContent.js
│   │   ├── auth.js             # Auth routes (login, register)
│   │   ├── classController.js  # Class controller routes
│   │   ├── content.js
│   │   ├── posts.js
│   │   ├── student.js
│   │   ├── superadmin.js
│   │   ├── teacher.js
│   │   ├── tenants.js
│   │   ├── utils.js
│   │   └── weeklyLessons.js
│   ├── services/
│   │   └── storageService.js   # File storage utilities
│   ├── utils/
│   │   └── cache.js            # Caching utilities
│   └── server.js               # Express app entry point
├── uploads/                    # File upload directory
└── package.json
```

### Request Flow

```
HTTP Request
    │
    ▼
Express Router (routes/*.js)
    │
    ▼
Middleware (auth.js, fileUpload.js)
    │
    ▼
Controller (controllers/*.js)
    │
    ▼
Database Query (db.query())
    │
    ▼
PostgreSQL/Supabase
    │
    ▼
Response JSON
```

---

## 4. API & Data Handling Mapping (CRUD Operations)

### 4.1 Class Controller Module

**Route File**: `backend/src/routes/classController.js`

#### Student Management

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/class-controller/students` | `classController.getClassStudents` | List all students with pagination |
| GET | `/api/class-controller/students/next-id` | `classController.getNextStudentId` | Get next auto-generated student ID |
| POST | `/api/class-controller/students` | `classController.addClassStudent` | Create new student |
| PUT | `/api/class-controller/students/:id` | `classController.updateStudent` | Update student details |
| PUT | `/api/class-controller/students/:id/reset-password` | `classController.resetStudentPassword` | Reset student password |
| DELETE | `/api/class-controller/students/:id` | `classController.deleteStudent` | Remove student from class |

**Sample Query (Get Students)**:
```sql
SELECT id, email, name, "studentId", "createdAt"
FROM "User"
WHERE "classId" = $1 AND role = 'STUDENT'
ORDER BY name ASC
LIMIT $2 OFFSET $3
```

#### Homework Management

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/class-controller/homework` | `adminController.getAllHomework` | List homework assignments |
| POST | `/api/class-controller/homework` | `adminController.createHomework` | Create new homework |
| PUT | `/api/class-controller/homework/:id` | `adminController.updateHomework` | Update homework |
| DELETE | `/api/class-controller/homework/:id` | `adminController.deleteHomework` | Delete homework |

**Sample Insert (Create Homework)**:
```sql
INSERT INTO "Homework" (title, description, subject, "classId", "tenantId", "assignedBy", "dueDate", "isPublished")
VALUES ($1, $2, $3, $4, $5, $6, $7, true)
RETURNING *
```

#### Exam Management

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/class-controller/exams` | `classController.getExams` | List exam schedules |
| GET | `/api/class-controller/exams/:id` | `classController.getExamById` | Get single exam details |

#### Circulars Management

| Method | Endpoint | Controller | Description |
|--------|----------|------------|-------------|
| GET | `/api/class-controller/circulars` | `contentController.getCirculars` | List class circulars |

### 4.2 Authentication Module

**Route File**: `backend/src/routes/auth.js`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login (returns JWT) |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/class-login` | Class-based login (CLS-X) |
| POST | `/api/auth/logout` | User logout |

### 4.3 Admin Module

**Route File**: `backend/src/routes/admin.js`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/classes` | List all classes |
| POST | `/api/admin/classes` | Create new class |
| PUT | `/api/admin/classes/:id` | Update class |
| DELETE | `/api/admin/classes/:id` | Delete class |
| GET | `/api/admin/teachers` | List all teachers |
| POST | `/api/admin/teachers` | Create teacher account |

### 4.4 Student Module

**Route File**: `backend/src/routes/student.js`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/homework` | Get homework for student's class |
| GET | `/api/student/attendance` | Get student's attendance history |
| GET | `/api/student/exams` | Get exam schedules |

---

## 5. File Upload Handling

### Multer Configuration

**File**: `backend/src/middleware/fileUpload.js`

```javascript
const multer = require('multer');
const path = require('path');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Files stored in backend/uploads/
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (only allow PDFs and images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});
```

### Upload Directory Structure

```
backend/
└── uploads/
    ├── exam-timetables/
    │   └── exam-1234567890.pdf
    ├── circulars/
    │   └── circular-1234567890.jpg
    └── homework/
        └── homework-1234567890.pdf
```

### Database Storage

File paths are stored as relative URLs in database tables:

```sql
-- Example: Exam with PDF
INSERT INTO "Exam" (examName, "classId", "tenantId", "pdfUrl")
VALUES ('Midterm Exam', $1, $2, '/uploads/exam-timetables/exam-1234567890.pdf')
```

### Serving Static Files

**server.js**:
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

Files are accessible at: `http://api.example.com/uploads/filename.pdf`

---

## 6. Authentication & Authorization

### JWT Token Structure

```javascript
{
  userId: "uuid",
  email: "user@example.com",
  role: "STUDENT" | "TEACHER" | "ADMIN" | "CLASS_CONTROLLER",
  classId: "uuid",  // For students/class controllers
  tenantId: "uuid",
  iat: timestamp,
  exp: timestamp
}
```

### Middleware Protection

```javascript
// routes/classController.js
const { protectClass } = require('../middleware/auth');

// All routes require class authentication
router.use(protectClass);
```

---

## 7. Error Handling

### Global Error Handler

**File**: `backend/src/middleware/errorHandler.js`

```javascript
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### Standard Response Format

```javascript
// Success
{
  "success": true,
  "data": { /* result data */ },
  "message": "Operation completed successfully"
}

// Error
{
  "success": false,
  "message": "Error description",
  "error": "Error code"
}
```

---

## 8. Caching Implementation

**File**: `backend/src/utils/cache.js`

The application uses in-memory caching for frequently accessed data:
- Class information
- User permissions
- Dashboard statistics

Cache is invalidated on data mutations (CREATE, UPDATE, DELETE operations).

---

## 9. Multi-Tenancy

The application supports multiple tenants (schools) through:

1. **Tenant Table**: Each school has a unique tenant record
2. **Data Isolation**: All queries filter by `tenantId`
3. **Middleware**: `protectClass` extracts tenant from JWT

Example query pattern:
```sql
SELECT * FROM "Homework" 
WHERE "classId" = $1 AND "tenantId" = $2
```

---

## 10. Quick Reference

### Database Connection
```javascript
const { query } = require('./config/db');
const result = await query('SELECT * FROM "User" WHERE id = $1', [userId]);
```

### Transaction
```javascript
const { transaction } = require('./config/db');
await transaction(async (q) => {
  await q('INSERT INTO table1 ...');
  await q('INSERT INTO table2 ...');
});
```

### File Upload
```javascript
const upload = require('./middleware/fileUpload');
router.post('/upload', upload.single('file'), controller.handleUpload);
```

---

*Document generated: 2026-07-28*
*Last updated: Backend Architecture v1.0*