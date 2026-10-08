# 06 Database

## MACVEL School Management System

### 1. Database Overview

| Item | Value |
|------|-------|
| DBMS | MongoDB (document store) |
| ODM | Mongoose 9 (`backend/src/config/db.js`) |
| Default database name | `macvel_school` |
| Connection URI | `MONGODB_URI` env (local `mongodb://localhost:27017/macvel_school` or MongoDB Atlas) |
| Timeouts | Server selection 5000 ms · Socket 45000 ms |
| Unicode | MongoDB UTF-8 by default — full Tamil/name support |
| Total collections | **35** Mongoose models |

**Design principles**

- **Tenant isolation** — every school-scoped document carries `tenantId` or `schoolId` (ObjectId → Tenant/School) and queries are filtered by it
- **Soft delete** — `deletedAt` / `isActive` / `isPublished` flags instead of hard deletes where audit matters
- **Compound indexes** — `(tenantId, ...)`, `(schoolId, role)`, `(student, academicYear, term)` etc. for list performance
- **Password hygiene** — `select: false` on password fields; bcrypt pre-save hashing (10 salt rounds)
- **Default filters** — `pre(/^find/)` hooks auto-filter inactive users, deleted tenants, unpublished homework

### 2. Master Collection Summary (All 35)

| # | Collection | Category | Key References | Purpose |
|---|------------|----------|----------------|---------|
| 1 | `users` | Users | schoolId, classId, createdBy | All user accounts (students, teachers, parents) with roles |
| 2 | `admins` | Users | schoolId, tenantId | Super Admin & School Admin accounts (separate for isolation) |
| 3 | `teachers` | Users | tenantId | Teacher records: qualification, subjects, teacherId |
| 4 | `studentprofiles` | Users | userId, schoolId, classId | Admission no., roll no., parent details, medical notes |
| 5 | `tenants` | Tenancy | — | Schools/organizations: code, slug, plan, limits, status |
| 6 | `schools` | Tenancy | — | School profile: name, code, address, logo, subscription |
| 7 | `classes` | Academics | tenantId, teacherId, createdBy | Class/section with auto class code + login password |
| 8 | `classsubjects` | Academics | tenantId, classId, subjectId, teacherId | Subject-teacher mapping per class |
| 9 | `subjects` | Academics | tenantId | Subject master (name, code) |
| 10 | `exams` | Academics | classId, tenantId | Exam header: name, type, dates, file |
| 11 | `examschedules` | Academics | examId, classId, tenantId | Per-subject date/time/duration/room |
| 12 | `marks` | Academics | studentId, tenantId | Marks, percentage, grade per exam type |
| 13 | `reportcards` | Academics | student, schoolId, classId | Term report cards (marks grid or uploaded file) |
| 14 | `timetables` | Academics | tenantId, classId | Subject × Mon–Sat grid with classwork/homework |
| 15 | `weeklylessons` | Academics | tenantId, classId, subjectId, teacherId | Weekly lesson plans (objectives, content, status) |
| 16 | `weeklylessonlogs` | Academics | tenantId, classId | Daily diary log: classwork/homework text |
| 17 | `homeworks` | Homework | schoolId, classId, teacher | Assignments with embedded submissions |
| 18 | `homeworksubmissions` | Homework | homeworkId, studentId, tenantId | Standalone submission records with grade/remarks |
| 19 | `news` | Content | tenantId, authorId, classId | School news with priority/visibility/publish |
| 20 | `circulars` | Content | tenantId, authorId | Official circulars with attachments |
| 21 | `classcirculars` | Content | tenantId, classId, createdBy | Class-specific circulars (circular no., issue date) |
| 22 | `announcements` | Content | tenantId, authorId | Pinned announcements with expiry & view count |
| 23 | `posts` | Content | userId, tenantId | User posts feed |
| 24 | `messages` | Content | tenantId, senderId, classId | Internal messages with read receipts |
| 25 | `mediagalleries` | Media | schoolId, uploadedBy | Gallery items (image/video) with order |
| 26 | `photoalbums` | Media | tenantId, createdBy | Album containers with cover image |
| 27 | `photos` | Media | albumId, tenantId | Photos inside albums |
| 28 | `albums` | Media | tenantId, createdBy | Content albums with external links + visibility |
| 29 | `videos` | Media | tenantId, uploadedBy | Video catalogue with category/visibility/views |
| 30 | `files` | Media | tenantId, uploadedBy | Uploaded file registry (name, mime, size, URL) |
| 31 | `calendarevents` | Calendar | schoolId, classId, createdBy | Events with visibility, recurrence, timing |
| 32 | `academiccalendars` | Calendar | tenantId | Academic calendar entries by event type/audience |
| 33 | `schoolcontacts` | Misc | tenantId | Staff contact directory (department, phone, email) |
| 34 | `portalbrandings` | Misc | updatedBy | Web/mobile logo + heading white-label settings |
| 35 | `products` | Misc | tenantId, createdBy | Legacy/demo product catalogue with stock |

