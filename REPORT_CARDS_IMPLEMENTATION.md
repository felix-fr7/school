# Report Cards Implementation Report

## Overview
This document describes the complete implementation of the report card system for the MACVEL School Management System. The system allows teachers/admins to upload report cards (as images or PDFs) and students to view and acknowledge their report cards.

## Architecture

### Backend Components

#### 1. Database Model (`backend/src/models/ReportCard.js`)
- Extended existing ReportCard model to support file-based report cards
- Added fields:
  - `reportCardFileUrl`: URL to the uploaded file (image or PDF)
  - `reportCardFileType`: Type of file ('pdf', 'image', or null)
- Existing fields support digital report cards with marks, grades, and remarks

#### 2. Controller (`backend/src/controllers/reportCardController.js`)
- **Admin/Teacher Endpoints:**
  - `POST /api/reportcards/upload` - Upload a report card file
  - `POST /api/reportcards` - Create a digital report card with marks
  - `GET /api/reportcards` - Get all report cards (with filtering)
  - `GET /api/reportcards/:id` - Get a single report card
  - `PUT /api/reportcards/:id` - Update a report card
  - `DELETE /api/reportcards/:id` - Delete a report card

- **Student Endpoints:**
  - `GET /api/reportcards/student/my-report-cards` - Get student's own report cards
  - `GET /api/reportcards/student/:id` - Get a single report card
  - `PUT /api/reportcards/student/:id/acknowledge` - Acknowledge a report card

#### 3. Routes (`backend/src/routes/reportcards.js`)
- Configured all routes with proper authentication
- File upload middleware integrated for the upload endpoint

#### 4. Server Configuration (`backend/src/server.js`)
- Routes registered at `/api/reportcards`
- Static file serving enabled for `/uploads` directory

### Frontend Components

#### 1. API Service (`frontend/src/services/api.js`)
- **Student API (`reportCardsAPI`):**
  - `getMyReportCards(term, academicYear)` - Fetch student's report cards
  - `getReportCard(id)` - Fetch a single report card
  - `acknowledgeReportCard(id, parentSignature)` - Acknowledge a report card

- **Admin API (added to `adminAPI`):**
  - `getReportCards(params)` - Fetch report cards with filtering
  - `getReportCard(id)` - Fetch a single report card
  - `uploadReportCard(formData)` - Upload a report card file
  - `updateReportCard(id, data)` - Update a report card
  - `deleteReportCard(id)` - Delete a report card

#### 2. Student Screen (`frontend/src/screens/student/ReportCardsScreen.jsx`)
- Displays list of student's report cards
- Shows file type icon (PDF/Image), term, academic year, grade, percentage
- "View Report Card" button opens the file in a new tab
- Parent acknowledgment feature with signature input
- Pull-to-refresh functionality
- Empty state when no report cards available

#### 3. Admin Screen (`frontend/src/screens/admin/ReportCardsScreen.jsx`)
- Filter by class, term, academic year, and student name
- List view with student name, term/year, grade, and actions
- Floating action button (FAB) to upload new report cards
- Upload modal with:
  - Student selector
  - Term selector
  - Academic year selector
  - File upload (image/PDF)
  - Teacher remarks textarea
  - Principal remarks textarea
- Delete confirmation alert
- Toast notifications for success/error feedback

#### 4. Navigation
- **Student Menu:** Added "Report Cards" menu item with document icon
- **Admin Menu:** Added "Report Cards" menu item with document icon
- **App Routes:** Added routes for both admin and student report card screens

#### 5. Styling
- `frontend/src/screens/student/ReportCardsScreen.css` - Student screen styles
- `frontend/src/screens/admin/ReportCardsScreen.css` - Admin screen styles
- Consistent with existing app design patterns

## API Endpoints

