# "Send Report Card" Feature Implementation

## Overview
Added a "Send Report Card" option that allows admins to send all pending report cards to students of a specific class at once. The feature is accessible from two locations:
1. **Classes List Screen** - Direct "Send Report Card" button (green send icon) for each class
2. **Class Detail Screen** - "Send All (X)" button in the Report Cards section

## Problem Statement
The user requested a 'Send Report Card' option in the class dashboard that sends report cards correctly only to the students of that particular class. Previously, report cards had to be sent one by one.

## Solution
Implemented a bulk "Send All" feature that:
1. Identifies all students in a specific class
2. Finds all unpublished report cards for those students
3. Publishes all found report cards in a single operation
4. Provides feedback on how many report cards were sent

## Files Modified

### Backend

#### 1. `backend/src/controllers/reportCardController.js`
Added new function `publishAllReportCardsForClass`:
- Takes a class ID as parameter
- Queries StudentProfile to get all students in that class
- Finds all unpublished report cards for those students
- Publishes all found report cards (sets `isPublished = true`, `publishedAt` and `issuedDate` to current date)
- Returns count of published report cards

**Endpoint**: `PUT /api/reportcards/class/:classId/publish-all`

#### 2. `backend/src/routes/reportcards.js`
Added new route:
```javascript
router.put('/class/:classId/publish-all', publishAllReportCardsForClass);
```

### Frontend

#### 3. `frontend/src/services/api.js`
Added new API function:
```javascript
async publishAllReportCardsForClass(classId) {
  const response = await api.put(`/reportcards/class/${classId}/publish-all`);
  return response.data;
}
```

#### 4. `frontend/src/screens/admin/ClassDetailScreen.jsx`
- Added state for "Send All" confirmation alert
- Added `handleSendAll` function to handle bulk publishing
- Added "Send All (X)" button in the Report Cards section header (only visible when there are pending report cards)
- Added confirmation alert dialog for "Send All" action

#### 5. `frontend/src/screens/admin/ClassDetailScreen.css`
Added styles for:
- `.section-header-actions` - Container for action buttons in section header
- `.send-all-btn` - Styling for the "Send All" button

#### 6. `frontend/src/screens/admin/ClassesListScreen.jsx`
- Added "Send Report Card" button (green send icon) for each class in the list
- Added confirmation dialog before sending
- Added toast notifications for success/error feedback

#### 7. `frontend/src/screens/admin/ClassesListScreen.css`
Added styles for:
- `.action-btn-small.send-btn` - Green styled button for sending report cards

## How It Works

### Option 1: From Classes List
1. Admin navigates to `/admin/classes` (Classes & Sections page)
2. Each class card shows action buttons including a green "Send Report Card" button (send icon)
3. Clicking the button opens a confirmation dialog
4. Confirming sends all pending report cards to students in that class
5. A toast notification shows the result

### Option 2: From Class Detail Screen
1. Admin navigates to a class detail page (e.g., `/admin/classes/CLASS_ID`)
2. The page shows report cards for that specific class only
3. If there are pending (unpublished) report cards, a "Send All (X)" button appears in the Report Cards section header
4. Clicking "Send All" opens a confirmation dialog showing the number of pending report cards
5. Confirming sends all pending report cards to students in that class
6. A toast notification shows the result
7. The page refreshes to show updated counts

## Key Features

1. **Class-Specific Targeting**: Only sends report cards to students enrolled in the selected class
2. **Safety Confirmation**: Requires confirmation before sending all report cards
3. **Visual Feedback**: Shows count of pending report cards in the button
4. **Error Handling**: Proper error messages when no students or no pending report cards exist
5. **Atomic Operation**: All report cards are published in a single batch operation
6. **Two Access Points**: Available from both classes list and class detail screen

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Successfully sent X report card(s) to students in this class",
  "data": {
    "publishedCount": X,
    "studentCount": Y
  }
}
```

### Error Responses
- `400`: Class ID is required
- `404`: No students found in this class OR No unpublished report cards found for this class

## Testing Recommendations

1. Create a class with multiple students
2. Upload report cards for some students (they should be unpublished)
3. Navigate to the classes list page
4. Verify "Send Report Card" button (green send icon) appears for the class
5. Click the button and confirm
6. Verify toast notification shows success with count
7. Verify all report cards are published
8. Verify students can see their published report cards
9. Test edge cases:
   - Class with no students
   - Class with students but no report cards
   - Class with only published report cards
10. Also test from the class detail screen