### 3. Detailed Collection Schemas

#### 3.1 Collection: `users`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `_id` | ObjectId | Auto | Unique user ID |
| `name` | String | required, 2–100 chars, trim | Full name |
| `email` | String | required, unique, lowercase | Login email |
| `password` | String | required, min 6, `select: false` | Bcrypt hash (never returned) |
| `phone` | String | optional, pattern-validated | Contact number |
| `profileImage` | String | optional | Avatar URL/path |
| `role` | String | enum: Super Admin / School Admin / Teacher / Student / Parent; default `Student` | Role (auto Title-Cased) |
| `schoolId` | ObjectId → `schools` | required except Super Admin | Tenant scope |
| `isActive` | Boolean | default `true` | Soft-disable flag |
| `dateOfBirth` | Date | optional | DOB |
| `gender` | String | enum: Male / Female / Other / '' | Gender |
| `age` | Number | 0–150 | Age |
| `qualification` | String | optional | For teachers/parents |
| `address` | Object | street, city, state, zipCode, country | Address block |
| `studentId` | String | optional, indexed | Student roll/ID number |
| `createdBy` | ObjectId → `users` | indexed | Admin/class that created the record |
| `classId` | ObjectId → `classes` | optional | Assigned class (students) |
| `rollNumber` | String | optional | Class roll number |
| `admittedDate` | Date | optional | Admission date |
| `parentOf` | [ObjectId] → `users` | optional | Parent's children links |
| `emergencyContact` | Object | name, phone, relationship | Emergency contact |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Indexes:** `email` (unique) · `(schoolId, role)` · `(schoolId, studentId)` · `(role, isActive)`
**Hooks:** bcrypt pre-save hashing · `pre-find` hides inactive users by default

#### 3.2 Collection: `classes`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `name` | String | required, trim | Class name (e.g., "Grade 6") |
| `section` | String | trim | Section (A/B/…) |
| `classCode` | String | unique, uppercase, auto-generated | Class login code (e.g., `GRE001`) |
| `tenantId` | ObjectId → `tenants` | required, indexed | School scope |
| `teacherId` | ObjectId → `teachers` | indexed | Class teacher |
| `createdBy` | ObjectId → `users` | indexed | Creator (admin/teacher) |
| `password` | String | `select: false`, bcrypt pre-save | Class login password |
| `gradeLevel` | Number | 1–12 | Grade level |
| `roomNumber` | String | optional | Room |
| `capacity` | Number | default `30` | Max students |
| `academicYear` | String | optional | e.g., 2026-2027 |
| `isActive` | Boolean | default `true` | Active flag |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Indexes:** `(tenantId, name)` · `(tenantId, section)` · `classCode` (unique)
**Virtuals:** `teacher`, `studentCount`, `homeworkCount`, `examCount`

