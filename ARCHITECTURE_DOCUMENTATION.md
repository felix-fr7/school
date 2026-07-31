# MACVEL School Management System - Comprehensive Architectural Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Security & Multi-Tenancy](#security--multi-tenancy)
5. [API Reference](#api-reference)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [File-by-File Documentation](#file-by-file-documentation)

---

## System Overview

### Architecture Pattern
The MACVEL School Management System follows a **Multi-Tenant SaaS Architecture** with:
- **Backend**: Node.js + Express.js + MongoDB/Mongoose
- **Frontend**: React + Vite + Tailwind CSS
- **Authentication**: JWT tokens with role-based access control (RBAC)
- **Multi-Tenancy**: School-based data isolation using `X-School-ID` header

### User Roles
1. **Super Admin** - System-wide management, school registration
2. **School Admin** (Tenant Admin) - School-specific user and content management
3. **Teacher** - Class management, homework, grading
4. **Student** - View assignments, report cards, media
5. **Parent** - Monitor child's progress

### Technology Stack
```
Backend:
├── Express.js 4.x
├── MongoDB with Mongoose ODM
├── JWT for authentication
├── Bcrypt for password hashing
├── Helmet for security headers
└── CORS for cross-origin requests

Frontend:
├── React 18
├── Vite 5.x (build tool)
├── Tailwind CSS (styling)
├── Axios (HTTP client)
├── React Router (navigation)
└── Context API (state management)
```

---

## Backend Architecture

### Directory Structure
```
backend/
├── src/
│   ├── server.js              # Express app entry point
│   ├── config/
│   │   └── db.js              # MongoDB connection handler
│   ├── models/                # Mongoose schemas
│   │   ├── School.js          # Multi-tenant school schema
│   │   ├── User.js            # Unified user schema
│   │   ├── Homework.js        # Homework assignments
│   │   ├── HomeworkSubmission.js
│   │   ├── ReportCard.js      # Digital report cards
│   │   ├── MediaGallery.js    # Photos/videos
│   │   └── ... (20+ models)
│   ├── controllers/           # Business logic
│   │   ├── superAdminController.js
│   │   ├── adminController.js
│   │   ├── teacherController.js
│   │   ├── studentController.js
│   │   └── authController.js
│   ├── routes/                # API route definitions
│   │   ├── superAdminRoutes.js
│   │   ├── admin.js
│   │   ├── teacher.js
│   │   ├── student.js
│   │   └── auth.js
│   ├── middleware/            # Express middleware
│   │   ├── authMiddleware.js  # JWT verification
│   │   ├── rbacMiddleware.js  # Role-based access control
│   │   ├── errorHandler.js
│   │   └── fileUpload.js
│   ├── services/              # Business services
│   └── utils/                 # Helper utilities
├── .env                       # Environment variables
└── package.json
```

---

## File-by-File Documentation

### 1. Backend Core Files

#### `backend/src/server.js`
**Purpose**: Express application entry point and middleware configuration

**Key Responsibilities**:
- Initialize Express app with security middleware (Helmet)
- Configure CORS for allowed origins
- Set up body parsing (JSON, URL-encoded)
- Establish MongoDB connection
- Register all API routes
- Handle 404 and global errors

**Security Features**:
- Helmet for security headers (CSP disabled for API)
- CORS with configurable origins
- Request size limits (10mb)
- Authentication middleware applied globally (except auth routes)

**Route Registration Order**:
1. `/api/super-admin` - Super admin routes (before auth)
2. `/api/auth` - Public authentication routes
3. `authenticate` middleware applied
4. All other routes require authentication

**API Endpoints Exposed**:
- `GET /health` - Health check
- All routes defined in imported route modules

---

#### `backend/src/config/db.js`
**Purpose**: MongoDB connection management with Mongoose

**Exports**:
- `connectDB()` - Establish MongoDB connection with retry logic
- `testConnection()` - Test database connectivity
- `closeDB()` - Graceful connection closure
- `getConnection()` - Get mongoose connection instance
- `isDBConnected()` - Check connection status
- `mongoose` - Export mongoose for advanced operations

**Connection Configuration**:
```javascript
{
  serverSelectionTimeoutMS: 5000,  // 5 second timeout
  socketTimeoutMS: 45000           // 45 second socket timeout
}
```

**Connection String**: `MONGODB_URI` from environment variables
**Fallback**: `mongodb://localhost:27017/macvel_school`

**Event Handlers**:
- `error` - Log connection errors
- `disconnected` - Update connection state
- `SIGINT` - Graceful shutdown on process termination

---

### 2. Mongoose Models

#### `backend/src/models/School.js`
**Purpose**: Multi-tenant school/organization schema

**Schema Fields**:
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| schoolName | String | required, 2-200 chars | School name |
| schoolCode | String | required, unique, uppercase | Unique school identifier |
| address | String | required, max 500 chars | School address |
| contactEmail | String | required, email format | Contact email |
| contactPhone | String | required, phone format | Contact phone |
| status | String | enum: Active/Suspended/Trial | Subscription status |
| subscriptionExpiry | Date | optional | Subscription end date |
| settings | Object | optional | School preferences |

**Indexes**:
- `{ schoolCode: 1 }` - Fast school code lookups
- `{ status: 1 }` - Filter by status
- `{ contactEmail: 1 }` - Email-based queries

**Virtuals**:
- `userCount` - Count of users associated with school

**Instance Methods**:
- `isSubscriptionActive()` - Check if school can access system

**Static Methods**:
- `findActive()` - Get all active schools
- `findExpiringSoon(days)` - Get schools with expiring subscriptions

**Pre-save Middleware**:
- Converts `schoolCode` to uppercase

---

#### `backend/src/models/User.js`
**Purpose**: Unified user schema for all roles with multi-tenant support

**Schema Fields**:
| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| name | String | required, 2-100 chars | User's full name |
| email | String | required, unique, email | Login email |
| password | String | required, min 6 chars | Hashed password (not returned) |
| phone | String | optional, phone format | Contact number |
| profileImage | String | optional | Avatar URL |
| role | String | enum: Super Admin/School Admin/Teacher/Student/Parent | User role |
| schoolId | ObjectId | required (except Super Admin) | Multi-tenant isolation |
| isActive | Boolean | default: true | Account status |
| dateOfBirth | Date | optional | User's DOB |
| gender | String | enum: Male/Female/Other | Gender |
| address | Object | optional | Address details |
| studentId | String | optional | Student ID (for students) |
| classId | ObjectId | optional | Class reference |
| rollNumber | String | optional | Roll number |
| parentOf | Array | optional | Children (for parents) |
| emergencyContact | Object | optional | Emergency contact info |

**Indexes**:
- `{ schoolId: 1, role: 1 }` - Find users by school and role
- `{ schoolId: 1, studentId: 1 }` - Find students by ID
- `{ role: 1, isActive: 1 }` - Find active users by role

**Virtuals**:
- `school` - Populate school reference
- `class` - Populate class reference

**Instance Methods**:
- `comparePassword(candidatePassword)` - Verify password against hash

**Static Methods**:
- `findByRole(role)` - Get users by role
- `findBySchool(schoolId)` - Get users by school
- `findSchoolAdmins(schoolId)` - Get school administrators

**Pre-save Middleware**:
- Hash password using bcrypt (salt rounds from env or 10)

**Pre-find Middleware**:
- Filter out inactive users by default (can be overridden)

---

#### `backend/src/models/Homework.js`
**Purpose**: Homework assignments with attachments and submission tracking

**Schema Fields**:
| Field | Type | Description |
|-------|------|-------------|
| title | String | Assignment title |
| description | String | Assignment details |
| subject | String | Subject name |
| classId | ObjectId | Target class |
| schoolId | ObjectId | Multi-tenant isolation |
| dueDate | Date | Submission deadline |
| attachments | Array | File attachments |
| maxMarks | Number | Maximum score |
| createdBy | ObjectId | Teacher who created |
| status | String | Draft/Published |

**Indexes**:
- `{ schoolId: 1, classId: 1, dueDate: -1 }` - Class homework by date
- `{ schoolId: 1, createdBy: 1 }` - Teacher's assignments

---

#### `backend/src/models/ReportCard.js`
**Purpose**: Digital report cards with subject-wise marks and grades

**Schema Structure**:
```javascript
{
  student: ObjectId,           // Student reference
  schoolId: ObjectId,          // Multi-tenant isolation
  term: String,                // Term 1, Term 2, Annual, etc.
  academicYear: String,        // YYYY-YYYY format
  subjects: [{
    subjectName: String,
    marksObtained: Number,
    totalMarks: Number,
    grade: String,
    remarks: String
  }],
  totalPercentage: Number,     // Auto-calculated
  overallGrade: String,
  rank: Number,
  totalStudents: Number,
  attendance: {
    present: Number,
    total: Number,
    percentage: Number
  },
  teacherRemarks: String,
  principalRemarks: String,
  isPublished: Boolean,
  publishedAt: Date
}
```

**Auto-calculations**:
- `totalPercentage` - Calculated from subject marks on save
- Subject `percentage` - Virtual for each subject

**Indexes**:
- `{ student: 1, academicYear: 1, term: 1 }`
- `{ schoolId: 1, academicYear: 1, term: 1 }`
- `{ schoolId: 1, isPublished: 1 }`

**Static Methods**:
- `findByStudent(studentId)` - Get all report cards for student
- `findBySchoolAndTerm(schoolId, year, term)` - Get term report cards
- `findLatest(studentId)` - Get most recent report card

---

#### `backend/src/models/MediaGallery.js`
**Purpose**: Photos and videos with categories and tagging

**Schema Fields**:
| Field | Type | Description |
|-------|------|-------------|
| title | String | Media title (2-200 chars) |
| category | String | Event Photos, Sports Day, Annual Day, etc. |
| mediaType | String | Image or Video |
| url | String | Media URL (validated) |
| description | String | Optional description (max 1000 chars) |
| eventDate | Date | Date of event |
| schoolId | ObjectId | Multi-tenant isolation |
| uploadedBy | ObjectId | User who uploaded |
| tags | Array | Search tags |
| isPublished | Boolean | Visibility status |
| fileSize | Number | Size in bytes |
| duration | Number | Video duration in seconds |
| thumbnailUrl | String | Thumbnail for videos |

**Indexes**:
- `{ schoolId: 1, category: 1 }`
- `{ schoolId: 1, mediaType: 1 }`
- `{ schoolId: 1, isPublished: 1, eventDate: -1 }`

**Static Methods**:
- `findByCategory(schoolId, category)` - Filter by category
- `findRecent(schoolId, limit)` - Get recent media
- `findByDateRange(schoolId, start, end)` - Date-based filtering

---

### 3. Middleware

#### `backend/src/middleware/authMiddleware.js`
**Purpose**: JWT token verification and user payload extraction

**Exports**:
- `authenticate(req, res, next)` - Required authentication
- `optionalAuth(req, res, next)` - Optional authentication
- `generateToken(user)` - Create JWT token
- `refreshToken(req)` - Generate new token for authenticated user

**Token Structure**:
```javascript
{
  userId: string,
  email: string,
  role: string,
  schoolId: string
}
```

**Token Expiry**: `JWT_EXPIRES_IN` from environment (default: 7 days)

**Authentication Flow**:
1. Extract `Authorization: Bearer <token>` header
2. Verify token using `JWT_SECRET`
3. Fetch user from MongoDB (ensure active)
4. Attach `req.user` with user data
5. Call `next()` or return error

**Error Codes**:
- `NO_TOKEN` - No authorization header
- `INVALID_TOKEN_FORMAT` - Malformed token
- `INVALID_TOKEN` - Invalid or expired token
- `TOKEN_EXPIRED` - Token has expired
- `AUTH_ERROR` - Internal authentication error

**`req.user` Object**:
```javascript
{
  id: string,
  email: string,
  name: string,
  role: string,
  schoolId: string,
  studentId: string,    // For students
  classId: string,      // For students
  rollNumber: string    // For students
}
```

---

#### `backend/src/middleware/rbacMiddleware.js`
**Purpose**: Role-Based Access Control and multi-tenant data isolation

**Exports**:

##### `verifyRole(allowedRoles)`
Middleware factory that returns a role checker.

**Usage**:
```javascript
router.get('/admin-only', verifyRole(['Super Admin', 'School Admin']), handler);
```

**Predefined Checkers**:
- `requireSuperAdmin` - Super Admin only
- `requireSchoolAdmin` - School Admin only
- `requireTeacher` - Teacher only
- `requireStudent` - Student only
- `requireParent` - Parent only
- `requireAdmin` - Super Admin or School Admin
- `requireStaff` - Super Admin, School Admin, or Teacher

**Error Response** (403 Forbidden):
```javascript
{
  success: false,
  error: {
    message: 'Insufficient permissions...',
    code: 'FORBIDDEN',
    requiredRoles: [...],
    userRole: 'string'
  }
}
```

##### `enforceSchoolIsolation(schoolIdField)`
Middleware that ensures users can only access their own school's data.

**Usage**:
```javascript
router.get('/students', enforceSchoolIsolation('schoolId'), handler);
// Or multiple fields:
router.get('/data', enforceSchoolIsolation(['schoolId', 'tenantId']), handler);
```

**Logic**:
1. Super Admin bypasses all checks
2. Other roles must have `req.user.schoolId`
3. Check if requested school ID matches user's school ID
4. Search in `req.params`, `req.body`, and `req.query`

**Error Response** (403 Forbidden):
```javascript
{
  success: false,
  error: {
    message: 'Access denied. You can only access resources belonging to your school.',
    code: 'SCHOOL_MISMATCH',
    userSchoolId: 'string',
    requestedSchoolId: 'string'
  }
}
```

##### `addSchoolContext()`
Middleware that automatically adds user's schoolId to query parameters.

**Usage**:
```javascript
router.get('/data', addSchoolContext(), handler);
```

**Effect**: Adds `req.query.schoolId = req.user.schoolId` if not present

---

### 4. Controllers

#### `backend/src/controllers/superAdminController.js`
**Purpose**: System-wide operations for Super Admin

**Functions**:

##### `registerSchool(req, res, next)`
**Endpoint**: `POST /api/super-admin/schools`

**Request Body**:
```javascript
{
  schoolName: string,
  schoolCode: string,
  address: string,
  contactEmail: string,
  contactPhone: string,
  subscriptionExpiry: string,  // Optional
  adminName: string,
  adminEmail: string,
  adminPassword: string,
  adminPhone: string           // Optional
}
```

**Process**:
1. Validate all required fields
2. Check for duplicate school code
3. Check for duplicate admin email
4. Hash admin password
5. Create school and admin in transaction
6. Return created resources

**Response** (201 Created):
```javascript
{
  success: true,
  data: {
    school: { id, schoolName, schoolCode, ... },
    admin: { id, name, email, role, ... }
  },
  message: 'School and admin account created successfully'
}
```

##### `getAllSchools(req, res, next)`
**Endpoint**: `GET /api/super-admin/schools`

**Query Parameters**:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search in name, code, email
- `status` - Filter by status
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - asc or desc (default: desc)

**Response** (200 OK):
```javascript
{
  success: true,
  data: {
    schools: [{ ...school, userCount }],
    pagination: { page, limit, total, pages }
  }
}
```

##### `getSchoolById(req, res, next)`
**Endpoint**: `GET /api/super-admin/schools/:id`

**Response** includes school data and stats:
- totalUsers
- admins count
- teachers count
- students count

##### `updateSchool(req, res, next)`
**Endpoint**: `PUT /api/super-admin/schools/:id`

**Immutable Fields** (removed from updates):
- `_id`, `createdAt`, `updatedAt`

##### `updateSchoolStatus(req, res, next)`
**Endpoint**: `PATCH /api/super-admin/schools/:id/status`

**Request Body**:
```javascript
{ status: 'Active' | 'Suspended' | 'Trial' }
```

##### `deleteSchool(req, res, next)`
**Endpoint**: `DELETE /api/super-admin/schools/:id`

**Process**:
1. Delete all users associated with school
2. Delete the school document

##### `getSystemStats(req, res, next)`
**Endpoint**: `GET /api/super-admin/stats`

**Response**:
```javascript
{
  success: true,
  data: {
    schools: { total, active, suspended, trial },
    users: { total, superAdmins, schoolAdmins, teachers, students, parents }
  }
}
```

---

### 5. Frontend Components

#### `frontend/src/components/Login.jsx`
**Purpose**: Modern glassmorphism login interface with role-based navigation

**State Management**:
```javascript
const [formData, setFormData] = useState({ email: '', password: '' });
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [focusedField, setFocusedField] = useState(null);
```

**API Interaction**:
```javascript
POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

**Storage**:
- `localStorage.setItem('token', token)`
- `localStorage.setItem('user', JSON.stringify(user))`

**Role-Based Navigation**:
- `SUPER_ADMIN` → `/super-admin-dashboard`
- `SCHOOL_ADMIN` or `ADMIN` → `/admin-dashboard`
- Others → `/dashboard`

**UI Features**:
- Glassmorphism card with backdrop blur
- Animated background orbs (purple, blue, indigo)
- Grid pattern overlay
- Focus state animations with scale transform
- Loading spinner on submit button
- Shimmer effect on hover
- Error display with dismiss button
- Social login buttons (demo)
- Remember me checkbox
- Forgot password link

**Validation**:
- Required email and password fields
- HTML5 email validation
- Error clearing on input change

---

#### `frontend/src/contexts/AuthContext.jsx`
**Purpose**: Centralized authentication state management with multi-tenant support

**State**:
```javascript
{
  user: null,                    // Current user object
  token: null,                   // JWT token
  currentClass: null,            // For class-based login
  isLoading: true,               // Loading state
  tenantId: null,                // Current tenant/school ID
  isTenantSuspended: false       // Tenant suspension status
}
```

**Methods**:

##### `login(usernameOrEmailOrId, password)`
- Supports email, username, or student ID login
- Saves token and user to storage
- Sets tenant ID from user data
- Clears class data if any

##### `classLogin(classCode, password)`
- Login as a class (shared account)
- Saves class data instead of user
- Clears user data if any

##### `register(name, email, password)`
- Create new user account
- Auto-login after registration

##### `logout()`
- Clear all auth data
- Clear cache for current tenant
- Notify other tabs via storage event

##### `switchTenant(newTenantId)`
- Super Admin only
- Clear cache before switching
- Update localStorage (triggers storage event)
- Clear cache for new tenant

**Multi-Tab Sync**:
- Listens to `storage` events
- Syncs tenant ID changes across tabs
- Clears auth on token removal
- Uses `tenantId` localStorage key

**Cache Management**:
- Clears tenant-specific cache on logout
- Clears cache on tenant switch
- Cache keys: products, tenants, students, teachers, classes, homework, news, exams

**Computed Properties**:
- `isAuthenticated` - Has valid token
- `isSuperAdmin` - User role is SUPER_ADMIN
- `isAdmin` - User role is ADMIN
- `isTenantAdmin` - User role is TENANT_ADMIN
- `isStudent` - User role is STUDENT
- `isTeacher` - User role is TEACHER
- `isClass` - Logged in as class

---

## Security & Multi-Tenancy

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Server validates credentials against MongoDB
3. Server generates JWT token with user data
4. Token stored in localStorage on client
5. Client includes `Authorization: Bearer <token>` in all requests
6. Server verifies token and extracts user data
7. User data attached to `req.user` for route handlers

### Multi-Tenant Isolation
1. Each school is a separate tenant with unique `schoolId`
2. All user records (except Super Admin) have `schoolId`
3. All data queries include school filter
4. `X-School-ID` header for API requests
5. RBAC middleware enforces school isolation
6. Super Admin can access all schools

### Security Headers (Helmet)
- Content Security Policy: Disabled for API
- Cross-Origin policies: Configured for development
- Other security headers: Enabled

### CORS Configuration
- Allowed origins: Configurable via `ALLOWED_ORIGINS`
- Default: localhost:5173, localhost:3001, localhost:8100
- Credentials: Enabled
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Requested-With

---

## API Reference

### Authentication Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/class-login` | No | Login with class code |
| POST | `/api/auth/register` | No | Register new user |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/logout` | Yes | Logout user |

### Super Admin Endpoints
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/super-admin/schools` | Yes | Super Admin | Register new school |
| GET | `/api/super-admin/schools` | Yes | Super Admin | List all schools |
| GET | `/api/super-admin/schools/:id` | Yes | Super Admin | Get school details |
| PUT | `/api/super-admin/schools/:id` | Yes | Super Admin | Update school |
| PATCH | `/api/super-admin/schools/:id/status` | Yes | Super Admin | Change school status |
| DELETE | `/api/super-admin/schools/:id` | Yes | Super Admin | Delete school |
| GET | `/api/super-admin/stats` | Yes | Super Admin | System statistics |

### School Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users in school |
| POST | `/api/admin/users` | Create new user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Deactivate user |
| GET | `/api/admin/classes` | List school classes |
| POST | `/api/admin/classes` | Create new class |

### Teacher Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teacher/classes` | Get assigned classes |
| GET | `/api/teacher/homeworks` | List homework assignments |
| POST | `/api/teacher/homeworks` | Create homework |
| PUT | `/api/teacher/homeworks/:id` | Update homework |
| GET | `/api/teacher/submissions` | View student submissions |
| PUT | `/api/teacher/submissions/:id/grade` | Grade submission |

### Student Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/profile` | Get student info |
| GET | `/api/student/report-cards` | View report cards |
| GET | `/api/student/homeworks` | View assignments |
| POST | `/api/student/homeworks/:id/submit` | Submit homework |
| GET | `/api/student/attendance` | View attendance |

---

## Data Flow Diagrams

### User Registration Flow (Super Admin)
```
Super Admin → POST /api/super-admin/schools
    ↓
Validate school & admin data
    ↓
Check duplicate schoolCode & adminEmail
    ↓
Start MongoDB transaction
    ↓
Create School document
    ↓
Create Admin User document
    ↓
Commit transaction
    ↓
Return school & admin data
```

### Authentication Flow
```
User → POST /api/auth/login (email, password)
    ↓
Find user by email
    ↓
Compare password with bcrypt hash
    ↓
Generate JWT token
    ↓
Return token & user data
    ↓
Client stores in localStorage
    ↓
Subsequent requests include Authorization header
    ↓
authMiddleware verifies token
    ↓
req.user populated with user data
```

### Multi-Tenant Data Access
```
Request with Authorization: Bearer <token>
    ↓
authenticate middleware verifies token
    ↓
Fetch user from MongoDB
    ↓
Attach req.user with schoolId
    ↓
enforceSchoolIsolation middleware checks
    ↓
Compare requested schoolId with req.user.schoolId
    ↓
Match → proceed
Mismatch → 403 Forbidden
```

---

## Conclusion

This documentation provides a comprehensive overview of the MACVEL School Management System architecture. The system is designed with:

1. **Security First**: JWT authentication, RBAC, multi-tenant isolation
2. **Scalability**: MongoDB for flexible data modeling, modular architecture
3. **User Experience**: Modern UI with glassmorphism, responsive design
4. **Maintainability**: Clear separation of concerns, consistent patterns

The system supports multiple user roles with appropriate permissions, ensures data isolation between schools, and provides a robust foundation for educational institution management.