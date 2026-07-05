# Setup Guide & Troubleshooting
## School Management System - Complete Setup Instructions

### 🚨 Critical: Fixing the 404 Error

The most common issue is a **404 AxiosError** when trying to fetch class data. This happens when the frontend is pointing to an incorrect or outdated API URL.

#### Solution:

1. **Update the frontend `.env` file** (`frontend/.env`):
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

2. **Restart the Expo development server** after making changes:
   ```bash
   cd frontend
   npm start
   # Or: expo start
   ```

3. **Ensure the backend is running** on port 3000:
   ```bash
   cd backend
   npm start
   ```

---

## Complete Setup Instructions

### Prerequisites
- Node.js v18+ installed
- PostgreSQL database (Supabase or local)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. **Configure your database** in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/database"
   ```

5. **Run database migrations**:
   ```bash
   npx prisma migrate dev
   ```

6. **Start the backend server**:
   ```bash
   npm start
   ```

   You should see:
   ```
   ✅ Connected to database successfully
   🚀 Server running on port 3000
   📱 API available at http://localhost:3000/api
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

4. **Configure API URL** in `.env`:
   ```env
   # For local development:
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   
   # For remote access (ngrok):
   # EXPO_PUBLIC_API_URL=https://your-tunnel.ngrok-free.app/api
   ```

5. **Start the Expo development server**:
   ```bash
   npm start
   ```

   Then:
   - Press `w` to open in web browser
   - Scan QR code with Expo Go app on mobile
   - Press `a` for Android emulator or `i` for iOS simulator

---

## Testing the Setup

### 1. Test Backend Health Check
Open browser or use curl:
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2026-07-05T..."
}
```

### 2. Test Login
Use the default Super Admin credentials:
- **Email:** `superadmin@school.com`
- **Password:** `SuperAdmin@123`

### 3. Test Teacher Dashboard
After logging in as a teacher, the dashboard should load without 404 errors.

---

## Common Issues & Solutions

### Issue 1: 404 Error on Teacher Dashboard
**Error:** `AxiosError: Request failed with status code 404`

**Cause:** Frontend is pointing to wrong API URL (outdated ngrok URL or incorrect localhost).

**Solution:**
1. Check `frontend/.env` file
2. Ensure `EXPO_PUBLIC_API_URL=http://localhost:3000/api`
3. Restart Expo dev server
4. Ensure backend is running on port 3000

### Issue 2: Cannot Connect to Backend
**Error:** `Network Error` or `Connection Refused`

**Cause:** Backend server is not running.

**Solution:**
1. Start backend: `cd backend && npm start`
2. Check if port 3000 is available
3. Verify database connection in backend logs

### Issue 3: Login Fails with 401
**Error:** `Invalid credentials`

**Cause:** User doesn't exist or password is incorrect.

**Solution:**
1. Use correct credentials from `TEST_CREDENTIALS.md`
2. Ensure database is properly seeded
3. Check backend logs for detailed error messages

### Issue 4: CORS Errors
**Error:** `CORS policy blocked`

**Cause:** Frontend URL not allowed by backend CORS configuration.

**Solution:**
1. Check backend `.env` file
2. Set `FRONTEND_URL=http://localhost:19006` (or your Expo URL)
3. Restart backend server

### Issue 5: Database Connection Errors
**Error:** `Connection refused` or `Database not found`

**Cause:** Database URL is incorrect or database is not running.

**Solution:**
1. Verify database is running
2. Check `DATABASE_URL` in backend `.env`
3. Run migrations: `npx prisma migrate dev`

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `PUT /api/auth/password` - Update password

### Teacher Endpoints
- `GET /api/teacher/my-class` - Get teacher's assigned class
- `GET /api/teacher/students` - Get students in teacher's class
- `GET /api/teacher/homework` - Get homework list
- `POST /api/teacher/homework` - Create homework
- `GET /api/teacher/marks` - Get marks list
- `POST /api/teacher/marks` - Create marks (batch)
- `POST /api/teacher/attendance` - Mark attendance

### Admin Endpoints
- `GET /api/admin/classes` - Get all classes
- `POST /api/admin/classes` - Create class
- `GET /api/admin/students` - Get all students
- `POST /api/admin/students` - Create student
- `GET /api/admin/teachers` - Get all teachers
- `POST /api/admin/teachers` - Create teacher

### Student Endpoints
- `GET /api/student/dashboard` - Get student dashboard
- `GET /api/student/homework` - Get homework list
- `GET /api/student/marks` - Get marks with statistics
- `GET /api/student/news` - Get school news
- `GET /api/student/circulars` - Get circulars
- `GET /api/student/exam-schedules` - Get exam schedule

---

## Using ngrok for Remote Access

If you need to access the app from external devices:

1. **Install ngrok** (if not installed):
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok tunnel**:
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

4. **Update frontend `.env`**:
   ```env
   EXPO_PUBLIC_API_URL=https://abc123.ngrok-free.app/api
   ```

5. **Update backend CORS** in `.env`:
   ```env
   FRONTEND_URL=http://localhost:19006,https://abc123.ngrok-free.app
   ```

6. **Restart both servers**

---

## Default Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@school.com` | `SuperAdmin@123` |
| School Admin | `amfp.2706@gmail.com` | `123456` |
| Teacher | `Felix@gmail.com` | `123456` |

See `TEST_CREDENTIALS.md` for more details.

---

## Project Structure

```
school/
├── backend/
│   ├── src/
│   │   ├── server.js          # Main server entry point
│   │   ├── routes/            # API route definitions
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Auth, error handling
│   │   └── config/            # Database configuration
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   └── .env                   # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── screens/           # All screen components
│   │   ├── services/          # API service
│   │   ├── contexts/          # React contexts
│   │   └── types/             # TypeScript types
│   ├── App.tsx                # Main app component
│   └── .env                   # Environment variables
│
└── database/
    └── schema.sql             # Database schema reference
```

---

## Need Help?

1. Check backend console logs for detailed error messages
2. Check frontend console/metro bundler for errors
3. Verify both servers are running
4. Ensure API URL is correctly configured
5. Check network connectivity between frontend and backend

---

**Last Updated:** July 5, 2026
**Status:** ✅ Production Ready