#### 3.3 Collection: `tenants`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `name` | String | required, trim | School name |
| `domainSlug` | String | required, unique, lowercase | URL slug |
| `code` | String | required, unique, uppercase | School code |
| `address` · `phone` · `email` | String | optional | Contact details |
| `schoolLogoUrl` | String | optional | Logo URL |
| `subscriptionPlan` | String | enum FREE/BASIC/PREMIUM/ENTERPRISE; default `FREE` | Plan |
| `maxUsers` | Number | default `100` | User limit |
| `maxStudents` | Number | default `1000` | Student limit |
| `status` | String | enum ACTIVE/SUSPENDED/INACTIVE; default `ACTIVE` | Tenant status |
| `settings` | Object | academicYear, timezone, language, currency, dateFormat, features | Feature flags |
| `deletedAt` | Date | soft delete | Deletion marker |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Indexes:** `(domainSlug, deletedAt)` · `(status)` · `pre-find` excludes soft-deleted tenants

#### 3.4 Collection: `admins`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `name` | String | required, 2–100 chars | Admin full name |
| `email` | String | required, unique index, lowercase | Login email |
| `password` | String | required, min 6, `select: false` | Bcrypt hash |
| `phone` · `profileImage` | String | optional | Contact / avatar |
| `role` | String | enum: Super Admin / School Admin | Admin role (Title-Case setter) |
| `schoolId` | ObjectId → `schools` | required for School Admin | Tenant scope |
| `tenantId` | ObjectId → `tenants` | optional | Alternate tenant link |
| `isActive` | Boolean | default `true` | Active flag |
| `dateOfBirth` · `gender` · `address` · `emergencyContact` | Date / String / Object | optional | Profile extras |
| `lastLogin` | Date | audit | Last login time |
| `passwordChangedAt` | Date | set on hash | Password rotation |
| `loginAttempts` | Number | default `0` | Failed-attempt counter |
| `lockUntil` | Date | optional | Account lock window |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Indexes:** `email` (unique) · `(schoolId, role)` · `(role, isActive)` · methods: `comparePassword()`, `isLocked()`

#### 3.5 Collection: `homeworks`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `title` | String | required, 2–200 chars | Homework title |
| `subject` | String | required | Subject |
| `classGrade` | String | required | Class/grade label |
| `description` | String | max 2000 chars | Instructions |
| `givenDate` | Date | required, default `Date.now` | Assigned on |
| `dueDate` | Date | required | Deadline |
| `attachments` | [String] | URL or `/uploads/...` path | Attachment files |
| `teacher` | ObjectId → `users` | required | Assigning teacher |
| `schoolId` | ObjectId → `schools` | required | Tenant scope |
| `classId` | ObjectId → `classes` | optional | Target class |
| `submissions` | [Sub-document] | embedded, default `[]` | Per-student submission |
| `— student` | ObjectId → `users` | required | Submitter |
| `— submissionFile` | String | valid URL | Submitted file |
| `— status` | String | enum Submitted/Pending/Checked; default `Pending` | Status |
| `— submittedAt` / `— checkedAt` | Date | auto on status change | Timestamps |
| `— marks` / `— maxMarks` | Number | ≥ 0 / ≥ 1 | Grading |
| `— feedback` | String | max 500 chars | Teacher feedback |
| `isPublished` | Boolean | default `false` | Students see only published |
| `maxMarks` | Number | default `100` | Total marks |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Hooks:** `pre-find` returns published homework only (bypass option for admins)
**Methods:** `addSubmission()`, `checkSubmission()`, `findByClass/Teacher/Student()`, `findUpcoming/Overdue()`

