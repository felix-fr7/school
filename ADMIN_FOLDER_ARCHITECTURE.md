# Admin Folder Architecture Documentation

## Overview

The `frontend/src/screens/admin/` folder contains all administrative interface screens for the School Management System. These screens enable school administrators to manage classes, teachers, students, homework, news/announcements, circulars, and exam schedules.

**Total Files:** 44 files (22 `.tsx` screens + 22 `.css` stylesheets)

---

## File Hierarchy & Responsibilities

### Dashboard & Navigation
| File | Responsibility |
|------|---------------|
| `DashboardScreen.tsx` | Main admin landing page with stats overview and module navigation |
| `PlaceholderScreen.tsx` | Generic placeholder for unimplemented screens |

### Class Management
| File | Responsibility |
|------|---------------|
| `ClassesListScreen.tsx` | List all classes with CRUD operations |
| `ClassDashboardScreen.tsx` | Detailed view of a specific class with metrics, homework, exams |
| `CreateClassScreen.tsx` | Form to create new class |
| `EditClassScreen.tsx` | Form to edit existing class details |

### Teacher Management
| File | Responsibility |
|------|---------------|
| `TeachersListScreen.tsx` | List all teachers with search/filter |
| `TeacherDetailScreen.tsx` | View/edit individual teacher details |
| `CreateTeacherScreen.tsx` | Form to create new teacher |
| `EditTeacherScreen.tsx` | Form to edit teacher details |

### Student Management
| File | Responsibility |
|------|---------------|
| `StudentsListScreen.tsx` | List all students with pagination & search |
| `CreateStudentScreen.tsx` | Form to create single student manually |
| `EditStudentScreen.tsx` | Form to edit student details |
| `BulkUploadStudentsScreen.tsx` | CSV bulk import interface |
| `AddStudentScreen.tsx` | Alternative student creation flow |

### Content Management
| File | Responsibility |
|------|---------------|
| `HomeworkListScreen.tsx` | Placeholder (uses PlaceholderScreen) |
| `CreateHomeworkScreen.tsx` | Form to create homework assignments |
| `NewsListScreen.tsx` | Placeholder (uses PlaceholderScreen) |
| `AdminNewsScreen.tsx` | Full news/announcement management with visibility targeting |
| `CircularsListScreen.tsx` | List circulars |
| `CreateCircularScreen.tsx` | Form to create circulars |
| `AdminCircularsScreen.tsx` | Full circular management interface |

### Exam Management
| File | Responsibility |
|------|---------------|
| `ExamSchedulesListScreen.tsx` | List exam schedules |
| `CreateExamScheduleScreen.tsx` | Form to create exam schedules |
| `AdminExamsScreen.tsx` | Full exam timetable management with file upload |

### Design System
| File | Responsibility |
|------|---------------|
| `AdminDesignSystem.css` | Shared CSS variables, mixins, and design tokens |

---

## Screen-by-Screen Breakdown

### 1. DashboardScreen.tsx

**Purpose:** Main admin landing page with system overview

**State Variables:**
```typescript
- stats: { totalStudents, totalClasses, totalHomework, totalNews }
- loading: boolean
```

**Key Functions:**
- `fetchDashboardData()` - Fetches stats from 4 API endpoints in parallel
- `onRefresh()` - Pull-to-refresh handler
- `handleLogout()` - Logout and redirect

**API Calls:**
- `GET /api/admin/classes` - Get class count
- `GET /api/admin/students?page=1&limit=1` - Get student total
- `GET /api/admin/homework?page=1&limit=1` - Get homework total
- `GET /api/admin/news?page=1&limit=1` - Get news total

**Navigation Targets:**
- `/admin/classes`, `/admin/teachers`, `/admin/students`, `/admin/homework`
- `/admin/admin-news`, `/admin/admin-circulars`, `/admin/admin-exams`
- `/admin/teachers/create`, `/admin/classes/create`

---

### 2. ClassesListScreen.tsx

**Purpose:** CRUD interface for managing school classes