### Admin/Teacher Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reportcards/upload` | Upload a report card file |
| POST | `/api/reportcards` | Create digital report card |
| GET | `/api/reportcards` | Get all report cards (filtered) |
| GET | `/api/reportcards/:id` | Get single report card |
| PUT | `/api/reportcards/:id` | Update report card |
| DELETE | `/api/reportcards/:id` | Delete report card |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reportcards/student/my-report-cards` | Get student's report cards |
| GET | `/api/reportcards/student/:id` | Get single report card |
| PUT | `/api/reportcards/student/:id/acknowledge` | Acknowledge report card |

## File Upload Details

- **Accepted file types:** Images (JPEG, PNG, GIF, WebP, SVG) and PDFs
- **Max file size:** 10MB (configurable via `MAX_FILE_SIZE` env variable)
- **Storage location:** `backend/uploads/` directory
- **File naming:** UUID-based to prevent conflicts
- **Access:** Files served via `/uploads/` static route

## Usage Flow

### Admin/Teacher Upload Flow
1. Navigate to Admin > Report Cards
2. Click the floating action button (+)
3. Select **Class** first
4. Select **Roll Number** from the list (shows roll number + student name)
5. System auto-selects the student based on roll number
6. Select term and academic year
7. Upload report card file (image or PDF)
8. Optionally add teacher and principal remarks
9. Click "Upload Report Card"
10. Report card is published and visible to the student

### Student View Flow
1. Navigate to Student > Report Cards
2. View list of available report cards
3. Click "View Report Card" to open the file
4. Optionally click "Acknowledge" and enter parent signature
5. Acknowledged report cards show a green badge

## Database Schema

```javascript
{
  student: ObjectId,           // Reference to User (Student)
  schoolId: ObjectId,          // Reference to School (Tenant)
  term: String,                // Term 1, Term 2, etc.
  academicYear: String,        // Format: YYYY-YYYY
  subjects: [SubjectSchema],   // Array of subject marks (optional)
  totalPercentage: Number,     // Overall percentage
  overallGrade: String,        // Overall grade (A+, B, etc.)
  rank: Number,                // Class rank (optional)
  totalStudents: Number,       // Total students in class
  attendance: Object,          // Attendance details
  pdfReportUrl: String,        // URL to PDF report (legacy)
  reportCardFileUrl: String,   // URL to uploaded file (NEW)
  reportCardFileType: String,  // 'pdf', 'image', or null (NEW)
  teacherRemarks: String,      // Teacher comments
  principalRemarks: String,    // Principal comments
  parentAcknowledgment: Boolean, // Acknowledged by parent
  parentSignature: String,     // Parent's name as signature
  isPublished: Boolean,        // Published status
  publishedAt: Date,           // Publication date
  issuedDate: Date,            // Issue date
  createdAt: Date,             // Auto-generated
  updatedAt: Date              // Auto-generated
}
```

## Testing

### Manual Testing Checklist
- [x] Admin can upload a report card file
- [x] Admin can view all report cards
- [x] Admin can filter report cards by class, term, year
- [x] Admin can delete a report card
- [x] Student can view their report cards
- [x] Student can open/view report card file
- [x] Student can acknowledge a report card
- [x] File upload validates file type (image/PDF only)
- [x] Navigation menu shows Report Cards option

### API Testing
```bash
# Get student's report cards
GET /api/reportcards/student/my-report-cards
Authorization: Bearer <student_token>

# Upload report card (multipart/form-data)
POST /api/reportcards/upload
Authorization: Bearer <admin_token>
FormData:
  - studentId: <student_id>
  - term: "Term 1"
  - academicYear: "2024-2025"
  - reportCardFile: <file>
  - teacherRemarks: "Good progress"

# Acknowledge report card
PUT /api/reportcards/student/:id/acknowledge
Authorization: Bearer <student_token>
Body:
  - parentSignature: "John Doe"
```

## Security Considerations

1. **Authentication Required:** All endpoints require valid JWT token
2. **Student Isolation:** Students can only access their own report cards
3. **Tenant Isolation:** Schools can only access their own data
4. **File Type Validation:** Only images and PDFs are accepted
5. **File Size Limits:** Configurable max file size (default 10MB)

## Future Enhancements

1. **Bulk Upload:** Upload multiple report cards via CSV
2. **Email Notifications:** Notify parents when report cards are published
3. **Digital Signature:** Support for digital parent signatures
4. **Report Card Templates:** Pre-designed templates for generated PDFs
5. **Grade Analytics:** Dashboard for grade trends and statistics
6. **Export Options:** Download report cards as PDF

## Files Modified/Created

### Backend
- `backend/src/models/ReportCard.js` - Modified (added file fields)
- `backend/src/controllers/reportCardController.js` - Created
- `backend/src/routes/reportcards.js` - Created
- `backend/src/server.js` - Modified (added routes)

### Frontend
- `frontend/src/services/api.js` - Modified (added API methods)
- `frontend/src/screens/student/ReportCardsScreen.jsx` - Created
- `frontend/src/screens/student/ReportCardsScreen.css` - Created
- `frontend/src/screens/admin/ReportCardsScreen.jsx` - Created
- `frontend/src/screens/admin/ReportCardsScreen.css` - Created
- `frontend/src/App.jsx` - Modified (added routes)
- `frontend/src/components/StudentMenu.jsx` - Modified (added menu item)
- `frontend/src/components/AdminMenu.jsx` - Modified (added menu item)

## Conclusion

The report card system is fully implemented and ready for use. It provides a complete solution for:
- Uploading and managing report cards (images/PDFs)
- Student viewing and acknowledgment
- Admin filtering and management
- Secure file storage and access

The implementation follows the existing patterns in the codebase and integrates seamlessly with the multi-tenant architecture.