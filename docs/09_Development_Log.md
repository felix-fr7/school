# 09 Development Log

## MACVEL School Management System

### 1. Project Timeline

| Item | Value |
|------|-------|
| Repository | `felix-fr7/school` (branch `main`) |
| First commit | **2026-06-28** — "first commit" |
| Latest commit | **2026-09-30** — "finish" (`574dd4a`) |
| Total commits | **80** commits over ~3 months |
| Commit style | Short milestone messages (`finish`, `fix: ...`, `feat: ...`) |

### 2. Phase-wise Development Log

#### Phase 1 — Foundation & Multi-Tenant Core (2026-06-28 → 2026-07-04, 10 commits)

| Date | Commit | Activity |
|------|--------|----------|
| 2026-06-28 | `first commit` | Repository initialisation |
| 2026-06-28 | `Add complete multi-tenant school management system` | Backend (Express + MongoDB), RBAC, tenant isolation, initial frontend |
| 2026-06-29 | `new dash` | Admin dashboard |
| 2026-06-30 | `new add student` | Student creation flow |
| 2026-07-01 | `new one of student` | Student module refinements |
| 2026-07-03 → 07-04 | `new one`, `full project` | End-to-end wiring of core modules |

#### Phase 2 — Classes, Homework & Ionic Move (2026-07-05 → 2026-07-17, 14 commits)

| Date | Activity |
|------|----------|
| 2026-07-05 → 07-06 | Class management, office-side screens |
| 2026-07-08 → 07-10 | New class flows, iteration on dashboards |
| 2026-07-12 → 07-13 | Homework module built and finished |
| 2026-07-16 | **Ionic migration** (`ionic` commit) — React + Ionic UI adopted |
| 2026-07-17 | Iteration (`newone`) |

#### Phase 3 — Super Admin & Admin Portal (2026-07-18 → 2026-08-02, 17 commits)

| Date | Activity |
|------|----------|
| 2026-07-18 → 07-19 | Super admin build + fixes |
| 2026-07-21 → 07-23 | New login flow; super admin finished |
| 2026-07-25 | Admin portal finished |
| 2026-07-30 → 07-31 | Project restructuring; final super admin |
| 2026-08-01 → 08-02 | Admin base/off iteration, new admin features |

#### Phase 4 — Student App & Mobile (2026-08-07 → 2026-08-19, 11 commits)

| Date | Activity |
|------|----------|
| 2026-08-07 → 08-08 | Student module, **mobile (Capacitor)** project |
| 2026-08-09 | Student app + 3 key fixes: Title-Case role comparisons, `decoded.userId` auth, profile `schoolId` |
| 2026-08-10 | New iteration |
| 2026-08-17 → 08-19 | Student entry flow, "student last stage" |

#### Phase 5 — Login Rework & First Deployment (2026-08-22 → 2026-08-26, 9 commits)

| Date | Activity |
|------|----------|
| 2026-08-22 → 08-24 | New login, general finish passes |
| 2026-08-26 | **Vercel deployment**: `vercel` commit, `vercel.json` added, SPA rewrites fixed, file moved to `frontend/`, redeploy triggered |

#### Phase 6 — Stabilisation, Fixes & Storage (2026-09-02 → 2026-09-30, 19 commits)

| Date | Activity |
|------|----------|
| 2026-09-02 → 09-05 | Edit-flow fixes, finish pass |
| 2026-09-08 | **3 fixes**: admin delete/edit unpublished albums/videos/homework (404s); homework feature removed from admin side; 2-bug fix |
| 2026-09-14 → 09-21 | Final testing rounds (`finel test` ×2, `new finish`) |
| 2026-09-24 → 09-25 | Album fix, new method, verification pass |
| 2026-09-27 → 09-29 | New login polish; esbuild install-script allowance for CI build |
| 2026-09-30 | **`cloudinary add`** (media storage pipeline) + final `finish` → v1.0 release |

### 3. Milestone Summary

| # | Milestone | Date Reached |
|---|-----------|--------------|
| 1 | Multi-tenant backend foundation | 2026-06-28 |
| 2 | Admin dashboard + student management | 2026-06-30 |
| 3 | Homework module complete | 2026-07-13 |
| 4 | Ionic UI migration | 2026-07-16 |
| 5 | Super Admin portal complete | 2026-07-31 |
| 6 | School Admin portal complete | 2026-07-25 |
| 7 | Student app + mobile (Capacitor) | 2026-08-08 |
| 8 | Production web deployment (Vercel) | 2026-08-26 |
| 9 | Admin content bug-fix batch | 2026-09-08 |
| 10 | Cloudinary storage integration | 2026-09-30 |
| 11 | **v1.0.0 Release** | 2026-09-30 |

### 4. Repository Structure Evolved As

```
School/
├── backend/     # Express + Mongoose API (src: config, controllers, routes, models, middleware)
├── frontend/    # React + Ionic + Vite web app (screens: admin, teacher, superadmin, classcontroller)
├── mobile/      # Capacitor wrapper + student screens (android/, ios/, student/)
├── docs/        # This documentation set (01–10) + generated PDF
└── *.js         # Standalone API test scripts
```

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
