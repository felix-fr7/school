# MACVEL School Management System - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Backend API Reference](#backend-api-reference)
6. [Frontend Screens & Features](#frontend-screens--features)
7. [Data Models](#data-models)
8. [Authentication & Security](#authentication--security)
9. [Multi-Tenancy](#multi-tenancy)
10. [File Upload & Storage](#file-upload--storage)
11. [Environment Configuration](#environment-configuration)
12. [Deployment Guide](#deployment-guide)

---

## Project Overview

The **MACVEL School Management System** is a comprehensive, multi-tenant SaaS platform designed to digitize and streamline school operations. It provides role-based access for administrators, teachers, students, and parents, enabling efficient management of academic activities, communication, and administrative tasks.

### Key Features
- **Multi-Tenant Architecture**: Each school operates as an independent tenant with complete data isolation
- **Role-Based Access Control**: Different permissions for Super Admin, School Admin, Teacher, Student, Parent, and Class Controller
- **Class-Based Login**: Special authentication for class monitors/representatives
- **Homework Management**: Create, assign, submit, and grade homework
- **Exam & Timetable Management**: Schedule exams and manage timetables
- **News & Circulars**: School-wide announcements and official communications
- **Student Management**: Admissions, profiles, and academic records
- **Teacher Management**: Assignments, class management, and performance tracking
- **Media Gallery**: Photos and videos from school events
- **Weekly Lessons**: Lesson plans and academic content
- **Leave Management**: Leave requests and approvals
- **Messages**: Internal communication system

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Admin     │  │   Teacher   │  │   Student   │             │
│  │   Portal    │  │   Portal    │  │   Portal    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Class     │  │  Super      │                               │
│  │ Controller  │  │  Admin      │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Routes    │  │ Controllers │  │ Middleware  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │   Models    │  │  Services   │                               │
│  └─────────────┘  └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB Database                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Users    │  │   Schools   │  │    Class    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Homework   │  │    Exams    │  │    News     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime environment |
| Express.js | ^4.22.2 | Web framework |
| MongoDB | Latest | Database |
| Mongoose | ^9.9.0 | ODM (Object Data Modeling) |
| JWT | ^9.0.2 | Authentication tokens |
| Bcryptjs | ^2.4.3 | Password hashing |
| Helmet | ^7.1.0 | Security headers |
| CORS | ^2.8.6 | Cross-origin resource sharing |
| Multer | ^1.4.5-lts.1 | File upload handling |
| Express Validator | ^7.0.1 | Input validation |
| UUID | ^9.0.1 | Unique ID generation |
| XLSX | ^0.18.5 | Excel file handling |
| Dotenv | ^16.3.1 | Environment variables |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| React Router | 5.x | Navigation |
| Ionic React | Latest | UI components |
| Vite | 5.x | Build tool |
| Axios | Latest | HTTP client |
| Tailwind CSS | Latest | Styling |
| Capacitor | ^8.4.2 | Native mobile wrapper |

---

## User Roles & Permissions

### 1. Super Admin
**Full system access across all tenants**
- Create and manage schools (tenants)
- View system-wide statistics
- Suspend or activate schools
- Manage subscription expiry
- Access all school data

### 2. School Admin (Tenant Admin)
**Full access within their school only**
- Manage classes (create, edit, delete)
- Manage teachers (hire, assign classes)
- Manage students (admissions, transfers)
- Create and publish news/circulars
- Manage homework and exams
- View school statistics
- Manage subjects and timetables

### 3. Teacher
**Access limited to assigned classes**
- View assigned classes
- Create and manage homework for assigned classes
- Grade homework submissions
- View student lists
- Manage attendance
- Create weekly lesson plans
- View exam schedules

### 4. Student
**Access to own data only**
- View homework assignments
- Submit homework
- View marks and report cards
- View exam schedules
- View news and circulars
- View timetable
- View attendance
- Update own profile

### 5. Parent
**Access to children's data**
- View children's homework
- View children's marks
- View children's attendance
- Receive notifications
- Communicate with teachers

### 6. Class Controller (Class Monitor)
**Special role for class representatives**
- Manage class students
- Create homework for class
- Create circulars for class
- Manage exam schedules
- View class profile

---

## Backend API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/login` | No | Login with email/password |
| POST | `/auth/class-login` | No | Login with class code/password |
| POST | `/auth/register` | Yes (Admin) | Register new user |
| GET | `/auth/me` | Yes | Get current user profile |
| PUT | `/auth/password` | Yes | Change password |
| POST | `/auth/logout` | Yes | Logout user |

### Super Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/super-admin/schools` | Register new school |
| GET | `/super-admin/schools` | List all schools |
| GET | `/super-admin/schools/:id` | Get school details |
| PUT | `/super-admin/schools/:id` | Update school |
| PATCH | `/super-admin/schools/:id/status` | Change school status |
| DELETE | `/super-admin/schools/:id` | Delete school |
| GET | `/super-admin/stats` | System statistics |

### School Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Admin dashboard stats |
| GET | `/admin/classes` | List all classes |
| GET | `/admin/classes/:id` | Get class details |
| GET | `/admin/classes/:id/dashboard` | Class dashboard |
| POST | `/admin/classes` | Create new class |
| PUT | `/admin/classes/:id` | Update class |
| DELETE | `/admin/classes/:id` | Delete class |
| GET | `/admin/students` | List students |
| GET | `/admin/students/:id` | Get student details |
| POST | `/admin/students` | Create student |
| PUT | `/admin/students/:id` | Update student |
| DELETE | `/admin/students/:id` | Deactivate student |
| GET | `/admin/teachers` | List teachers |
| GET | `/admin/teachers/available` | List unassigned teachers |
| GET | `/admin/teachers/:id` | Get teacher details |
| POST | `/admin/teachers` | Create teacher |
| PUT | `/admin/teachers/:id` | Update teacher |
| DELETE | `/admin/teachers/:id` | Delete teacher |
| GET | `/admin/subjects` | List subjects |
| POST | `/admin/subjects` | Create subject |
| PUT | `/admin/subjects/:id` | Update subject |

### Teacher Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teacher/classes` | Get assigned classes |
| GET | `/teacher/students` | Get students in classes |
| GET | `/teacher/homework` | List homework |
| POST | `/teacher/homework` | Create homework |
| PUT | `/teacher/homework/:id` | Update homework |
| DELETE | `/teacher/homework/:id` | Delete homework |
| GET | `/teacher/exams` | List exams |
| POST | `/teacher/exams` | Create exam |
| GET | `/teacher/attendance` | Manage attendance |
| POST | `/teacher/attendance` | Mark attendance |
| GET | `/teacher/weekly-lessons` | Lesson plans |
| POST | `/teacher/weekly-lessons` | Create lesson plan |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/student/dashboard` | Student dashboard |
| GET | `/student/homework` | View homework |
| GET | `/student/homework/:id` | Homework details |
| POST | `/student/homework/:id/submit` | Submit homework |
| GET | `/student/marks` | View marks |
| GET | `/student/exams` | View exam schedule |
| GET | `/student/attendance` | View attendance |
| GET | `/student/timetable` | View timetable |
| GET | `/student/weekly-lessons` | View lessons |
| GET | `/student/profile` | Student profile |
| PUT | `/student/profile` | Update profile |
| POST | `/student/leave` | Submit leave request |

### Class Controller Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/class-controller/dashboard` | Class dashboard |
| GET | `/class-controller/students` | List class students |
| POST | `/class-controller/students` | Add student |
| PUT | `/class-controller/students/:id` | Update student |
| DELETE | `/class-controller/students/:id` | Remove student |
| GET | `/class-controller/homework` | List homework |
| POST | `/class-controller/homework` | Create homework |
| PUT | `/class-controller/homework/:id` | Update homework |
| DELETE | `/class-controller/homework/:id` | Delete homework |
| GET | `/class-controller/news` | List news |
| POST | `/class-controller/news` | Create news |
| GET | `/class-controller/circulars` | List circulars |
| POST | `/class-controller/circulars` | Create circular |
| GET | `/class-controller/exams` | List exams |
| POST | `/class-controller/exams` | Create exam schedule |
| GET | `/class-controller/profile` | Class profile |

### Content Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/news` | List news (public) |
| GET | `/news/:id` | News details |
| POST | `/news` | Create news (admin) |
| PUT | `/news/:id` | Update news |
| DELETE | `/news/:id` | Delete news |
| GET | `/circulars` | List circulars |
| POST | `/circulars` | Create circular |
| GET | `/gallery` | Media gallery |
| POST | `/gallery` | Upload media |
| GET | `/calendar` | School calendar |
| GET | `/contacts` | School contacts |
| GET | `/videos` | Video library |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/files` | List uploaded files |
| POST | `/files` | Upload file |
| DELETE | `/files/:id` | Delete file |
| GET | `/profile` | User profile |
| PUT | `/profile` | Update profile |

---

## Frontend Screens & Features

### Authentication Screens

#### LoginScreen
- Dual login support (email OR student ID)
- Class-based login option
- Password visibility toggle
- Remember me functionality
- Forgot password link
- Role-based redirect after login

#### RegisterScreen
- User registration form
- Role selection
- Email verification
- Auto-login after registration

### Super Admin Screens

#### DashboardScreen
- System-wide statistics
- School count and status
- User distribution charts
- Recent activities

#### SchoolsListScreen
- List all schools with pagination
- Search and filter options
- School status indicators
- Quick actions (view, edit, delete)

#### CreateSchoolScreen
- School registration form
- Admin account creation
- Subscription settings
- Validation and error handling

#### SchoolDetailScreen
- Complete school information
- User statistics
- Subscription details
- Management actions

### School Admin Screens

#### AdminDashboardScreen
- School statistics overview
- Quick access cards
- Recent activities
- Pending tasks

#### ClassesListScreen
- List all classes
- Class code display
- Student count per class
- Class teacher assignment
- CRUD operations

#### CreateClassScreen
- Class creation form
- Auto-generate class code
- Teacher assignment
- Password setup for class login

#### ClassDashboardScreen
- Class details overview
- Student count
- Recent homework
- Upcoming exams
- Class statistics

#### EditClassScreen
- Edit class information
- Change teacher assignment
- Update class details
- Reset class password

#### StudentsListScreen
- List all students
- Search and filter
- Pagination support
- Student profile quick view
- Add/Edit/Delete operations

#### CreateStudentScreen
- Student registration form
- Class assignment
- Parent information
- Emergency contact details

#### EditStudentScreen
- Update student information
- Change class assignment
- Update parent details
- Academic records

#### TeachersListScreen
- List all teachers
- Assignment status
- Qualification details
- Add/Edit/Delete operations

#### CreateTeacherScreen
- Teacher registration form
- Qualification details
- Subject specialization
- Class assignment

#### EditTeacherScreen
- Update teacher information
- Change assignments
- Update qualifications

#### HomeworkListScreen (Admin)
- View all homework
- Filter by class/subject
- Publish/unpublish toggle
- CRUD operations

#### CreateHomeworkScreen
- Homework creation form
- Subject selection
- Due date setting
- Attachment upload
- Class selection

#### NewsListScreen / AdminNewsScreen
- List school news
- Publish/unpublish
- Category management
- CRUD operations

#### CircularsListScreen / AdminCircularsScreen
- List circulars
- Issue new circulars
- Track readership
- CRUD operations

#### ExamSchedulesListScreen / AdminExamsScreen
- View exam schedules
- Create exam schedules
- Edit/Delete exams
- Date conflict checking

### Teacher Screens

#### TeacherDashboardScreen
- Assigned classes overview
- Pending tasks
- Quick actions
- Recent notifications

#### TeacherClassesScreen
- List assigned classes
- Class details
- Student count
- Quick navigation

#### TeacherStudentsScreen
- Students in assigned classes
- Student profiles
- Performance tracking
- Attendance records

#### TeacherHomeworkScreen
- Create homework
- View submissions
- Grade assignments
- Feedback provision

#### TeacherAttendanceScreen
- Mark attendance
- View attendance history
- Generate reports
- Edit past records

### Student Screens

#### StudentDashboardScreen
- Personal overview
- Pending homework
- Upcoming exams
- Recent announcements
- Quick access cards

#### StudentHomeworkScreen / HomeworkListScreen
- View assigned homework
- Homework details
- Submission status
- Submit homework
- View grades and feedback

#### StudentMarksScreen / MarksListScreen
- View marks by subject
- Grade breakdown
- Term-wise performance
- Report card view

#### StudentExamsScreen / ExamSchedulesScreen
- View exam timetable
- Exam details
- Date and time
- Subject information

#### StudentAttendanceScreen
- View attendance record
- Attendance percentage
- Monthly breakdown
- Absence reasons

#### StudentTimetableScreen
- Weekly class schedule
- Subject timing
- Teacher information
- Room numbers

#### StudentWeeklyLessonViewScreen
- View weekly lessons
- Classwork details
- Homework assigned
- Learning objectives

#### StudentLeaveScreen
- Submit leave request
- View leave history
- Leave status tracking
- Reason specification

#### StudentProfileScreen
- Personal information
- Academic details
- Parent information
- Update profile

### Class Controller Screens

#### ClassControllerDashboardScreen
- Class overview
- Student count
- Recent activities
- Quick actions

#### ClassStudentsListScreen
- List students in class
- Add new students
- Edit student details
- Remove students

#### ClassAddStudentScreen
- Add student to class
- Generate student ID
- Basic information form

#### ClassEditStudentScreen
- Update student information
- Change class assignment
- Update parent details

#### ClassHomeworkListScreen
- View class homework
- Create new homework
- Edit/Delete homework
- Publish status

#### ClassCreateHomeworkScreen
- Create homework form
- Subject selection
- Assignment details
- Due date setting

#### ClassHomeworkEditScreen
- Edit existing homework
- Update details
- Change due date

#### ClassHomeworkDetailScreen
- View homework details
- Submission status
- Student submissions

#### ClassNewsListScreen
- Class-specific news
- Create news
- Edit/Delete news

#### ClassCreateCircularScreen
- Create circular form
- Target audience
- Content editor

#### ClassCircularsListScreen
- View circulars
- Circular details
- Track readership

#### ClassExamSchedulesListScreen
- View exam schedules
- Create new exams
- Edit/Delete exams

#### ClassCreateExamScheduleScreen
- Create exam form
- Subject selection
- Date and time setting

#### ClassProfileScreen
- Class information
- Class code
- Teacher details
- Student statistics

### Shared Screens

#### NewsScreen
- View school news
- News categories
- Search functionality
- Detail view

#### CircularsScreen
- View circulars
- Circular categories
- Issue date filtering
- Detail view

#### GalleryScreen
- Photo gallery
- Video gallery
- Category filtering
- Full-screen view

#### CalendarScreen
- School calendar
- Event listing
- Date navigation
- Event details

#### MessagesScreen
- Internal messaging
- Conversation list
- Message composition
- Notifications

#### ContactsScreen
- School contacts
- Department directory
- Quick dial
- Email integration

#### VideosScreen
- Video library
- Category filtering
- Search functionality
- Video player

#### SettingsScreen
- User preferences
- Notification settings
- Privacy settings
- Account management

---

## Data Models

### User Model
```javascript
{
  name: String,                    // Required, 2-100 chars
  email: String,                   // Required, unique, email format
  password: String,                // Required, min 6 chars, hashed
  phone: String,                   // Optional, phone format
  profileImage: String,            // Optional
  role: String,                    // Enum: Super Admin, School Admin, Teacher, Student, Parent
  schoolId: ObjectId,              // Required (except Super Admin)
  isActive: Boolean,               // Default: true
  dateOfBirth: Date,               // Optional
  gender: String,                  // Enum: Male, Female, Other
  age: Number,                     // 0-150
  qualification: String,           // For teachers
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Student-specific
  studentId: String,               // Auto-generated
  classId: ObjectId,               // Reference to Class
  rollNumber: String,
  // Parent-specific
  parentOf: [ObjectId],            // Children references
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### School/Tenant Model
```javascript
{
  schoolName: String,              // Required, 2-200 chars
  schoolCode: String,              // Required, unique, uppercase
  address: String,                 // Required, max 500 chars
  contactEmail: String,            // Required, email format
  contactPhone: String,            // Required, phone format
  status: String,                  // Enum: Active, Suspended, Trial
  subscriptionExpiry: Date,        // Optional
  settings: Object,                // School preferences
  createdAt: Date,
  updatedAt: Date
}
```

### Class Model
```javascript
{
  name: String,                    // Required (e.g., "10th Grade")
  section: String,                 // Required (e.g., "A", "B")
  gradeLevel: Number,              // Optional
  tenantId: ObjectId,              // Required (school reference)
  teacherId: ObjectId,             // Reference to Teacher
  classCode: String,               // Auto-generated (e.g., "CLS-0001")
  password: String,                // Hashed, for class login
  roomNumber: String,              // Optional
  capacity: Number,                // Optional
  isActive: Boolean,               // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Homework Model
```javascript
{
  title: String,                   // Required
  description: String,             // Optional
  subject: String,                 // Required
  classId: ObjectId,               // Required
  tenantId: ObjectId,              // Required
  assignedBy: ObjectId,            // Teacher who created
  dueDate: Date,                   // Required
  attachments: [{
    name: String,
    url: String,
    size: Number,
    type: String
  }],
  maxMarks: Number,                // Optional
  isPublished: Boolean,            // Default: false
  createdAt: Date,
  updatedAt: Date
}
```

### HomeworkSubmission Model
```javascript
{
  homeworkId: ObjectId,            // Required
  studentId: ObjectId,             // Required
  tenantId: ObjectId,              // Required
  submissionText: String,          // Optional
  attachments: [{
    name: String,
    url: String,
    size: Number,
    type: String
  }],
  submittedAt: Date,
  marksObtained: Number,           // Optional
  feedback: String,                // Optional
  gradedBy: ObjectId,              // Teacher
  gradedAt: Date,
  status: String,                  // Enum: pending, submitted, graded
  createdAt: Date,
  updatedAt: Date
}
```

### Exam Model
```javascript
{
  examName: String,                // Required
  classId: ObjectId,               // Required
  tenantId: ObjectId,              // Required
  subject: String,                 // Required
  totalMarks: Number,              // Optional
  duration: Number,                // Minutes
  examType: String,                // Mid-term, Final, Unit Test
  createdAt: Date,
  updatedAt: Date
}
```

### ExamSchedule Model
```javascript
{
  title: String,                   // Required
  subject: String,                 // Required
  classId: ObjectId,               // Required
  tenantId: ObjectId,              // Required
  date: Date,                      // Required
  time: String,                    // Required (e.g., "09:00 AM")
  duration: Number,                // Minutes
  roomNumber: String,              // Optional
  isPublished: Boolean,            // Default: false
  createdAt: Date,
  updatedAt: Date
}
```

### News Model
```javascript
{
  title: String,                   // Required
  content: String,                 // Required
  tenantId: ObjectId,              // Required
  postedBy: ObjectId,              // User who posted
  category: String,                // General, Sports, Academic, etc.
  isPublished: Boolean,            // Default: false
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Circular Model
```javascript
{
  title: String,                   // Required
  content: String,                 // Required
  tenantId: ObjectId,              // Required
  issuedBy: ObjectId,              // User who issued
  issueDate: Date,                 // Required
  targetAudience: String,          // All, Students, Teachers, Parents
  isPublished: Boolean,            // Default: false
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Attendance Model
```javascript
{
  studentId: ObjectId,             // Required
  classId: ObjectId,               // Required
  tenantId: ObjectId,              // Required
  date: Date,                      // Required
  status: String,                  // Present, Absent, Late, Excused
  remarks: String,                 // Optional
  markedBy: ObjectId,              // Teacher
  createdAt: Date,
  updatedAt: Date
}
```

### Mark Model
```javascript
{
  studentId: ObjectId,             // Required
  tenantId: ObjectId,              // Required
  subject: String,                 // Required
  marksObtained: Number,           // Required
  totalMarks: Number,              // Required
  percentage: Number,              // Auto-calculated
  grade: String,                   // A, B, C, D, F
  examType: String,                // Mid-term, Final, Unit Test
  term: String,                    // Term 1, Term 2, Annual
  academicYear: String,            // YYYY-YYYY
  remarks: String,                 // Optional
  createdAt: Date,
  updatedAt: Date
}
```

### WeeklyLesson Model
```javascript
{
  classId: ObjectId,               // Required
  tenantId: ObjectId,              // Required
  subject: String,                 // Required
  lessonDate: Date,                // Required
  weekNumber: Number,              // Week of year
  classwork: String,               // Topics covered
  homework: String,                // Homework assigned
  objectives: String,              // Learning objectives
  resources: String,               // Teaching resources
  createdBy: ObjectId,             // Teacher
  createdAt: Date,
  updatedAt: Date
}
```

### LeaveRequest Model
```javascript
{
  studentId: ObjectId,             // Required
  tenantId: ObjectId,              // Required
  leaveType: String,               // Sick, Casual, Emergency
  startDate: Date,                 // Required
  endDate: Date,                   // Required
  reason: String,                  // Required
  status: String,                  // Pending, Approved, Rejected
  approvedBy: ObjectId,            // Admin/Teacher
  approvedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  senderId: ObjectId,              // Required
  receiverId: ObjectId,            // Required
  tenantId: ObjectId,              // Required
  message: String,                 // Required
  isRead: Boolean,                 // Default: false
  readAt: Date,
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### MediaGallery Model
```javascript
{
  title: String,                   // Required
  category: String,                // Event, Sports, Annual Day, etc.
  mediaType: String,               // Image, Video
  url: String,                     // Required
  thumbnailUrl: String,            // For videos
  description: String,             // Optional
  eventDate: Date,                 // Optional
  tenantId: ObjectId,              // Required
  uploadedBy: ObjectId,            // User
  tags: [String],                  // Search tags
  isPublished: Boolean,            // Default: false
  fileSize: Number,                // Bytes
  duration: Number,                // Seconds (for videos)
  createdAt: Date,
  updatedAt: Date
}
```

### Subject Model
```javascript
{
  name: String,                    // Required
  code: String,                    // Auto-generated, unique
  description: String,             // Optional
  tenantId: ObjectId,              // Required
  isActive: Boolean,               // Default: true
  createdAt: Date,
  updatedAt: Date
}
```

### Timetable Model
```javascript
{
  classId: ObjectId,               // Required
  tenantId: ObjectId,              // Required
  dayOfWeek: Number,               // 0-6 (Sunday-Saturday)
  period: Number,                  // Period number
  subject: String,                 // Required
  teacherId: ObjectId,             // Optional
  roomNumber: String,              // Optional
  startTime: String,               // HH:MM format
  endTime: String,                 // HH:MM format
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Security

### Authentication Methods

#### 1. Email/Password Login
```javascript
POST /api/auth/login
{
  "email": "user@school.com",
  "password": "password123"
}
// OR
{
  "usernameOrEmailOrId": "STU-0001",
  "password": "password123"
}
```

#### 2. Class-Based Login
```javascript
POST /api/auth/class-login
{
  "classCode": "CLS-0001",
  "password": "classPassword123"
}
```

### JWT Token Structure
```javascript
{
  "id": "user_id",
  "email": "user@email.com",
  "role": "Student",
  "schoolId": "school_id",
  "studentId": "STU-0001",
  "classId": "class_id",
  "iat": 1626182400,
  "exp": 1626268800
}
```

### Security Features

1. **Password Hashing**: Bcrypt with configurable salt rounds (default: 10)
2. **JWT Tokens**: 24-hour expiry (configurable)
3. **Helmet Security Headers**: CSP, X-Frame-Options, etc.
4. **CORS Protection**: Configurable allowed origins
5. **Rate Limiting**: Available for sensitive endpoints
6. **Input Validation**: Express Validator on all inputs
7. **SQL Injection Prevention**: Mongoose ODM
8. **XSS Protection**: Helmet and input sanitization
9. **Multi-Tenant Isolation**: Tenant-based data filtering

### Middleware Chain
1. **Helmet** - Security headers
2. **CORS** - Cross-origin handling
3. **Body Parser** - JSON/URL parsing
4. **Authentication** - JWT verification
5. **RBAC** - Role-based access control
6. **Tenant Isolation** - School data filtering
7. **Error Handler** - Centralized error handling

---

## Multi-Tenancy

### Tenant Isolation Strategy

1. **Database Level**: All documents include `tenantId` field
2. **Query Level**: All queries filter by `tenantId`
3. **Middleware Level**: `enforceSchoolIsolation` middleware
4. **API Level**: `X-School-ID` header support

### Tenant Identification

1. **From JWT Token**: `req.user.schoolId` or `req.user.tenantId`
2. **From Header**: `X-School-ID` or `X-Tenant-ID`
3. **From Query Parameter**: `?schoolId=xxx`
4. **From Request Body**: `req.body.tenantId`

### Tenant Context Middleware
```javascript
// Automatically adds tenant context to queries
app.use((req, res, next) => {
  if (req.user && req.user.schoolId) {
    req.tenantId = req.user.schoolId;
  }
  next();
});
```

### Super Admin Bypass
- Super Admin can access all tenants
- Tenant isolation is bypassed for Super Admin role
- Useful for system-wide operations

---

## File Upload & Storage

### Upload Configuration

```javascript
{
  dest: './uploads',
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB max
    files: 5                       // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
}
```

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: XLS, XLSX, CSV
- **Videos**: MP4, WebM (limited)

### File Storage Structure
```
uploads/
├── homework/
│   └── {tenantId}/
│       └── {homeworkId}/
│           └── {filename}
├── news/
│   └── {tenantId}/
│       └── {filename}
├── gallery/
│   └── {tenantId}/
│       └── {filename}
└── profiles/
    └── {tenantId}/
        └── {userId}/
            └── {filename}
```

### File Access
- Files served via `/uploads` route
- Static file middleware with cache headers
- Public access for published content
- Protected access for private content

---

## Environment Configuration

### Backend Environment Variables (.env)

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/macvel_school

# Security
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001,http://localhost:8100

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# External Services (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend Environment Variables (.env)

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api

# App Configuration
VITE_APP_NAME=MACVEL School
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_FILE_UPLOAD=true
```

---

## Deployment Guide

### Prerequisites
- Node.js ≥18.0.0
- MongoDB (local or Atlas)
- Git
- PM2 (for production)

### Backend Deployment

#### 1. Clone Repository
```bash
git clone https://github.com/felix-fr7/school.git
cd school/backend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

#### 4. Database Setup
```bash
# If using MongoDB Atlas, update MONGODB_URI in .env
# If using local MongoDB:
mongod --dbpath /data/db

# Seed initial data (optional)
npm run seed
```

#### 5. Start Server
```bash
# Development
npm run dev

# Production (with PM2)
pm2 start src/server.js --name school-api
pm2 save
pm2 startup
```

### Frontend Deployment

#### 1. Navigate to Frontend
```bash
cd ../frontend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API URL
```

#### 4. Build for Production
```bash
npm run build
```

#### 5. Deploy Build
```bash
# The build output is in dist/ folder
# Deploy to your web server (Nginx, Apache, etc.)

# Example Nginx configuration:
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Deployment (Optional)

#### Dockerfile (Backend)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

#### Dockerfile (Frontend)
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/macvel_school
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

---

## API Response Format

### Success Response
```javascript
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response
```javascript
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Pagination Response
```javascript
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `NO_TOKEN` | No authorization header provided | 401 |
| `INVALID_TOKEN` | Token is invalid or malformed | 401 |
| `TOKEN_EXPIRED` | Token has expired | 401 |
| `UNAUTHORIZED` | User not authenticated | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `DUPLICATE_ENTRY` | Resource already exists | 409 |
| `SERVER_ERROR` | Internal server error | 500 |
| `DATABASE_ERROR` | Database operation failed | 500 |

---

## Support & Contact

### Documentation
- [Project Architecture](./backend/PROJECT_ARCHITECTURE.md)
- [API Documentation](./ARCHITECTURE_DOCUMENTATION.md)
- [Deployment Guide](./FINAL_DEPLOYMENT_REPORT.md)

### GitHub Repository
- URL: https://github.com/felix-fr7/school
- Branch: main

### Version Information
- Current Version: 3.0.0
- Last Updated: 2026-08-08
- License: MIT

---

## Conclusion

The MACVEL School Management System is a comprehensive, production-ready SaaS platform that provides:

1. **Complete School Management**: All essential features for running a school digitally
2. **Multi-Tenant Architecture**: Support for multiple schools with complete data isolation
3. **Role-Based Access Control**: Secure, permission-based access for all user types
4. **Modern Tech Stack**: Built with Node.js, Express, MongoDB, React, and Vite
5. **Mobile-Ready**: Ionic React frontend with Capacitor for native mobile apps
6. **Scalable Design**: Designed to handle growth from single school to multi-school districts
7. **Production-Ready**: Includes security, error handling, and deployment configurations

The system is designed to be flexible, maintainable, and extensible, making it suitable for educational institutions of all sizes.