**State Variables:**
```typescript
- classes: Class[]
- loading: boolean
- refreshing: boolean
- showDeleteAlert: boolean
- classToDelete: { id, name } | null
```

**Key Functions:**
- `fetchClasses(refresh)` - Load all classes
- `handleDeleteClick(id, name)` - Show delete confirmation
- `handleDeleteConfirm()` - Execute deletion
- `formatDate(dateStr)` - Format timestamps

**API Calls:**
- `GET /api/admin/classes` - List all classes
- `DELETE /api/admin/classes/:id` - Delete class

**Navigation:**
- `/admin/classes/create` - Create new class
- `/admin/classes/:id` - View class dashboard
- `/admin/classes/:id/edit` - Edit class

---

### 3. ClassDashboardScreen.tsx

**Purpose:** Detailed view of a specific class with metrics and quick actions

**State Variables:**
```typescript
- dashboardData: ClassDashboardData | null
- loading: boolean
- refreshing: boolean
- classPassword: string
- updatingPassword: boolean
- showPasswordAlert: boolean
- alertMessage: string
- isSuccess: boolean
```

**Key Functions:**
- `fetchDashboardData()` - Load class details, metrics, recent items
- `handleUpdatePassword()` - Reset class login password
- `onRefresh()` - Pull-to-refresh

**API Calls:**
- `GET /api/admin/classes/:classId/dashboard` - Full class data
- `POST /api/admin/classes/:classId/reset-password` - Update password

**Navigation:**
- `/admin/classes` - Back to list
- `/admin/classes/:classId/edit` - Edit class
- `/admin/students?classId=:id` - View students
- `/admin/exams?classId=:id` - View exams
- `/admin/homework?classId=:id` - View homework

---

### 4. StudentsListScreen.tsx

**Purpose:** Paginated list of all students with search

**State Variables:**
```typescript
- students: User[]
- loading: boolean
- refreshing: boolean
- searchQuery: string
- pagination: { page, total, pages, limit }
- showDeleteAlert: boolean
- studentToDelete: { id, name } | null
```

**Key Functions:**
- `fetchStudents(refresh)` - Load students with pagination
- `handleDeleteClick(id, name)` - Show delete confirmation
- `handleDeleteConfirm()` - Execute deletion
- `handlePageChange(page)` - Pagination navigation

**API Calls:**
- `GET /api/admin/students?page=&limit=&search=` - List students
- `DELETE /api/admin/students/:id` - Delete student

**Navigation:**
- `/admin/students/create` - Add student
- `/admin/students/edit/:id` - Edit student
- `/admin/students/:id` - View student detail

---

### 5. TeachersListScreen.tsx

**Purpose:** Paginated list of teachers with class filtering

**State Variables:**
```typescript
- teachers: User[]
- classes: Class[]
- loading: boolean
- refreshing: boolean
- searchQuery: string
- selectedClassId: string | undefined
- pagination: { page, total, pages, limit }
- showDeleteAlert: boolean
- teacherToDelete: { id, name } | null
```

**Key Functions:**
- `fetchClasses()` - Load classes for filter dropdown
- `fetchTeachers(refresh)` - Load teachers with filters
- `handleDeleteClick(id, name)` - Show delete confirmation
- `handleDeleteConfirm()` - Execute deletion

**API Calls:**
- `GET /api/admin/classes` - For filter dropdown
- `GET /api/admin/teachers?page=&limit=&classId=&search=` - List teachers
- `DELETE /api/admin/teachers/:id` - Delete teacher

**Navigation:**
- `/admin/teachers/create` - Add teacher
- `/admin/teachers/:id` - View/edit teacher

---

### 6. AdminNewsScreen.tsx

**Purpose:** Full news/announcement management with visibility targeting

**State Variables:**
```typescript
- newsList: News[]
- classes: Class[]
- loading: boolean
- submitting: boolean
- searchQuery: string
- title, content: string
- imageFile, pdfFile: File | null
- imagePreview: string
- visibility: 'ALL' | 'SPECIFIC_CLASSES'
- selectedClassIds: string[]
- editingNewsId: string | null
- showClassSelector: boolean
- deleteId: string | null
- showAlert: boolean
```

