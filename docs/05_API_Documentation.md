# 05 API Documentation

## MACVEL School Management System

### 1. API Overview

| Item | Value |
|------|-------|
| Base URL (dev) | `http://localhost:3000/api` |
| Health check | `GET /health` (outside `/api`) |
| Format | JSON (UTF-8) |
| Authentication | `Authorization: Bearer <JWT>` |
| Optional header | `x-tenant-id` — tenant context for scoped requests |
| Success shape | `{ "success": true, ... }` |
| Error shape | `{ "success": false, "error": { "message", "path", "method" } }` |

**Public routes (no token):** `/health`, `/api/auth/*` (login, register, class-login), `/api/super-admin/*`, `/api/superadmin/*`, `GET /api/portal-branding`. All other routes pass through the global `authenticate` middleware.

### 2. Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | No | Login with email, username or student ID + password |
| POST | `/register` | No | Register a new user |
| POST | `/class-login` | No | Login with class code + class password |
| GET | `/me` | Yes | Current user profile from token |
| PUT | `/password` | Yes | Change password |
| POST | `/logout` | Yes | Client-side logout |

**Sample request:**

```json
POST /api/auth/login
{
  "usernameOrEmailOrId": "admin@school.com",
  "password": "password123"
}
```

**Sample response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "...", "role": "School Admin", "schoolId": "..." }
}
```

### 3. Super Admin — `/api/super-admin` (alias `/api/superadmin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Platform-wide statistics |
| POST | `/schools` | Create a school (tenant) |
| GET | `/schools` | List all schools |
| GET | `/schools/:id` | School details |
| PUT | `/schools/:id` | Update school |
| PATCH | `/schools/:id/status` | Activate / suspend school |
| DELETE | `/schools/:id` | Soft-delete school |
| GET | `/schools/:schoolId/admins` | List admins of a school |
| PUT | `/schools/:schoolId/admins/:adminId` | Update school admin |
| DELETE | `/schools/:schoolId/admins/:adminId` | Remove school admin |
| POST | `/schools/:schoolId/admins/:adminId/reset-password` | Reset admin password |

### 4. Portal Branding — `/api/portal-branding`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Branding for login page (public) |
| PUT | `/` | Super Admin | Update heading / sub-heading |
| PUT | `/logo` | Super Admin | Upload web logo |
| DELETE | `/logo` | Super Admin | Remove web logo |
| PUT | `/mobile-logo` | Super Admin | Upload mobile logo |
| DELETE | `/mobile-logo` | Super Admin | Remove mobile logo |
| POST | `/reset` | Super Admin | Reset branding to defaults |
| DELETE | `/mobile` | Super Admin | Clear mobile branding |

### 5. School Admin — `/api/admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Admin dashboard metrics |
| GET | `/classes` · `/classes/:id` · `/classes/:id/dashboard` | Class list / details / dashboard |
| POST | `/classes` | Create class (auto class code) |
| PUT · DELETE | `/classes/:id` | Update / delete class |
| POST | `/classes/:id/reset-password` | Reset class login password |
| POST | `/reset-class-code-counter` | Reset class code sequence (password guarded) |
| GET | `/students` · `/students/:id` · `/students/next-id` | Student list / details / next ID |
| POST · PUT · DELETE | `/students` · `/students/:id` | Student CRUD |
| GET | `/teachers` · `/teachers/:id` · `/teachers/available` | Teacher list / details / unassigned |
| POST · PUT · DELETE | `/teachers` · `/teachers/:id` | Teacher CRUD |
| GET · POST · PUT · DELETE | `/subjects` · `/subjects/:id` | Subject CRUD |
| GET · POST · PUT · DELETE | `/contacts` · `/contacts/:id` | Contact directory CRUD |
| GET | `/exams` | Exam content list |
| POST · PUT · DELETE | `/content/exams` · `/content/exams/:id` | Exam content CRUD |

### 6. Teacher — `/api/teacher`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Teacher dashboard |
| GET | `/classes` | Assigned classes |
| GET | `/students` | Students of assigned classes |
| GET · POST · PUT · DELETE | `/homework` · `/homework/:id` | Homework CRUD |
| GET | `/homework/:id/submissions` | Submissions for a homework |
| PUT | `/homework/:id/submissions/:studentId` | Grade a submission (marks + feedback) |
| GET · POST | `/circulars` | School circulars |

### 7. Student — `/api/student`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Student dashboard |
| GET | `/timetable` | Published timetable |
| GET | `/homework` | Homework list with submission status |
| POST | `/homework/:id/submit` | Submit homework (file URL) |
| GET | `/exams` | Exam list |
| GET | `/marks` | Marks list |
| GET | `/profile` | Student profile |

### 8. Class Controller — `/api/class-controller`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Class dashboard (class code, counts) |
| GET · POST · PUT · DELETE | `/students` · `/students/:id` | Class student CRUD |
| GET | `/students/next-id` | Next auto student ID |
| PUT | `/students/:id/reset-password` | Reset student password |
| GET | `/students/bulk-import/template` | Download import template |
| POST | `/students/bulk-import` | Bulk import students (CSV/XLSX) |
| GET · POST · PUT · DELETE | `/homework` · `/homework/:id` | Class homework CRUD |
| POST · DELETE | `/upload-homework-files` · `/homework-files/:filename` | Homework file upload / delete |
| GET | `/exams` · `/exams/:id` | Class exams |
| GET | `/exam-schedules` · `/exam-schedules/:id` | Exam schedules |
| GET · POST · PUT · DELETE | `/subjects` · `/subjects/:id` | Class subjects CRUD |