#### 3.6 Collection: `reportcards`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `student` | ObjectId → `users` | required, indexed | Student |
| `schoolId` | ObjectId → `schools` | required | Tenant scope |
| `classId` | ObjectId → `classes` | optional | Class |
| `className` · `classSection` | String | optional | Denormalised class info |
| `createdBy` · `sentBy` | ObjectId → `users` | optional | Audit refs |
| `term` | String | enum: Term 1–3, Half Yearly, Annual, Unit Test 1–3; required | Exam term |
| `academicYear` | String | required, `YYYY-YYYY` format | Academic year |
| `subjects` | [Sub-doc] | subjectName, marksObtained, totalMarks, grade, remarks | Per-subject marks |
| `totalPercentage` | Number | required, 0–100 | Overall % |
| `overallGrade` | String | required | Overall grade |
| `rank` | Number | ≥ 1, default `null` | Class rank |
| `totalStudents` | Number | optional | Batch size |
| `attendance` | Object | present, total, percentage | Attendance summary |
| `pdfReportUrl` | String | valid URL | Generated PDF link |
| `reportCardFileUrl` | String | valid URL | Uploaded PDF/image |
| `reportCardFileType` | String | enum pdf/image/null | Uploaded file type |
| `teacherRemarks` · `principalRemarks` | String | max 500 chars | Remarks |
| `parentAcknowledgment` | Boolean | default `false` | Parent confirmation |
| `parentSignature` | String | optional | Signature value |
| `isPublished` | Boolean | default `false` | Visibility flag |
| `publishedAt` · `issuedDate` | Date | optional | Publish/issue dates |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Indexes:** `(student, academicYear, term)` · `(schoolId, academicYear, term)` · `(schoolId, isPublished)` · `(student, isPublished, issuedDate)`
**Rule:** either `subjects[]` OR `reportCardFileUrl` must exist (schema validator)

#### 3.7 Collection: `timetables`

| Field | Type | Constraints / Default | Description |
|-------|------|----------------------|-------------|
| `title` | String | required, max 200 | Timetable title |
| `weekLabel` | String | max 100, default `''` | Week label |
| `description` | String | max 1000, default `''` | Notes |
| `tenantId` | ObjectId → `tenants` | required, indexed | School scope |
| `classId` | ObjectId → `classes` | required, indexed | Class scope |
| `createdBy` | Mixed | optional | Creator id |
| `createdByRole` | String | enum ADMIN/CLASS/TEACHER/OTHER; default `CLASS` | Author role |
| `rows` | [Row] | default `[]` | Grid rows |
| `— subject` | String | required, max 80 | Row subject |
| `— Monday…Saturday` | Day cell | `{ classwork: String, homework: String }` | Per-day cells |
| `isPublished` | Boolean | default `false`, indexed | Student visibility |
| `isActive` | Boolean | default `true` | Active flag |
| `createdAt` / `updatedAt` | Date | timestamps | Audit timestamps |

**Indexes:** `(tenantId, classId, isPublished)` · `(tenantId, updatedAt)` · collection name: `timetables`

### 4. Remaining Collections — Key Fields Catalog