**Key Functions:**
- `fetchData()` - Load news list and classes
- `handleImageChange()` / `handlePdfChange()` - File upload handlers
- `toggleClassSelection()` - Multi-select for target classes
- `handleSubmit()` - Create/update news
- `handleEdit()` - Load news into form for editing
- `handleDelete()` - Delete news item

**API Calls:**
- `GET /api/admin/news?page=1&limit=20` - List news
- `GET /api/admin/classes` - For class selection
- `POST /api/admin/news` - Create news
- `PUT /api/admin/news/:id` - Update news
- `DELETE /api/admin/news/:id` - Delete news

**Features:**
- Image/PDF attachment support
- Visibility targeting (ALL or SPECIFIC_CLASSES)
- Modal for class selection
- Search/filter functionality

---

### 7. AdminExamsScreen.tsx

**Purpose:** Exam timetable management with file upload

**State Variables:**
```typescript
- examList: ExamSchedule[]
- classes: Class[]
- loading: boolean
- selectedClassId: string | undefined
- activeTab: 'upload' | 'list'
- selectedFile: File | null
- filePreview: string | null
- title: string
- submitting: boolean
- showAlert: boolean
```

**Key Functions:**
- `fetchExams()` - Load exam schedules
- `fetchClasses()` - Load classes for dropdown
- `handleFileSelect()` - File upload with validation
- `handleSubmit()` - Create exam schedule
- `handleDelete()` - Delete exam
- `handleEdit()` - Update exam title/class

**API Calls:**
- `GET /api/admin/exams?page=1&limit=50` - List exams
- `GET /api/admin/classes` - For class dropdown
- `POST /api/admin/exam-schedules` (multipart) - Create exam
- `PUT /api/admin/exam-schedules/:id` - Update exam
- `DELETE /api/admin/exam-schedules/:id` - Delete exam

**Features:**
- Tab-based UI (Upload/List)
- Image preview for uploaded files
- PDF/image file type detection
- Inline edit modal

---

## API Mapping Summary

### Admin API Endpoints Used

| Endpoint | Method | Purpose | Used In |
|----------|--------|---------|---------|
| `/api/admin/classes` | GET | List all classes | Dashboard, ClassesList, TeachersList, AdminNews, AdminExams |
| `/api/admin/classes` | POST | Create class | CreateClassScreen |
| `/api/admin/classes/:id` | GET | Get class details | EditClassScreen |
| `/api/admin/classes/:id` | PUT | Update class | EditClassScreen |
| `/api/admin/classes/:id` | DELETE | Delete class | ClassesListScreen |
| `/api/admin/classes/:id/dashboard` | GET | Class dashboard data | ClassDashboardScreen |
| `/api/admin/classes/:id/reset-password` | POST | Reset class password | ClassDashboardScreen |
| `/api/admin/students` | GET | List students (paginated) | StudentsListScreen, Dashboard |
| `/api/admin/students` | POST | Create student | CreateStudentScreen |
| `/api/admin/students/:id` | PUT | Update student | EditStudentScreen |
| `/api/admin/students/:id` | DELETE | Delete student | StudentsListScreen |
| `/api/admin/teachers` | GET | List teachers (paginated) | TeachersListScreen, Dashboard |
| `/api/admin/teachers` | POST | Create teacher | CreateTeacherScreen |
| `/api/admin/teachers/:id` | PUT | Update teacher | EditTeacherScreen |
| `/api/admin/teachers/:id` | DELETE | Delete teacher | TeachersListScreen |
| `/api/admin/homework` | GET | List homework | Dashboard, HomeworkListScreen |
| `/api/admin/homework` | POST | Create homework | CreateHomeworkScreen |
| `/api/admin/news` | GET | List news | AdminNewsScreen, Dashboard |
| `/api/admin/news` | POST | Create news | AdminNewsScreen |
| `/api/admin/news/:id` | PUT | Update news | AdminNewsScreen |
| `/api/admin/news/:id` | DELETE | Delete news | AdminNewsScreen |
| `/api/admin/circulars` | GET | List circulars | AdminCircularsScreen |
| `/api/admin/circulars` | POST | Create circular | CreateCircularScreen |
| `/api/admin/exams` | GET | List exams | AdminExamsScreen |
| `/api/admin/exam-schedules` | POST | Create exam schedule | AdminExamsScreen, CreateExamScheduleScreen |
| `/api/admin/exam-schedules/:id` | PUT | Update exam | AdminExamsScreen |
| `/api/admin/exam-schedules/:id` | DELETE | Delete exam | AdminExamsScreen |

