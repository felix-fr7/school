# Test Credentials for Development

This document lists the default test credentials available in the database for testing the application.

## 📋 Available Test Accounts

### 1. Super Admin
- **Email:** `superadmin@school.com`
- **Password:** `SuperAdmin@123`
- **Role:** SUPER_ADMIN
- **Description:** Automatically created on server startup. Has full system access.

### 2. School Admin
- **Email:** `amfp.2706@gmail.com`
- **Password:** `123456`
- **Role:** ADMIN
- **Description:** Created via seed script. Can manage school operations, classes, teachers, and students.

### 3. Teacher
- **Email:** `Felix@gmail.com`
- **Password:** `123456`
- **Role:** TEACHER
- **Description:** Created via seed script. Can manage homework, marks, and view students in assigned class.

## 🌱 How to Reset/Recreate Test Users

If you need to reset the test users, run the seed script:

```bash
cd backend
npm run seed
```

This will:
- Create the Admin user (`amfp.2706@gmail.com`) if it doesn't exist
- Create the Teacher user (`Felix@gmail.com`) if it doesn't exist
- Create a test tenant (school) if it doesn't exist
- Link the Admin to the test tenant

## 🔧 Testing Different Roles

### Testing as Super Admin
Use `superadmin@school.com` / `SuperAdmin@123` to:
- Access tenant management features
- Create new schools/admins
- View system-wide statistics

### Testing as School Admin
Use `amfp.2706@gmail.com` / `123456` to:
- Create and manage classes
- Add/manage teachers and students
- Create homework and marks
- Manage school news and circulars

### Testing as Teacher
Use `Felix@gmail.com` / `123456` to:
- View assigned class and students
- Create homework assignments
- Enter student marks
- Mark attendance
- View class statistics

## 📝 Notes

- All test passwords are simple (`123456`) for development convenience
- **Never use these credentials in production**
- The Super Admin password is configured in `.env` file (`SUPER_ADMIN_PASSWORD`)
- Test users can be deleted via Prisma Studio (http://localhost:5555) if needed

## ⚠️ Known Issues with Supabase Integration

The database is connected to Supabase which has its own auth schema. This causes some limitations:

1. **TenantId Update Issue**: The Supabase `users` table has triggers that conflict with our Prisma schema's `updatedAt` column naming. This prevents the seed script from properly linking Admin/Teacher users to a tenant.

2. **Workaround**: The middleware has been relaxed to allow Admin and Teacher users without a `tenantId` to access their dashboards. They will see empty data until they create classes/students.

3. **To fully test**: Use the Super Admin account to create a new school (tenant) and then create Admin/Teacher users through the UI, which will properly associate them with the tenant.

## 🚀 Quick Start Testing

1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm start`
3. Use any of the credentials above to log in
4. Test role-specific features based on the logged-in user's role

## 🔄 Resetting the Database

If you need to completely reset the database:

```bash
cd backend
npx prisma migrate reset
npm run seed
```

This will drop and recreate all tables, then seed the test users.