### 9. Homework — `/api/homework`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/` · `/:id` | Homework CRUD (published only by default) |
| POST | `/:id/submit` | Student submission |
| POST | `/:id/check` | Teacher grading action |

### 10. Exams — `/api/exams`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/` · `/:id` | Exam CRUD |
| GET | `/schedule/:classId` | Schedule for a class |
| POST | `/:id/schedule` | Add exam schedule |
| PUT · DELETE | `/schedule/:id` | Update / delete schedule |

### 11. Timetable — `/api/timetable`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/template` | Timetable template |
| GET | `/admin/all` · `/admin/:id` | Admin list / detail |
| GET | `/` | Timetable for current class/school |
| POST · PUT · DELETE | `/` · `/:id` | Timetable CRUD |
| PATCH | `/:id/publish` | Publish / unpublish |

### 12. Content APIs

**News — `/api/news`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/` · `/:id` | News CRUD |

**Circulars — `/api/circulars`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/` · `/:id` | Circular CRUD |

**Gallery — `/api/gallery`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/` · `/:id` | Gallery item CRUD |

**Videos — `/api/videos`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` · `/:id` · `/categories/list` | Video list / detail / categories |
| GET | `/admin/all` | Admin video list |
| POST · PUT · DELETE | `/` · `/:id` | Video CRUD |

**Albums — `/api/albums`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` · `/:id` · `/categories/list` | Album list / detail / categories |
| GET | `/admin/all` · `/admin/:id` | Admin album list / detail |
| POST · PUT · DELETE | `/` · `/:id` | Album CRUD |
| POST · DELETE | `/:id/links` · `/:id/links/:linkIndex` | External links in album |

**Public content — `/api/content`** (read-only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/news` · `/news/:id` | Published news |
| GET | `/circulars` · `/circulars/:id` | Published circulars |
| GET | `/exams` · `/exams/:id` | Published exams |
| GET | `/exam-schedules` · `/exam-schedules/:id` | Published schedules |

**Admin content — `/api/admin-content`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/news` · `/news/:id` | News management with visibility rules |
| POST | `/upload` | Generic file upload |
| POST | `/upload-exam` | Exam file upload (PDF/image) |

**Posts — `/api/posts`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` · `/my-posts` · `/:id` | Post feeds |
| POST · PUT · DELETE | `/` · `/:id` | Post CRUD (own posts) |

**Messages — `/api/messages`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` · `/:id` | Inbox / message detail |
| POST · DELETE | `/` · `/:id` | Send / delete message |

### 13. Academics APIs

**Weekly Lessons — `/api/weekly-lessons`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | All lessons (school scope) |
| GET · POST · DELETE | `/teacher/weekly-lessons` · `/:id` | Teacher lesson plans |
| GET | `/student/weekly-lessons` · `/student/weekly-lessons/by-date` | Student view (by date) |

**Report Cards — `/api/reportcards`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` · `/bulk-upload` | Report card file upload (single/bulk) |
| POST · GET · PUT · DELETE | `/` · `/:id` | Report card CRUD |
| GET | `/school-info` | School details for report header |
| GET | `/by-student` | Filter by student |
| PUT | `/:id/publish` | Publish report card |
| PUT | `/class/:classId/publish-all` | Publish all for a class |
| GET | `/student/my-report-cards` | Student's own report cards |
| GET · PUT | `/student/:id` · `/student/:id/acknowledge` | View / parent acknowledgment |

**Calendar — `/api/calendar`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET · POST · PUT · DELETE | `/admin/calendar-events` · `/:id` | Admin event CRUD |
| GET | `/student/calendar-events` | Student events |
| GET | `/class-controller/calendar-events` | Class monitor events |

**Contacts — `/api/contacts`**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | School contact directory |

### 14. Profile, Files & Misc

| Mount | Method | Endpoint | Description |
|-------|--------|----------|-------------|
| `/api/profile` | GET · PUT | `/` | View / update own profile |
| `/api/files` | POST | `/upload` · `/upload-multiple` | Upload files (multer → Cloudinary/local) |
| `/api/files` | DELETE | `/:filename` | Delete uploaded file |
| `/api/school-context` | GET | `/me` | School name + logo for dashboards |
| `/api/tenants` | GET · POST | `/` | Tenant list / create |
| `/api/tenants` | GET · PUT · DELETE | `/:id` | Tenant CRUD |
| `/api/tenants` | PUT · DELETE | `/:id/logo` | Tenant logo upload / remove |
| `/api/tenants` | GET | `/:id/stats` | Tenant statistics |
| `/api/cleanup` | GET · POST | `/stats` · `/execute` | Super-admin cleanup (guarded) |
| `/api/cleanup` | GET | `/verify` | Verify cleanup results |
| `/api/products` | GET · POST · PUT · DELETE | `/` · `/:id` (legacy/demo) | Product CRUD + `/stats` |

### 15. Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Resource created |
| 204 | Success, no content (OPTIONS preflight) |
| 400 | Validation error |
| 401 | Missing / invalid token |
| 403 | Role or tenant access denied |
| 404 | Endpoint or resource not found |
| 500 | Server error (via `errorHandler`) |

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06