---

## Component Dependencies

### Shared Ionic Components
- `IonPage`, `IonHeader`, `IonToolbar`, `IonContent` - Layout
- `IonButton`, `IonButtons`, `IonBackButton` - Navigation
- `IonCard`, `IonCardContent`, `IonCardHeader` - Cards
- `IonList`, `IonItem` - Lists
- `IonInput`, `IonTextarea`, `IonSelect` - Form inputs
- `IonSpinner` - Loading states
- `IonAlert`, `IonModal` - Overlays
- `IonRefresher`, `IonRefresherContent` - Pull-to-refresh
- `IonIcon` - Icons from ionicons
- `IonBadge` - Badges/tags

### React Hooks Used
- `useState` - State management
- `useEffect` - Side effects/data fetching
- `useRef` - DOM references (file inputs, modals)
- `useHistory` (react-router-dom) - Navigation
- `useParams` (react-router-dom) - Route parameters

### Custom Hooks/Contexts
- `useAuth()` - Authentication context for user data and logout

### Shared CSS
- `AdminDesignSystem.css` - Design tokens, color variables, spacing
- Individual `.css` files per screen for component-specific styles

---

## Navigation Flow

```
/login → /admin/dashboard
    ├── /admin/classes
    │   ├── /admin/classes/create
    │   ├── /admin/classes/:id (ClassDashboard)
    │   │   ├── /admin/classes/:id/edit
    │   │   ├── /admin/students?classId=:id
    │   │   └── /admin/exams?classId=:id
    │   └── /admin/classes/:id/edit
    ├── /admin/teachers
    │   ├── /admin/teachers/create
    │   └── /admin/teachers/:id
    ├── /admin/students
    │   ├── /admin/students/create
    │   ├── /admin/students/edit/:id
    │   └── /admin/students/:id
    ├── /admin/homework
    │   └── /admin/homework/create
    ├── /admin/admin-news
    └── /admin/admin-exams
```

---

## State Management Patterns

### Data Fetching Pattern
```typescript
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  try {
    setLoading(true);
    const response = await adminAPI.getEndpoint();
    if (response.success && response.data) {
      setData(response.data);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### Pagination Pattern
```typescript
const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0, limit: 10 });

useEffect(() => {
  fetchItems();
}, [pagination.page, searchQuery]);

const handlePageChange = (newPage: number) => {
  if (newPage >= 1 && newPage <= pagination.pages) {
    setPagination(prev => ({ ...prev, page: newPage }));
  }
};
```

### Delete Confirmation Pattern
```typescript
const [showDeleteAlert, setShowDeleteAlert] = useState(false);
const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

const handleDeleteClick = (id: string, name: string) => {
  setItemToDelete({ id, name });
  setShowDeleteAlert(true);
};

const handleDeleteConfirm = async () => {
  const response = await adminAPI.delete(itemToDelete.id);
  if (response.success) fetchData();
  setShowDeleteAlert(false);
  setItemToDelete(null);
};
```

---

## Conclusion

The admin folder implements a comprehensive school management interface with:
- **7 main modules**: Dashboard, Classes, Teachers, Students, Homework, News, Exams
- **Consistent patterns** for CRUD operations, pagination, and search
- **Modern UI** using Ionic React components with custom styling
- **File upload support** for news attachments and exam timetables
- **Visibility targeting** for content distribution to specific classes
- **Responsive design** with pull-to-refresh and loading states