# 04 Technical Documentation

## MACVEL School Management System

### 1. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                           │
│  React 18 + Ionic 7 + Vite 5 (Web)  │  Capacitor (Android/iOS)│
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTPS  ·  JSON  ·  Bearer JWT
┌────────────────────────▼─────────────────────────────────────┐
│                    BACKEND API LAYER                         │
│  Node.js 18+ / Express 4  ·  Helmet  ·  CORS  ·  RBAC        │
│  JWT Auth  ·  express-validator  ·  Multer uploads           │
└────────────────────────┬─────────────────────────────────────┘
                         │  Mongoose ODM
┌────────────────────────▼─────────────────────────────────────┐
│                      DATABASE LAYER                          │
│         MongoDB (local or Atlas) — macvel_school             │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│     Cloudinary (media storage)  ·  Local ./uploads           │
└──────────────────────────────────────────────────────────────┘
```

### 2. Client Layer

**Technology:** React 18 + Ionic 7 + Vite 5 (JavaScript/JSX)

**Responsibilities:**

- Cross-platform UI rendering (web + hybrid mobile)
- Role-based routing and guard logic (`AuthContext`)
- REST API consumption via **axios** (`src/services/api.js`)
- Forms, lists, dashboards, timetable grid rendering
- School branding application (`useSchoolBranding`)

**Key directories:** `frontend/src/screens/` (admin, teacher, superadmin, classcontroller, shared), `frontend/src/components/`, `frontend/src/contexts/`, `frontend/src/services/`

### 3. Mobile Layer

**Technology:** Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`)

- Wraps the built web assets (`webDir: build`) into native Android/iOS shells (`mobile/android`, `mobile/ios`)
- App ID: `com.school.app` · App Name: `School`
- Shared React/Ionic codebase with the web client; student screens live in `mobile/student/`

### 4. Backend API Layer

**Technology:** Node.js 18+ / Express 4 (`backend/src/server.js`)

**Middleware pipeline (in order):**

| # | Middleware | Purpose |
|---|------------|---------|
| 1 | Helmet | Security headers (CSP relaxed for API use) |
| 2 | CORS | Reflects request origin, credentials allowed, preflight 204 handling; allowed headers include `Authorization`, `x-tenant-id` |
| 3 | Body parsers | `express.json` / `urlencoded` with 10 MB limit |
| 4 | Static `/uploads` | Public file serving with 1-year cache |
| 5 | `connectDB()` | MongoDB connection at startup (exits on failure) |
| 6 | Public routes | `/health`, `/api/super-admin`, `/api/auth`, `/api/portal-branding` |
| 7 | `authenticate` | JWT verification for all remaining routes |
| 8 | `verifyRole` / `enforceSchoolIsolation` | RBAC + tenant scoping (per route) |
| 9 | 404 handler | JSON `Endpoint not found` |
| 10 | `errorHandler` | Centralised JSON error responses |

**Structure:**

```
backend/src/
├── server.js          # App wiring, middleware, route mounts
├── config/            # db.js (Mongoose), cloudinary.js
├── controllers/       # Business logic (23 controllers)
├── routes/            # 32 route files (router definitions)
├── models/            # 35 Mongoose models
├── middleware/        # auth, rbac, tenant, errorHandler, fileUpload, maintenanceGuard
├── services/          # storageService (Cloudinary/local abstraction)
└── utils/             # idGenerator, cache, adminCascadeDelete, cleanup scripts
```

### 5. Database Layer

**DBMS:** MongoDB via **Mongoose 9** ODM
**Default URI:** `mongodb://localhost:27017/macvel_school` (overridable with `MONGODB_URI`, supports Atlas)
**Connection features:** 5 s server-selection timeout, 45 s socket timeout, connection reuse, error/disconnect event handling, graceful SIGINT shutdown
**Schema design:** 35 collections; all tenant-scoped documents carry `tenantId` or `schoolId` with compound indexes

### 6. External Cloud Services

- **Cloudinary** — primary media asset storage (images, PDFs, exam/report files) configured via `CLOUDINARY_URL`
- **Local disk fallback** — `backend/uploads/` (`images`, `news`, `circulars`, `homework`, `exam`, `reportcard`, `audio`, `videos`, `documents`) when Cloudinary is unset
- **Vercel** — production hosting for the web frontend

### 7. Authentication & Authorization

**Token:** JWT (HS256), expiry `JWT_EXPIRES_IN` (default 7d), sent as `Authorization: Bearer <token>`

**Claims:** `id`, `email`, `role`, `tenantId`/`schoolId`, `classId` (class login)

| Role | Scope |
|------|-------|
| Super Admin | All tenants |
| School Admin | One school |
| Teacher | Assigned classes |
| Student | Own records only |
| Class login | Single class (class code + password) |

**Password security:** bcrypt hashing (10 rounds, configurable `BCRYPT_SALT_ROUNDS`), `select: false` on password fields, login-attempt/lock fields on Admin accounts.

### 8. Request Lifecycle (Example: create homework)

1. Teacher logs in → `POST /api/auth/login` → JWT issued
2. Client calls `POST /api/homework` with Bearer token
3. `authenticate` decodes JWT → `req.user` populated
4. Route-level `verifyRole('Teacher', ...)` validates role
5. Controller validates body (express-validator / Mongoose)
6. Document saved with `schoolId`/`tenantId` of the requester
7. JSON response `{ success: true, ... }`; errors funnel to `errorHandler`

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
