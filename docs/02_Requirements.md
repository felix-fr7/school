# 02 Requirements

## MACVEL School Management System

### 1. Functional Requirements

#### 1.1 Authentication & Profiles

- User registration and login with **email OR student ID** (`POST /api/auth/login`)
- **Class-code login** for class monitors (`POST /api/auth/class-login`)
- JWT session persistence with role and tenant claims
- Password change (`PUT /api/auth/password`) and logout (`POST /api/auth/logout`)
- Profile view / update for every role (`GET|PUT /api/profile`)
- Bcrypt password hashing (10 salt rounds) and account-lock fields for admins

#### 1.2 Multi-Tenancy & Super Admin

- Create, update, suspend and soft-delete schools (tenants)
- Unique school `code` and `domainSlug` per tenant
- Subscription plans (FREE / BASIC / PREMIUM / ENTERPRISE) and user limits
- Per-school admin management (create, edit, reset password, delete)
- Platform statistics, system config and DB latency monitoring
- Super-admin-only cleanup utility (stats / execute / verify)

#### 1.3 School Admin Portal

- Dashboard with school metrics
- Class management: create/update/delete, auto-generated class code, class password reset
- Student management: CRUD, next-ID generation, pagination and search
- Teacher management: CRUD, available-teacher listing
- Subject and contact directory CRUD
- Exam content management (create / publish / delete with file URL)
- Report card management: create, publish, bulk publish, PDF/image upload
- Album management (photos + external links), calendar events
- Portal branding: web logo/heading and mobile logo/heading

#### 1.4 Teacher Portal

- Dashboard, list of assigned classes and students
- Homework: create, edit, delete, publish; view submissions; grade with marks + feedback
- Circulars: create and list for the school

#### 1.5 Student Portal

- Dashboard, timetable (published only), homework list with submission (file upload)
- Exams, marks and profile
- Report cards (view + parent acknowledgment)
- News list and weekly lessons (by date)

#### 1.6 Class Controller (Class Monitor)

- Class dashboard with class code display
- Student CRUD with **next student ID** and **bulk import** (CSV/XLSX template + upload)
- Student password reset
- Homework CRUD with homework file upload/delete
- Exams and exam schedules (view), subjects CRUD
- Class timetable authoring (subject × Mon–Sat grid, classwork/homework cells) with publish

#### 1.7 Content & Communication

- News and Circulars: CRUD, image/attachment upload, visibility (all / teachers / specific class), publish flags
- Gallery and Albums: CRUD, album links, category listing
- Videos: CRUD with category, visibility and publish flags
- Messages: inbox listing, send, delete with read receipts
- Posts: create/edit/delete own posts, post statistics

#### 1.8 Media & File Uploads

- Single and multiple file uploads (`/api/files/upload`, `/upload-multiple`)
- Dedicated uploads: homework files, exam files, news images, report card PDFs
- **Cloudinary** primary storage; automatic local `./uploads` fallback when unconfigured
- Public static serving of `/uploads` with 1-year cache headers

### 2. Non-Functional Requirements

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | Security | Helmet headers, CORS allow-list, bcrypt hashing, JWT, RBAC middleware, tenant isolation middleware |
| 2 | Data Isolation | Every query scoped by `tenantId` / `schoolId` (`enforceSchoolIsolation`) |
| 3 | Availability | Health check endpoint (`/health`), graceful DB connect/disconnect handling |
| 4 | Performance | In-memory cache utilities, DB indexes on tenant + foreign keys, pagination on list APIs |
| 5 | Validation | express-validator rules on protected routes; Mongoose schema validation |
| 6 | Compatibility | Responsive web (Vite build), Android + iOS via Capacitor |
| 7 | Limits | 10 MB JSON body limit, configurable `MAX_FILE_SIZE` (default 10 MB) |
| 8 | Extensibility | Modular route/controller/model structure, feature flags in tenant settings |

### 3. Core Modules Summary

| Module Name | Purpose | Key Functions | Status |
|-------------|---------|---------------|--------|
| Auth & Profile | Identity & sessions | Register, Login (email/ID/class code), password change, profile | Completed |
| Super Admin | Platform oversight | School CRUD, stats, admins, branding, cleanup | Completed |
| Admin Portal | School management | Classes, students, teachers, subjects, contacts, exams | Completed |
| Teacher Portal | Classroom management | Homework CRUD + grading, circulars, class/student lists | Completed |
| Student Portal | Learning access | Homework submit, exams, marks, timetable, report cards | Completed |
| Class Controller | Class self-service | Student bulk import, homework, exams, subjects, timetable | Completed |
| Academics | Assessment | Exams, schedules, marks, report cards (manual + file), weekly lessons | Completed |
| Content | Communication | News, circulars, gallery, albums, videos, messages, posts | Completed |
| Timetable | Weekly plan | Subject × day grid, publish/unpublish, CSV sample | Completed |
| Calendar & Contacts | School events | Role-based calendar events, contact directory | Completed |
| Media Storage | File pipeline | Multer → Cloudinary (fallback: local disk), delete APIs | Completed |
| Portal Branding | White-label login | Web/mobile logo + headings, public GET before login | Completed |

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