| # | Collection | Key Fields |
|---|------------|------------|
| 1 | `teachers` | email, password, name, phone, profileImage, tenantId, teacherId, qualification, experienceYears, specialization[], dateOfBirth, gender, address, isActive, loginAttempts, lockUntil |
| 2 | `studentprofiles` | userId, schoolId, classId, admissionNumber, rollNumber, parentName, parentPhone, bloodGroup, medicalHistory |
| 3 | `schools` | schoolName, schoolCode, address, contactEmail, contactPhone, schoolLogoUrl, status, subscriptionExpiry, settings |
| 4 | `classsubjects` | tenantId, classId, subjectId, teacherId |
| 5 | `subjects` | name, code, description, tenantId, isActive |
| 6 | `exams` | name, type, classId, tenantId, startDate, endDate, isPublished, description, fileUrl, academicYear |
| 7 | `examschedules` | title, subject, examId, classId, tenantId, date, startTime, endTime, duration, roomNo, isPublished, fileUrl |
| 8 | `marks` | studentId, subject, subjectId, tenantId, marksObtained, totalMarks, percentage, grade, examType, examDate, remarks, isPublished |
| 9 | `weeklylessons` | tenantId, classId, subjectId, teacherId, weekStartDate, title, objectives, content, status |
| 10 | `weeklylessonlogs` | tenantId, classId, subject, lessonDate, classworkText, homeworkText, createdBy, updatedBy |
| 11 | `homeworksubmissions` | homeworkId, studentId, tenantId, submissionText, attachmentUrl, status, grade, remarks, gradedBy, submittedAt |
| 12 | `news` | title, content, type, tenantId, authorId, isPublished, publishedAt, imageUrl, attachmentUrl, priority, visibility, classId |
| 13 | `circulars` | title, content, tenantId, authorId, isPublished, publishedAt, imageUrl, attachmentUrl, visibility, classId, expiryDate |
| 14 | `classcirculars` | tenantId, classId, title, content, circularNo, createdBy, isPublished, issueDate |
| 15 | `announcements` | title, content, type, tenantId, authorId, targetAudience, isPublished, publishedAt, expiryDate, imageUrl, priority, isPinned, viewCount |
| 16 | `posts` | title, content, userId, tenantId, isPublished |
| 17 | `messages` | tenantId, senderId, recipientType, recipientId, classId, subject, message, attachmentUrl, isImportant, isRead, readAt |
| 18 | `mediagalleries` | title, category, mediaType, url, description, eventDate, schoolId, uploadedBy, isPublished, thumbnailUrl, order |
| 19 | `photoalbums` | tenantId, title, description, coverImageUrl, eventDate, isPublished, createdBy, isActive |
| 20 | `photos` | albumId, tenantId, imageUrl, caption, sortOrder, isActive |
| 21 | `albums` | title, description, tenantId, createdBy, visibility, isPublished, isActive, category |
| 22 | `videos` | title, description, videoUrl, thumbnailUrl, category, duration, tenantId, uploadedBy, visibility, isPublished, isActive, views |
| 23 | `files` | tenantId, fileName, originalName, mimeType, size, url, uploadedBy, isActive |
| 24 | `calendarevents` | title, description, date, endDate, eventType, color, schoolId, visibility, classId, createdBy, isPublished, isRecurring, location, startTime, endTime |
| 25 | `academiccalendars` | tenantId, title, description, eventType, startDate, endDate, isRecurring, recurringPattern, targetAudience, color, isActive |
| 26 | `schoolcontacts` | tenantId, department, name, designation, phone, email, isActive |
| 27 | `portalbrandings` | key, logoUrl, showLogo, heading, subHeading, mobileLogoUrl, mobileHeading, mobileSubHeading, showMobileLogo, updatedBy |
| 28 | `products` | tenantId, name, description, sku, price, stockQuantity, category, metadata, createdBy, isActive, deletedAt |

### 5. Entity Relationship Overview

```
tenants (schools)
   ├── classes ──────┬── users (students, classId)
   │                 ├── timetables
   │                 ├── homeworks ── embedded submissions
   │                 ├── exams ── examschedules
   │                 ├── classsubjects ── subjects
   │                 └── classcirculars / weeklylessons / weeklylessonlogs
   ├── users (teachers, admins)
   ├── marks / reportcards (student + schoolId + term)
   ├── news / circulars / announcements / albums / videos / calendar
   └── schoolcontacts / portalbrandings
```

**Cardinality notes**

- One tenant → many classes, users, content documents (1:N via `tenantId`/`schoolId`)
- One class → many students, homeworks, exams, timetables (1:N via `classId`)
- One homework → embedded submissions array (1:1 embedded, 1:N alternative in `homeworksubmissions`)
- One student → many marks, report cards, homework submissions (1:N via `student`/`studentId`)

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06




