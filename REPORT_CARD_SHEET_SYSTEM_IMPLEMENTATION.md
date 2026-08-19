# Report Card Sheet System - Complete Implementation Guide

## Overview
This document explains the complete report card system that generates proper report card sheets (not file uploads) with all required information including school name, student details, subjects, marks, and automatic grade calculation.

## Key Features Implemented

### 1. **Structured Report Card Data (No File Uploads)**
- Report cards are stored as structured data in MongoDB
- Each report card contains subjects with marks, grades, and remarks
- Automatic calculation of percentages and overall grades

### 2. **School Information Integration**
- School name, address, contact details fetched from School model
- Displayed prominently on report card header
- Multi-tenant support - each school has its own data

### 3. **Student Information**
- Student name, roll number, class, and section
- Automatically populated from User and StudentProfile models
- Class information fetched from StudentProfile

### 4. **Subject Management**
- Subjects stored as array in ReportCard model
- Each subject includes:
  - Subject name
  - Maximum marks
  - Marks obtained
  - Grade (auto-calculated)
  - Remarks (auto-generated based on grade)

### 5. **Automatic Grade Calculation**
- Grades calculated based on percentage:
  - A1 (90%+): Excellent
  - A2 (80-89%): Very Good
  - B1 (70-79%): Good
  - B2 (60-69%): Above Average
  - C1 (50-59%): Average
  - C2 (40-49%): Below Average
  - D (33-39%): Needs Improvement
  - E (<33%): Fail

### 6. **Excel Bulk Upload**
- Upload marks via Excel file with format:
  ```
  | Student Name | Roll Number | Subject | Max Marks | Marks Obtained |
  ```
- System automatically:
  - Groups data by student (roll number)
  - Calculates grades for each subject
  - Calculates overall percentage and grade
  - Creates/updates report cards for all students

## Database Schema

### ReportCard Model (`backend/src/models/ReportCard.js`)
```javascript
{
  student: ObjectId,           // Reference to User
  schoolId: ObjectId,          // Reference to School
  term: String,                // Term 1, Term 2, Annual, etc.
  academicYear: String,        // Format: YYYY-YYYY
  subjects: [
    {
      subjectName: String,
      marksObtained: Number,
      totalMarks: Number,
      grade: String,
      remarks: String
    }
  ],
  totalPercentage: Number,     // Auto-calculated
  overallGrade: String,        // Auto-calculated
  teacherRemarks: String,
  principalRemarks: String,
  isPublished: Boolean,        // Controls visibility to student
  publishedAt: Date,
  issuedDate: Date
}
```

## API Endpoints

### Admin Endpoints

#### 1. Get Report Cards List
```
GET /api/reportcards?classId=xxx&term=xxx&academicYear=xxx
```
- Returns all report cards for selected filters
- Includes student and subject information

#### 2. Get Single Report Card (with school & class info)
```
GET /api/reportcards/:id
```
Response includes:
- Report card data
- School information (name, address, phone, email)
- Class information (name, section)
- Student details

#### 3. Get School Info
```
GET /api/reportcards/school-info
```
- Returns current school's information
- Used for report card generation

#### 4. Create Report Card
```
POST /api/reportcards
```
Body:
```json
{
  "studentId": "xxx",
  "term": "Term 1",
  "academicYear": "2024-2025",
  "subjects": [
    {
      "subjectName": "Mathematics",
      "marksObtained": 85,
      "totalMarks": 100
    }
  ]
}
```

#### 5. Update Report Card
```
PUT /api/reportcards/:id
```

#### 6. Delete Report Card
```
DELETE /api/reportcards/:id
```

#### 7. Bulk Upload via Excel
```
POST /api/reportcards/bulk-upload
```
Form data:
- `classId`: Class ID
- `term`: Term name
- `academicYear`: Academic year
- `excelFile`: Excel file

#### 8. Publish/Send Report Card
```
PUT /api/reportcards/:id/publish
```
- Makes report card visible to student
- Sets `isPublished: true`

#### 9. Publish All for Class
```
PUT /api/reportcards/class/:classId/publish-all
```
- Sends all unpublished report cards for a class

### Student Endpoints

#### 1. Get My Report Cards
```
GET /api/reportcards/student/my-report-cards?term=xxx&academicYear=xxx
```
- Returns only published report cards for the logged-in student

#### 2. Get Single Report Card
```
GET /api/reportcards/student/:id
```
- Returns only if report card is published and belongs to student

#### 3. Acknowledge Report Card
```
PUT /api/reportcards/student/:id/acknowledge
```
- Parent acknowledgment with optional signature

## Frontend Implementation

### Admin Report Cards Screen (`frontend/src/screens/admin/ReportCardsScreen.jsx`)
Features:
- Class, term, and academic year selection
- List view of all report cards
- Individual upload (file-based, legacy)
- Bulk upload via Excel
- Edit and delete functionality
- Publish/send to students
- Search by student name

### Report Card View Screen (`frontend/src/screens/admin/ReportCardViewScreen.jsx`)
Features:
- Displays complete report card in proper format
- School header with name, address, contact
- Student information section
- Subjects table with marks, grades, remarks
- Overall percentage and grade
- Teacher and principal remarks
- Print functionality
- Professional layout for printing

