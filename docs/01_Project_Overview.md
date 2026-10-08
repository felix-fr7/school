# 01 Project Overview

## MACVEL School Management System

### 1. Project Purpose

MACVEL School Management System is a multi-tenant SaaS platform that digitises the day-to-day operations of schools. It connects every stakeholder of a school — Super Admin, School Admin, Teachers, Students and Class Monitors — through role-specific portals in a single ecosystem.

**Tagline:** *Smart. Secure. Connected.*

The application combines:

- Secure role-based authentication (Email / Student ID / Class Code login)
- Multi-school (multi-tenant) data isolation
- Class, Student and Teacher management
- Homework assignment, submission and grading
- Exams, Exam Schedules, Marks and Report Cards
- Weekly lesson planning (classwork / homework diary)
- Timetable grid (subject × day)
- News, Circulars, Gallery, Albums, Videos and Messages
- Academic calendar and school contacts
- File uploads (PDF / images) with Cloudinary storage
- Custom portal branding (logo, headings for web and mobile)

### 2. Project Objective

The main objective of MACVEL is to replace registers, notice boards and scattered spreadsheets with one secure digital system that helps schools:

- Manage multiple schools from a single Super Admin console
- Give each school a fully isolated data workspace (tenant isolation)
- Let admins manage classes, students, teachers and subjects quickly
- Let teachers publish homework, circulars and lesson plans instantly
- Let students view homework, exams, marks, timetable and report cards anywhere
- Let class monitors (class-code login) maintain their own class records
- Publish school news and circulars to everyone in real time
- Keep a secure, auditable record of academic performance

### 3. Users & Roles

| # | Role | Access Level | Portal |
|---|------|--------------|--------|
| 1 | Super Admin | All schools (tenants), platform stats, branding | Web (Admin portal) |
| 2 | School Admin | Single school — classes, students, teachers, content | Web (Admin portal) |
| 3 | Teacher | Assigned classes — homework, circulars, submissions | Web / Mobile |
| 4 | Student | Own data — homework, exams, marks, timetable, report cards | Web / Mobile |
| 5 | Class Monitor (Class Login) | One class via class code — class records, bulk student import | Web / Mobile |

### 4. Functional Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | Authentication & Profiles | Register, login (email or student ID), class-code login, JWT sessions, password change, profile update |
| 2 | Super Admin Console | School (tenant) CRUD, subscription/status control, admins per school, platform statistics |
| 3 | School Admin Portal | Dashboard, classes, students, teachers, subjects, contacts, exams, report cards, albums, calendar |
| 4 | Teacher Portal | Dashboard, my classes, students, homework + grading, circulars |
| 5 | Student Portal | Dashboard, homework submission, exams, marks, timetable, profile, report cards, news |
| 6 | Class Controller | Class dashboard, student CRUD with bulk import, homework, exams, schedules, subjects |
| 7 | Content & Communication | News, circulars, gallery, albums, videos, messages, posts |
| 8 | Academics | Exams, exam schedules, marks, report cards (manual + PDF/image upload), weekly lessons |
| 9 | Timetable | Weekly subject × day grid with classwork/homework cells, publish workflow |
| 10 | Calendar & Contacts | Academic calendar events per role, school contact directory |
| 11 | Media & Files | Multer uploads with Cloudinary storage (local `./uploads` fallback) |
| 12 | Portal Branding | Logo, heading and mobile branding customisation (public GET before login) |

### 5. Supported Platforms

- **Web Browsers** — Chrome, Edge, Firefox, Safari (responsive layout), deployed on Vercel
- **Android** — Capacitor native wrapper (`mobile/` project)
- **iOS** — Capacitor native wrapper (`mobile/` project)
- **Backend API** — REST API accessible from any HTTP client (port 3000)

### 6. Document Index

| Section | Document |
|---------|----------|
| 01 | Project Overview |
| 02 | Requirements |
| 03 | UI / UX |
| 04 | Technical Documentation |
| 05 | API Documentation |
| 06 | Database |
| 07 | Testing |
| 08 | Deployment |
| 09 | Development Log |
| 10 | Release Notes |

---

**Document Version:** 1.0
**Prepared by:** MACVEL Development Team
**Last Updated:** 2026-10-06
