# Admin News Student Visibility Fix

## Problem
Admin-published news was not appearing in the student news section, even though the backend implementation appeared correct.

## Root Cause Analysis

After thorough investigation, I identified a critical bug in the frontend's authentication flow that prevented the `tenantId` from being properly set during login.

### The Bug

The backend login endpoint (`/api/auth/login`) returns data in this structure:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "...",
    "user": { "id", "email", "name", "role", ... },
    "tenant": { "id", "name", "code", ... }
  }
}
```

But the frontend's `AuthContext.login()` function was trying to access the data at the wrong level:
```javascript
// BEFORE (incorrect)
const { user: userData, token: authToken } = response.data;
```

This would look for `user` and `token` directly in `response.data`, but they're actually nested inside `response.data.data`.

### Impact

Because of this bug:
1. `userData` was `undefined` after login
2. `authToken` was `undefined` after login  
3. The `tenantId` was never properly set
4. When students queried news, the API request had no `x-tenant-id` header or had `tenantId: null`
5. The backend query `{ tenantId: null, isPublished: true }` returned no results

## Fix Applied

### File: `frontend/src/contexts/AuthContext.jsx`

#### 1. Fixed `login()` function
```javascript
// AFTER (correct)
const { user: userData, token: authToken, tenant } = response.data.data || response.data;

// Use tenant.id from the response as the tenantId
const tenantIdValue = tenant?.id || userData.tenantId || userData.schoolId;
```

#### 2. Fixed `classLogin()` function
```javascript
// Also fixed to access nested data and set tenantId from class's tenantId
const { class: classData, token: authToken } = response.data.data || response.data;

if (classData?.tenantId) {
  setTenantIdState(classData.tenantId);
  setTenantId(classData.tenantId);
}
```

## How It Works Now

### Login Flow
1. User logs in via `/api/auth/login`
2. Backend returns `{ success, message, data: { token, user, tenant } }`
3. Frontend correctly extracts `token`, `user`, and `tenant` from `response.data.data`
4. `tenantId` is set from `tenant.id` (which is the School ObjectId)
5. The `x-tenant-id` header is included in subsequent API requests

### News Query Flow
1. Admin creates news with `tenantId: <School ObjectId>`
2. Student logs in and `tenantId` is set to the same School ObjectId
3. Student queries `/api/content/news` with `x-tenant-id: <School ObjectId>`
4. Backend's `protectContent` middleware sets `req.user.tenantId` from `user.schoolId._id`
5. Content controller queries News with `{ tenantId: <School ObjectId>, isPublished: true, ... }`
6. News documents match and are returned to the student

## Testing Checklist

1. **Clear browser storage** (important to reset any cached state):
   - Clear localStorage and sessionStorage
   - Or use Incognito/Private mode

2. **Login as admin**:
   - Create a news item with visibility: 'ALL'
   - Verify news is created successfully

3. **Login as student**:
   - Navigate to `/student/news`
   - Verify admin-published news appears in the list

4. **Test different scenarios**:
   - School-wide news (no classId) with visibility: 'ALL' → Should appear
   - Class-specific news with visibility: 'ALL' → Should appear for students in that class
   - News with visibility: 'TEACHERS_ONLY' → Should NOT appear for students

## Files Modified

- `frontend/src/contexts/AuthContext.jsx` - Fixed login and classLogin functions to properly extract data from nested response structure and set tenantId correctly

## Related Components

The fix ensures proper interaction between:
- **Backend**: `/api/auth/login` (auth.js) - Returns nested data structure
- **Backend**: `/api/content/news` (content.js → contentController.js) - Uses tenantId for filtering
- **Backend**: News Model (MongoDB) - Stores news with tenantId
- **Frontend**: AuthContext - Manages authentication state and tenantId
- **Frontend**: API Service - Includes x-tenant-id header in requests
- **Frontend**: Student News List - Fetches and displays news