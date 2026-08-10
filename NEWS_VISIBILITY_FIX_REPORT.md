# News Visibility Fix Report

## Problem
News published by the admin was not showing in the student news section.

## Root Cause Analysis

The issue was in the `authenticate` middleware (`backend/src/middleware/auth.js`). 

### Data Model Context
- **Admin Model**: Has both `tenantId` (references Tenant) and `schoolId` (references School) fields
- **User Model** (for students/teachers): Only has `schoolId` field (references School), NO `tenantId` field
- **News Model**: Uses `tenantId` field to filter news by tenant/school

### The Bug
In the `authenticate` middleware, when setting up `req.user`, the code was:

```javascript
req.user = {
  // ...
  tenantId: user.tenantId ? user.tenantId.toString() : null,  // BUG: user.tenantId doesn't exist for User model!
  schoolId: user.schoolId ? user.schoolId.toString() : null,
  // ...
};
```

For users from the User model (students, teachers), `user.tenantId` is `undefined` because the User model doesn't have a `tenantId` field. This caused `req.user.tenantId` to be `null`.

When students queried for news via `/api/content/news`, the content controller used:
```javascript
const tenantId = req.user.tenantId;  // This was NULL!
let query = { tenantId, isPublished: true };  // Querying for tenantId: null
```

But the news was created by admins with a valid `tenantId` (from their `schoolId` or `tenantId`). So the query `tenantId: null` never matched any news items.

## Solution

Modified the `authenticate` middleware to use `schoolId` as a fallback for `tenantId`:

```javascript
// Note: For users without tenantId field (e.g., User model), use schoolId as tenantId
// This ensures consistent tenant identification across all user types
const tenantId = user.tenantId 
  ? user.tenantId.toString() 
  : (user.schoolId ? user.schoolId.toString() : null);

req.user = {
  // ...
  tenantId: tenantId,  // Now correctly set from schoolId for User model users
  schoolId: user.schoolId ? user.schoolId.toString() : null,
  // ...
};
```

## Files Modified

1. **`backend/src/middleware/auth.js`**
   - Fixed `authenticate` function (lines 97-115)
   - Fixed `optionalAuth` function (lines 345-365)

## Impact

This fix ensures that:
1. Students can now see news published by admins
2. Teachers can now see news published by admins
3. The `tenantId` is consistently set across all user types
4. All routes using the `authenticate` middleware will now have correct tenant isolation

## Testing Recommendations

1. Log in as a student and verify news appears in the student news section
2. Log in as a teacher and verify news appears
3. Create new news as an admin and verify it's visible to students/teachers
4. Verify that students from different schools don't see each other's news (tenant isolation)