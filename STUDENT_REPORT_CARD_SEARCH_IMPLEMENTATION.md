# Student Report Card Search Feature Implementation

## Overview
Implemented a new feature that allows admins to search for a student by name and/or roll number to retrieve all report cards created for that student.

## Changes Made

### 1. Backend API

#### New Endpoint
- **Route**: `GET /api/reportcards/by-student?name=xxx&rollNumber=xxx`
- **File**: `backend/src/routes/reportcards.js`
- **Controller**: `backend/src/controllers/reportCardController.js`

#### Controller Function: `getReportCardsByStudent`
```javascript
/**
 * Get report cards by student name and roll number
 * This endpoint allows admin to search for a student by name and roll number
 * and retrieve all report cards created for that student
 * GET /api/reportcards/by-student?name=xxx&rollNumber=xxx
 */
exports.getReportCardsByStudent = async (req, res, next) => {
  // Validates input (at least name or rollNumber required)
  // Finds student by name (case-insensitive regex) and/or exact roll number
  // Returns all report cards for that student with student info
}
```

**Features:**
- Search by name only, roll number only, or both
- Name search is case-insensitive (partial match)
- Roll number search is exact match
- Returns student info (name, email, roll number) with all report cards
- Multi-tenant secure (filters by schoolId)
- Bypasses pre-find hooks to show all report cards (published and unpublished)

### 2. Frontend API Service

#### New Method in `adminAPI`
```javascript
async getReportCardsByStudent(name, rollNumber) {
  const response = await api.get('/reportcards/by-student', {
    params: { name, rollNumber }
  });
  return response.data;
}
```

**File**: `frontend/src/services/api.js`

### 3. New Frontend Screen

#### StudentReportCardSearchScreen
- **File**: `frontend/src/screens/admin/StudentReportCardSearchScreen.jsx`
- **CSS**: `frontend/src/screens/admin/StudentReportCardSearchScreen.css`

**Features:**
- Clean, modern UI with search inputs for name and roll number
- Real-time validation
- Loading states with spinner
- Error handling with user-friendly messages
- Displays student info card with avatar and details
- Shows count of report cards found
- Lists all report cards with:
  - Term and academic year
  - Published/Draft status badge
  - File preview (image or PDF icon)
  - Subjects table with marks and grades
  - Overall percentage and grade
  - Teacher and principal remarks
  - View file button
  - Sent date (if published)

### 4. Routing

#### App.jsx
- Added import for `StudentReportCardSearchScreen`
- Added route: `/admin/report-cards/search`

#### AdminMenu.jsx
- Added new menu item: "Search Report Cards"
- Icon: `searchOutline`
- Path: `/admin/report-cards/search`

## Usage

1. Admin logs into the system
2. Navigate to "Search Report Cards" from the admin menu (or go to `/admin/report-cards/search`)
3. Enter student name and/or roll number
4. Click "Search"
5. View all report cards for that student

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "student": {
      "_id": "student_id",
      "name": "Student Name",
      "email": "student@email.com",
      "rollNumber": "001"
    },
    "reportCards": [
      {
        "_id": "report_card_id",
        "student": "student_id",
        "schoolId": "school_id",
        "term": "Term 1",
        "academicYear": "2025-2026",
        "subjects": [...],
        "totalPercentage": 85.5,
        "overallGrade": "A1",
        "teacherRemarks": "Excellent performance",
        "principalRemarks": "Keep it up",
        "isPublished": true,
        "publishedAt": "2025-01-15T10:00:00.000Z",
        "issuedDate": "2025-01-15T10:00:00.000Z",
        "reportCardFileUrl": "url_to_file",
        "reportCardFileType": "pdf",
        "createdAt": "2025-01-15T09:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

### Error Response (Student Not Found)
```json
{
  "success": false,
  "error": {
    "message": "Student not found with the provided name and roll number"
  }
}
```

### Error Response (Missing Parameters)
```json
{
  "success": false,
  "error": {
    "message": "Student name or roll number is required"
  }
}
```

## Testing

To test the feature:

1. **Backend Test** - Use Postman/curl:
```bash
curl -X GET "http://localhost:3000/api/reportcards/by-student?name=John&rollNumber=001" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

2. **Frontend Test**:
   - Navigate to `/admin/report-cards/search`
   - Enter a student name that exists in the system
   - Click Search
   - Verify the student info and report cards are displayed correctly

## Files Modified/Created

### Modified Files:
1. `backend/src/controllers/reportCardController.js` - Added `getReportCardsByStudent` function
2. `backend/src/routes/reportcards.js` - Added new route
3. `frontend/src/services/api.js` - Added `getReportCardsByStudent` method to `adminAPI`
4. `frontend/src/App.jsx` - Added route and import
5. `frontend/src/components/AdminMenu.jsx` - Added menu item

### New Files:
1. `frontend/src/screens/admin/StudentReportCardSearchScreen.jsx`
2. `frontend/src/screens/admin/StudentReportCardSearchScreen.css`

## Security Considerations

- Requires admin authentication
- Multi-tenant isolation (users can only see students from their school)
- Input validation on both frontend and backend
- SQL injection protection (using MongoDB queries with proper escaping)

## Future Enhancements

1. Add pagination for students with many report cards
2. Add filters for term/academic year in the search results
3. Add export functionality (download all report cards as PDF)
4. Add print functionality for individual report cards