# 07 Testing

## MACVEL School Management System

### 1. Testing Approach

Testing in the current release is **manual, script-driven API testing** combined with lint checks. The repository does not yet include an automated unit-test framework (`npm test` is a placeholder that exits 0). Dedicated Node test scripts exercise real endpoints against a running server and report pass/fail in the console.

### 2. Test Environment

| Item | Value |
|------|-------|
| Runtime | Node.js 18+ (tested on v22) |
| Server | `node src/server.js` on `http://localhost:3000` |
| Database | MongoDB (local / Atlas) — `macvel_school` |
| Test client | axios (Node scripts) |
| Frontend lint | ESLint (`npm run lint` in `frontend/`) |
| API base URL | `http://localhost:3000/api` (Android emulator: `http://10.0.2.2:3000/api`) |

### 3. Test Scripts

| # | Script | Purpose | Run |
|---|--------|---------|-----|
| 1 | `test-teacher-endpoint.js` | Verifies teacher `GET /api/teacher/my-class` (404-fix regression) — login → authorised call → status assert | `node test-teacher-endpoint.js` |
| 2 | `test-weekly-lessons.js` | Full CRUD cycle for weekly lessons with TEACHER + STUDENT tokens | `node test-weekly-lessons.js` |
| 3 | `backend/scripts/test-cloudinary.js` | Cloudinary credentials & upload connectivity check | `node scripts/test-cloudinary.js` |
| 4 | `backend/scripts/test-upload-pipeline.js` | Spins a test Express app to verify `uploadSingle('file')` → URL resolution | `node scripts/test-upload-pipeline.js` |
| 5 | `backend/scripts/make-student-import-samples.js` | Generates sample CSV/XLSX files for bulk-import testing | `node scripts/make-student-import-samples.js` |
| 6 | `backend/tmp_verify.js`, `tmp_admin_timetable_check.js`, `tmp_exam_upload_check.js` | Ad-hoc verification of timetable & exam-upload fixes | `node tmp_*.js` |
| 7 | Frontend ESLint | Static analysis of `src` JSX/JS | `npm run lint` |

### 4. Manual Test Cases

#### 4.1 Authentication

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| AUTH-01 | Login with valid email + password | 200, JWT + user object returned | Pass |
| AUTH-02 | Login with student ID (e.g., `STU0001`) | 200, student token issued | Pass |
| AUTH-03 | Login with wrong password | 401, generic error message | Pass |
| AUTH-04 | Class-code login (`classCode` + password) | 200, class-scoped token | Pass |
| AUTH-05 | Access protected route without token | 401 `Unauthorized` | Pass |
| AUTH-06 | Change password via `PUT /api/auth/password` | 200, new password usable next login | Pass |
| AUTH-07 | Tampered / expired JWT | 401, token rejected | Pass |

#### 4.2 Role-Based Access Control

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| RBAC-01 | Student calls `/api/admin/classes` | 403 Forbidden | Pass |
| RBAC-02 | Teacher accesses only assigned class data | Other classes excluded | Pass |
| RBAC-03 | School Admin of school A queries school B data | Empty/denied — tenant isolation holds | Pass |
| RBAC-04 | Super Admin manages all tenants | Full access to `/api/super-admin/*` | Pass |

#### 4.3 Core CRUD

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| CRUD-01 | Create class → auto class code generated | Unique code (e.g., `GRE001`) returned | Pass |
| CRUD-02 | Create student → next student ID auto-filled | Sequential ID returned by `/students/next-id` | Pass |
| CRUD-03 | Edit / delete teacher | 200, list reflects change | Pass |
| CRUD-04 | Homework create → publish → student sees it | Published-only filter works | Pass |
| CRUD-05 | Student submits homework file | Submission status becomes `Submitted` | Pass |
| CRUD-06 | Teacher grades submission | Marks + feedback stored, status `Checked` | Pass |
| CRUD-07 | Report card create → publish → student view | Visible only after publish | Pass |

#### 4.4 Content & Media

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| MEDIA-01 | Upload news image (multer → Cloudinary) | Secure URL returned, news shows image | Pass |
| MEDIA-02 | Upload exam PDF via `/api/admin-content/upload-exam` | PDF stored and linked | Pass |
| MEDIA-03 | Cloudinary unset → local fallback | File written to `./uploads`, URL resolves | Pass |
| MEDIA-04 | Delete uploaded file | File removed from storage | Pass |

### 5. Defects Found & Fixed (Regression Log)

| Date | Defect | Fix |
|------|--------|-----|
| 2026-08-09 | Content routes failed role checks (case mismatch) | Title-Case role comparisons (`Student`, `Teacher`) |
| 2026-08-09 | Profile endpoint queried non-existent `tenantId` | Switched to `schoolId` |
| 2026-08-26 | Deep links 404 on Vercel after refresh | `vercel.json` SPA rewrites |
| 2026-09-08 | Admin delete/edit of unpublished albums/videos/homework → 404 | Query filters corrected |
| 2026-09-08 | Homework visible in admin side (business rule) | Homework feature removed from admin side |
| 2026-09-30 | Media storage dependency | Cloudinary pipeline with local fallback |

### 6. Future Testing Scope

1. Unit tests — Jest + Supertest for controllers/middleware
2. API integration suite — Newman collection exported from the endpoint tables
3. E2E tests — Cypress for login → role dashboard journeys
4. Load testing — k6 on login and list endpoints
5. Mobile testing — Capacitor device tests on Android/iOS

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
