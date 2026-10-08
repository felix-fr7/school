# 03 UI / UX

## MACVEL School Management System

### 1. Design Framework

| Aspect | Choice |
|--------|--------|
| UI Library | Ionic 7 (React) components — IonApp, IonSplitPane, IonRouterOutlet, IonPage |
| Icons | Ionicons 7 |
| Styling | Global `theme.css` + per-screen `.css` files, CSS variables, gradient cards |
| Routing | react-router-dom v5 via `@ionic/react-router` |
| State | `AuthContext` (AuthProvider / useAuth) for session, role and loading states |
| Branding | `useSchoolBranding` hook — school logo/heading pulled from portal branding API |

### 2. Navigation Model

- **Side menu (`IonSplitPane`)** — shown after login, differs per role:
  - `AdminMenu` for admin / super-admin roles
  - `TeacherMenu` for TEACHER role
  - `StudentMenu` for STUDENT role
- **Route guards** — unauthenticated users are redirected to `/login` (or `/student/login`); authenticated users land on their role home (`/admin`, `/teacher`, `/student`)
- **Loading state** — a full-screen loading indicator is shown while the auth context initialises (prevents blank-screen flashes)
- **Role detection** — normalised Title-Case role strings (`Student`, `Teacher`, `School Admin`, `Super Admin`) drive menu and route access

### 3. Screen Inventory

#### 3.1 Authentication Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| LoginScreen | `/login` | Admin / Teacher / Employee login with branded header |
| StudentLoginScreen | `/student/login` | Student login |
| RegisterScreen | `/register` | New account registration |

#### 3.2 Admin Screens (`frontend/src/screens/admin/`)

| Screen | Purpose |
|--------|---------|
| AdminDashboardScreen | School metrics dashboard |
| AdminStudentsScreen + Create/EditStudentScreen | Student list & forms |
| AdminTeachersScreen + Create/EditTeacherScreen | Teacher list & forms |
| AdminClassesScreen + Create/EditClassScreen, ClassDetailScreen | Class management |
| AdminNewsScreen, AdminCircularsScreen + CreateCircularScreen | Content publishing |
| CalendarScreen (admin) | Academic calendar events |
| AdminExamsScreen | Exam management |
| ReportCardsScreen, ReportCardViewScreen, StudentReportCardSearchScreen | Report cards |
| AdminAlbumsScreen + Create/EditAlbumScreen | Photo albums |
| AdminSettingsScreen | Settings |

#### 3.3 Super Admin Screens (`frontend/src/screens/superadmin/`)

DashboardScreen, SchoolsListScreen, SchoolDetailScreen, CreateSchoolScreen, PortalBrandingScreen

#### 3.4 Teacher Screens (`frontend/src/screens/teacher/`)

TeacherDashboardScreen, TeacherClassesScreen, TeacherAttendanceScreen, TeacherHomeworkScreen, TeacherStudentsScreen

#### 3.5 Student Screens (`mobile/student/`)

StudentDashboardScreen, StudentHomeworkScreen, StudentExamsScreen, StudentExamDetailScreen, StudentTimetableScreen, StudentMarksScreen, StudentProfileScreen, ReportCardsScreen, NewsListScreen

#### 3.6 Class Controller Screens (`frontend/src/screens/classcontroller/`)

ClassStudentsListScreen, ClassHomeworkList/Detail/EditScreen, ClassExamSchedulesListScreen, ClassExamDetailScreen, ClassNewsList/DetailScreen, ClassProfileScreen, ClassTimetableScreen

#### 3.7 Shared Screens (`frontend/src/screens/`)

NewsScreen, CircularsScreen, GalleryScreen, AlbumsScreen, VideosScreen, MessagesScreen, CalendarScreen, ContactsScreen, SettingsScreen + shared `TimetableGridTable`

### 4. UX Principles Applied

1. **Role-first design** — every user sees only the menu and screens relevant to their role; no dead-end navigation
2. **Consistent visual language** — gradient cards, emoji/ Ionicon cues, uniform list rows and detail pages across modules
3. **Feedback & safety** — confirmation dialogs before destructive actions (delete), toast/alert feedback on success and error, disabled states while saving
4. **Responsive layout** — Ionic responsive components; split-pane collapses to a hamburger menu on small screens
5. **Fast, forgiving forms** — inline validation messages, next-ID auto-fill for students, bulk import template download
6. **Brand customisation** — school logo and headings appear on login and dashboards via portal branding (works before login)
7. **Empty & loading states** — loading guards during auth init; empty-state messages when lists have no data

### 5. UI Screen Flow (Typical)

```
Login → Role detection → Role side menu + Home dashboard
   ├─ Admin: Classes → Students / Teachers / Exams / Report cards / Content
   ├─ Teacher: My classes → Homework → Submissions → Circulars
   ├─ Student: Dashboard → Homework / Exams / Marks / Timetable / Report cards
   └─ Class monitor: Class dashboard → Students (bulk import) / Homework / Timetable
```

---

**Document Version:** 1.0
**Last Updated:** 2026-10-06