### API Service Updates (`frontend/src/services/api.js`)
Added:
- `adminAPI.getSchoolInfo()` - Fetch school information
- Enhanced `adminAPI.getReportCard()` - Now returns school and class info

## Workflow

### For Admin/Teacher:

1. **Select Class, Term, and Academic Year**
   - Navigate to Report Cards Management
   - Select class from dropdown
   - Select term (Term 1, Term 2, Annual, etc.)
   - Select academic year (2024-2025, etc.)

2. **Upload Marks via Excel (Recommended)**
   - Click "Bulk Upload" button
   - Prepare Excel file with columns:
     - Student Name
     - Roll Number
     - Subject
     - Max Marks
     - Marks Obtained
   - Upload file
   - System processes and creates report cards for all students
   - View success/failed/not found results

3. **Individual Entry (Alternative)**
   - Click "Upload Report Card" button
   - Select student from dropdown
   - Enter marks for each subject manually
   - Add teacher/principal remarks (optional)
   - Save

4. **Review and Edit**
   - View all report cards in list
   - Click "Edit" to modify remarks
   - Click "View" to see full report card
   - Click "Delete" to remove (with confirmation)

5. **Send to Students**
   - Click "Send" on individual report card
   - OR click "Send All" to publish all for the class
   - Report cards become visible to students

### For Student:

1. **View Report Cards**
   - Login to student portal
   - Navigate to Report Cards section
   - See list of all published report cards
   - Click to view full report card

2. **Acknowledge**
   - View report card
   - Provide parent acknowledgment
   - Add parent signature (optional)

## Excel Bulk Upload Format

### Required Columns:
1. **Student Name** - Full name of student
2. **Roll Number** - Must match roll number in system
3. **Subject** - Subject name (Mathematics, Science, English, etc.)
4. **Max Marks** - Maximum marks for that subject
5. **Marks Obtained** - Marks scored by student

### Example:
```
| Student Name | Roll Number | Subject      | Max Marks | Marks Obtained |
|--------------|-------------|--------------|-----------|----------------|
| John Doe     | 001         | Mathematics  | 100       | 85             |
| John Doe     | 001         | Science      | 100       | 78             |
| John Doe     | 001         | English      | 100       | 92             |
| Jane Smith   | 002         | Mathematics  | 100       | 92             |
| Jane Smith   | 002         | Science      | 100       | 88             |
```

### Processing:
1. System groups rows by roll number
2. For each student:
   - Creates array of subjects with marks
   - Calculates grade for each subject
   - Calculates overall percentage
   - Calculates overall grade
   - Creates/updates report card

3. Results:
   - Success: Report card created/updated
   - Not Found: Student roll number not in selected class
   - Failed: Error during processing

## Grade Calculation Logic

### Subject Grade:
```javascript
const percentage = (marksObtained / totalMarks) * 100;
if (percentage >= 90) grade = 'A1';
else if (percentage >= 80) grade = 'A2';
else if (percentage >= 70) grade = 'B1';
else if (percentage >= 60) grade = 'B2';
else if (percentage >= 50) grade = 'C1';
else if (percentage >= 40) grade = 'C2';
else if (percentage >= 33) grade = 'D';
else grade = 'E';
```

### Overall Grade:
```javascript
const totalObtained = sum of all marksObtained;
const totalMax = sum of all totalMarks;
const overallPercentage = (totalObtained / totalMax) * 100;
// Apply same grade logic
```

## Report Card Print Format

The report card is designed to print professionally with:
- School header with logo (if available)
- Report card title with term and year
- Student information section
- Academic performance table
- Overall results
- Teacher and principal remarks
- Signature lines
- Date of issue

Print CSS ensures:
- Proper page breaks
- Clean layout
- Professional typography
- No UI elements (buttons, etc.)

## Multi-Tenant Support

- Each school (tenant) has separate data
- School information automatically included
- Report cards isolated by `schoolId`
- Class information specific to each school

## Security

- All endpoints require authentication
- Admin can only access their school's data
- Students can only view their own report cards
- Published report cards only visible to respective students
- Parent acknowledgment tracked

## Future Enhancements

1. **Subject Management per Class**
   - Define subjects for each class
   - Reuse across report cards
   - Edit/delete subjects

2. **Grade Configuration**
   - Customizable grade boundaries
   - School-specific grading system

3. **Report Card Templates**
   - Multiple layout options
   - Custom branding

4. **Email Distribution**
   - Send report cards via email
   - PDF generation

5. **Analytics**
   - Class performance analytics
   - Subject-wise statistics
   - Trend analysis

## Troubleshooting

### Excel Upload Issues:
1. **Student not found**: Check roll number matches exactly
2. **Invalid format**: Ensure all required columns present
3. **Data type errors**: Check marks are numbers, not text

### Report Card Not Visible to Student:
1. Check `isPublished` is true
2. Verify student is logged in with correct account
3. Check academic year and term match

### School Info Not Displaying:
1. Verify school is properly configured
2. Check school document exists in database
3. Verify tenantId is set correctly

## Support

For issues or questions:
1. Check logs in backend console
2. Verify database connections
3. Check file permissions for uploads
4. Review API responses for error messages