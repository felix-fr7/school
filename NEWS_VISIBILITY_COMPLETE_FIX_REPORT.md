# News Visibility Complete Fix Report

## Problem
Admin published news was not showing in the student news section.

## Root Causes Identified

After thorough investigation, I found **TWO separate issues** causing the news visibility problem:

### Issue 1: MongoDB Query Building Bug (Backend)
**Location:** `backend/src/controllers/contentController.js` - `getNews` function

**Problem:** When students with a classId queried for news, the MongoDB `$or` conditions were being overwritten instead of combined. The visibility filtering was lost when class-based isolation was applied.

**Fix Applied:** Rewrote the query building logic to properly combine visibility and class isolation conditions using `$and` within `$or` blocks.

### Issue 2: Missing tenantId in Frontend (Frontend)
**Location:** `frontend/src/contexts/AuthContext.jsx`

**Problem:** The `tenantId` was `null` for students because:
- The User model has `schoolId` but NOT `tenantId`
- The AuthContext was only setting `tenantId` if `userData.tenantId` existed
- For students, `userData.tenantId` is undefined, so `tenantId` was never set

This caused the API requests to be made without the `x-tenant-id` header, resulting in queries like:
```javascript
let query = { tenantId: null, isPublished: true };  // No matches!
```

**Fix Applied:** Modified AuthContext to use `schoolId` as fallback for `tenantId`:
- In `login()` function: `const tenantIdValue = userData.tenantId || userData.schoolId;`
- In `initializeAuth()` function: `resolvedTenantId = finalUserData.tenantId || finalUserData.schoolId || storedTenantId;`

## Files Modified

### Backend
1. **`backend/src/controllers/contentController.js`**
   - Fixed `getNews` function (lines 17-95)
   - Properly combines visibility filtering with class-based isolation
   - Uses `$and` within `$or` conditions to ensure both criteria are met

### Frontend
2. **`frontend/src/contexts/AuthContext.jsx`**
   - Fixed `login()` function to use `schoolId` as fallback for `tenantId`
   - Fixed `initializeAuth()` function in 3 places to use `schoolId` as fallback

## How the Fix Works

### Before Fix
1. Student logs in → `tenantId` is `null`
2. Student requests `/content/news`
3. Backend query: `{ tenantId: null, isPublished: true }`
4. No news matches (admin created news with valid `tenantId`)
5. Empty response → No news shown

### After Fix
1. Student logs in → `tenantId` is set to `schoolId`
2. Student requests `/content/news` with `x-tenant-id: <schoolId>`
3. Backend query: `{ tenantId: <schoolId>, isPublished: true, $or: [...] }`
4. News matches (admin created news with same `tenantId`)
5. News returned → News shown!

## Testing Checklist

1. **Clear browser storage** (important to reset tenantId):
   - Clear localStorage and sessionStorage
   - Or use Incognito/Private mode

2. **Login as a student**:
   - Check console logs - should see `tenantId` is now set (not null)
   - Navigate to `/student/news`
   - Verify admin-published news appears

3. **Test different scenarios**:
   - School-wide news (classId: null) with visibility: 'ALL' → Should appear
   - Class-specific news with visibility: 'ALL' → Should appear for students in that class
   - News with visibility: 'TEACHERS_ONLY' → Should NOT appear for students

4. **Test as admin**:
   - Create a new news item with default settings (visibility: 'ALL')
   - Verify it appears in student news list

## Technical Details

### Data Model Context
- **Admin Model**: Has both `tenantId` and `schoolId` fields
- **User Model** (students/teachers): Only has `schoolId` field, NO `tenantId`
- **News Model**: Uses `tenantId` field to filter news by school

### Query Logic
For students with a class, the fixed query looks like:
```javascript
{
  tenantId: <schoolId>,
  isPublished: true,
  $or: [
    {
      $and: [
        { $or: [{ classId: null }, { classId: { $exists: false } }] },
        { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
      ]
    },
    {
      $and: [
        { classId: <userClassId> },
        { $or: [{ visibility: { $exists: false } }, { visibility: null }, { visibility: 'ALL' }] }
      ]
    }
  ]
}
```

This ensures:
- Only news from the student's school is shown (tenantId match)
- Only published news is shown (isPublished: true)
- Students only see news with visibility 'ALL' (not TEACHERS_ONLY)
- Students see both school-wide news and class-specific news for their class

## Previous Related Fixes

This fix builds upon the previous tenantId fix in `backend/src/middleware/auth.js` which ensured that `req.user.tenantId` is properly set for all user types by using `schoolId` as a fallback.