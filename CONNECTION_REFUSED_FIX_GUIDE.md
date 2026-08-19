# Connection Refused Error - Troubleshooting Guide

## Problem
```
:3000/api/auth/me:1 Failed to load resource: net::ERR_CONNECTION_REFUSED
AuthContext.jsx:138 [AuthContext] getMe() threw error but stored user available, using stored data: Network Error
```

## Root Cause Analysis

The error `net::ERR_CONNECTION_REFUSED` indicates that the frontend cannot connect to the backend server on port 3000. However, the backend IS running (verified via health check). The malformed URL `:3000/api/auth/me` (missing `http://localhost`) suggests a configuration issue.

## Verification Steps Already Completed

✅ **Backend is running**: Node.js process (PID 21308) is listening on port 3000  
✅ **Health endpoint works**: `GET http://localhost:3000/health` returns 200 OK  
✅ **Auth endpoint works**: `GET http://localhost:3000/api/auth/me` returns "No token provided" (expected)  
✅ **Frontend config**: `.env` file has correct `VITE_API_URL=http://localhost:3000/api`  
✅ **Vite config**: Frontend runs on port 5173 (no port conflict)

## Possible Causes & Solutions

### 1. **Browser Context Issue** (Most Likely)
The frontend might be running in a context where `localhost` doesn't resolve to your machine.

**Solution:**
- If using **Capacitor/Ionic mobile app**: Use `http://192.168.x.x:3000/api` (your machine's IP) instead of `localhost`
- If using **web browser**: Ensure you're accessing via `http://localhost:5173` not via mobile device emulator

**To find your IP:**
```powershell
ipconfig | findstr IPv4
```

Then update `.env`:
```env
VITE_API_URL=http://YOUR_IP_HERE:3000/api
EXPO_PUBLIC_API_URL=http://YOUR_IP_HERE:3000/api
```

### 2. **Environment Variables Not Loading**
Vite might not be reading the `.env` file correctly.

**Solution:**
1. Restart the frontend dev server completely
2. Clear browser cache and localStorage
3. Check browser console for the `[API] Using base URL:` log message

**To verify:**
```javascript
// Add this temporarily to frontend/src/services/api.js
console.log('DEBUG - API_BASE_URL:', API_BASE_URL);
console.log('DEBUG - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('DEBUG - EXPO_PUBLIC_API_URL:', import.meta.env.EXPO_PUBLIC_API_URL);
```

### 3. **Firewall/Antivirus Blocking**
Windows Firewall or antivirus might be blocking the connection.

**Solution:**
- Temporarily disable Windows Firewall
- Add Node.js to firewall exceptions
- Check if port 3000 is blocked

**To check if port is accessible:**
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

### 4. **Backend Binding Issue**
The backend might be binding to IPv6 only or a specific interface.

**Current backend binding:** `0.0.0.0:3000` (all interfaces) ✅

If you see issues, check backend logs for the actual binding address.

### 5. **CORS Issues**
Although CORS is configured, there might be browser security restrictions.

**Solution:**
- Ensure you're accessing frontend from `http://localhost:5173` (not `file://` or other origins)
- Check browser console for CORS errors (different from connection refused)

### 6. **Port Already in Use**
Another process might be using port 3000 intermittently.

**Check what's using port 3000:**
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object LocalPort,State,OwningProcess,Owner
```

## Immediate Action Plan

### Step 1: Verify API URL in Browser
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs:
   - `[API] Using base URL: http://localhost:3000/api` ✅
   - If you see `:3000/api` or empty URL, there's a configuration issue

### Step 2: Test Direct Connection
Open browser and navigate to:
```
http://localhost:3000/health
```
Should return:
```json
{
  "status": "OK",
  "message": "MACVEL School Management API is running",
  "timestamp": "...",
  "version": "3.0.0"
}
```

### Step 3: Clear All Caches
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
// Then reload the page
```

### Step 4: Restart Everything
1. Stop backend server (Ctrl+C)
2. Stop frontend server (Ctrl+C)
3. Start backend: `cd backend && npm start`
4. Start frontend: `cd frontend && npm start`
5. Wait for both to fully start before testing

### Step 5: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Look for the failed `/api/auth/me` request
4. Check:
   - Request URL (should be `http://localhost:3000/api/auth/me`)
   - Status (should not be "failed" or "pending")
   - Error message

## Enhanced Debugging

I've added enhanced error logging to help diagnose the issue:

### In `frontend/src/services/api.js`:
- Logs environment variables
- Validates API_BASE_URL
- Provides detailed error messages

### In `frontend/src/contexts/AuthContext.jsx`:
- Logs full error details including error code
- Identifies if it's a network error vs connection refused
- Shows error stack trace

## Quick Fix for Development

If you need a quick workaround while debugging, you can add a proxy to `vite.config.js`:

```javascript
server: {
  port: 5173,
  host: true,
  open: true,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

Then update `.env` to use relative path:
```env
VITE_API_URL=/api
EXPO_PUBLIC_API_URL=/api
```

This makes all `/api` requests go through Vite's dev server, which proxies them to the backend.

## For Production/Deployment

When deploying, ensure:
1. Backend URL is accessible from frontend's network
2. CORS is properly configured for production domains
3. Use environment-specific `.env.production` files
4. Consider using a reverse proxy (Nginx) to serve both frontend and backend from same domain

## Summary

The error occurs because the frontend cannot reach the backend, even though it's running. The most likely cause is that the frontend is running in a context where `localhost` doesn't point to your development machine (e.g., mobile emulator, Docker container, etc.).

**Next Steps:**
1. Check browser console logs for API_BASE_URL
2. Try using your machine's IP address instead of `localhost`
3. Ensure both servers are running and accessible
4. Use the enhanced error logging to identify the exact issue

If the problem persists after trying these steps, please provide:
- Browser console logs (full output)
- Network tab screenshot showing the failed request
- Output of `Test-NetConnection -ComputerName localhost -Port 3000`