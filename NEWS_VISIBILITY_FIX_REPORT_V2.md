# News Visibility Fix Report - Version 2

## Problem
Admin published news was still not showing in the student news section, even after the previous tenantId fix.

## Root Cause Analysis

After investigating, I found a **second bug** in the `contentController.js` file's `getNews` function.

### The Bug

In the original code (lines 33-51), there was a logic error where MongoDB query conditions were being overwritten:

```javascript
// First, for students, set visibility filtering
if (userRole === 'Student') {
  query.$or = [
    { visibility: { $exists: false } },
    { visibility: null },
    { visibility: 'ALL' }
  ];
}

// Then, if student has a classId, OVERWRITE the $or condition
if ((userRole === 'Student' || userRole === 'Teacher' || userRole === 'CLASS_CONTROLLER') && userClassId) {
  query.$or = [
    ...(query.$or || []),  // This spread doesn't work as expected when query.$or is being replaced
    { classId: null },
    { classId: { $exists: false } },
    { classId: userClassId }
  ];
}
```

**The Problem**: When a student with a classId queried for news, the second `$or` assignment completely replaced the first one, losing the visibility filtering logic. This caused the query to not match any news items properly.

### How News Creation Works

When an admin creates news:
1. The `adminContentController.createNews` function sets:
   - `tenantId` from the admin's account (line 134, 192)
   - `visibility` defaults to `'ALL'` (line 161)
   - `isPublished: true` (line 198)
   - `classId` is null for school-wide news (line 197)

### How News Fetching Should Work

When a student fetches news:
1. The `contentController.getNews` function should:
   - Filter by `tenantId` (to show only their school's news)
   - Filter by `isPublished: true` (only published news)
   - For students: Only show news with `visibility: 'ALL'` (or null/undefined for legacy)
   - For students with a class: Also show class-specific news for their class

## Solution

Rewrote the query building logic to properly combine visibility and class isolation conditions:

```javascript
// Build the combined $or conditions
let orConditions = [];

if (isStudent && hasClassId) {
  // Students with a class: See school-wide news with visibility='ALL', 
  // OR their class's specific news with visibility='ALL'
  orConditions = [
    // School-wide news (no classId) with proper visibility
    {
      $and: [
        { $or: [{ classId: null }, { classId: { $exists: false } }] },
        { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
      ]
    },
    // Class-specific news for their class with proper visibility
    {
      $and: [
        { classId: userClassId },
        { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
      ]
    }
  ];
} else if (isStudent) {
  // Students without a class: See only school-wide news with visibility='ALL'
  orConditions = [
    {
      $and: [
        { $or: [{ classId: null }, { classId: { $exists: false } }] },
        { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
      ]
    }
  ];
} else if (hasClassId) {
  // Teachers/Class Controllers with a class: See school-wide news + their class's specific news
  orConditions = [
    { classId: null },
    { classId: { $exists: false } },
    { classId: userClassId }
  ];
}

if (orConditions.length > 0) {
  query.$or = orConditions;
}
```

## Files Modified

1. **`backend/src/controllers/contentController.js`**
   - Fixed `getNews` function (lines 17-95)
   - Properly combines visibility filtering with class-based isolation
   - Uses `$and` within `$or` conditions to ensure both criteria are met

## Testing Recommendations

1. **Test as Student:**
   - Log in as a student with a class
   - Navigate to `/student/news`
   - Verify that news created by admin with `visibility: 'ALL'` appears
   - Verify that school-wide news (classId: null) appears
   - Verify that class-specific news for their class appears

2. **Test News Creation:**
   - Log in as admin
   - Create a new news item with default settings (visibility: 'ALL')
   - Verify it appears in student news list

3. **Test Different Scenarios:**
   - Create news with `visibility: 'TEACHERS_ONLY'` - should NOT appear for students
   - Create news targeted to a specific class - should appear for students in that class
   - Create school-wide news (no classId) - should appear for all students

## Impact

This fix ensures that:
1. Students can now see news published by admins (when visibility is 'ALL')
2. School-wide announcements are visible to all students
3. Class-specific announcements are visible only to students in that class
4. Teachers and class controllers see appropriate content based on their role
5. Tenant isolation is maintained (students only see their school's news)

## Previous Related Fixes

This fix builds upon the previous tenantId fix in `backend/src/middleware/auth.js` which ensured that `req.user.tenantId` is properly set for all user types by using `schoolId` as a fallback.