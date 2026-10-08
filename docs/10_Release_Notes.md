# 10 Release Notes

## MACVEL School Management System

### Current Release — v1.0.0 (2026-09-30)

| Item | Value |
|------|-------|
| Release version | **1.0.0** (first stable release) |
| Release date | 2026-09-30 |
| Commit | `574dd4a` — "finish" (on `main`) |
| Backend package | `macvel-school-backend` v1.0.0 (health API reports `version: 3.0.0`) |
| Frontend package | `school-ionic-frontend` v2.0.0 |
| Mobile package | `school-ionic-mobile` v1.0.0 (Capacitor, `com.school.app`) |
| Node.js | ≥ 18 required |

### 1. Highlights

- **Multi-tenant SaaS** — unlimited schools with complete data isolation
- **Five role portals** — Super Admin, School Admin, Teacher, Student, Class Monitor
- **Triple login** — email, student ID, or class code + password
- **Academics suite** — homework (assign → submit → grade), exams + schedules, marks, term report cards (manual or uploaded PDF/image)
- **Weekly lesson diary** — teacher plans and student by-date views
- **Timetable grid** — subject × Mon–Sat classwork/homework with publish workflow
- **Content hub** — news, circulars, gallery, albums (with external links), videos, messages, posts
- **Cloudinary media storage** with automatic local-disk fallback
- **White-label branding** — web + mobile logo and headings, public before login

### 2. Added in v1.0.0

| Area | Features |
|------|----------|
| Auth | Register, login (email/ID), class login, JWT sessions, password change, logout |
| Super Admin | School CRUD, status/plan control, admin management, stats, cleanup tools |
| Admin | Classes (auto codes, password reset), students (next-ID), teachers, subjects, contacts, exams, report cards, albums, calendar |
| Teacher | Dashboard, homework CRUD + grading, submissions view, circulars |
| Student | Dashboard, homework submission, exams, marks, timetable, profile, report cards, news, weekly lessons |
| Class monitor | Student bulk import (CSV/XLSX template), homework, exams, subjects, timetable authoring |
| Files | Multer uploads → Cloudinary (fallback `./uploads`), exam/report/homework upload endpoints |
| Deployment | Vercel SPA hosting (`vercel.json` rewrites), Capacitor Android/iOS shells |

### 3. Fixed in v1.0.0

| Date | Fix |
|------|-----|
| 2026-08-09 | Content controller role comparisons now Title-Case (`Student`, `Teacher`) |
| 2026-08-09 | Content routes use `decoded.userId` and correct Class field names |
| 2026-08-09 | Profile endpoint uses `schoolId` instead of non-existent `tenantId` |
| 2026-08-26 | Vercel deep-link 404s resolved via SPA rewrites in `frontend/vercel.json` |
| 2026-09-08 | Admin delete/edit of unpublished albums, videos and homework no longer 404s |
| 2026-09-08 | Homework feature removed from admin side (per business rule) |
| 2026-09-25 | Album edit/delete behaviour for admins |
| 2026-09-29 | `esbuild` install script allowed for CI builds |

### 4. Known Limitations

1. **Automated tests** — no unit/E2E framework yet; testing is via manual API scripts (see 07 Testing)
2. **Homework on admin side** — intentionally hidden; admins manage homework indirectly
3. **Products module** — legacy/demo, not part of the school workflow
4. **Unmapped legacy route files** — `backend/src/routes/superadmin.js` and `utils.js` exist but are not mounted in `server.js`
5. **Offline mode** — no offline data caching in the mobile app yet
6. **Email/SMTP** — configuration present but notifications are not wired to a workflow

### 5. Upgrade / Installation Notes

```bash
# Fresh install
git clone https://github.com/felix-fr7/school.git
cd school/backend && npm install && cp .env.example .env   # set MONGODB_URI, JWT_SECRET
npm run seed:superadmin && npm start
cd ../frontend && npm install && npm run dev              # local web app
cd ../mobile && npm install && npm run build && npx cap sync android
```

- Setting `CLOUDINARY_URL` is recommended before handling real uploads in production
- Changing `JWT_SECRET` invalidates existing tokens — users must log in again

### 6. Upcoming (Planned Next)

- Automated test suite (Jest + Supertest) and CI pipeline
- Attendance module end-to-end (screen exists; API to be added)
- Push notifications for news/circulars in the mobile app
- Parent role portal and fee management
- Analytics dashboards with trend charts

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
