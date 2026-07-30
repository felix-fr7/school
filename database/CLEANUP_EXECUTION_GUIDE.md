# Multi-Tenant Data Cleanup - Execution Guide

## Overview

This guide provides comprehensive instructions for safely executing the non-superadmin data cleanup operation on your multi-tenant school management platform. The cleanup process is designed to **preserve all SuperAdmin accounts and platform infrastructure** while purging all other tenant data.

## ⚠️ CRITICAL WARNINGS

**BEFORE PROCEEDING, READ AND UNDERSTAND THE FOLLOWING:**

1. **IRREVERSIBLE OPERATION**: Once executed, the cleanup **CANNOT BE UNDONE**. All non-superadmin data will be permanently deleted.

2. **BACKUP REQUIRED**: Always create a complete database backup before executing any cleanup operation.

3. **PRODUCTION IMPACT**: This operation will affect all users, tenants, and associated data except the SuperAdmin account.

4. **DOWNTIME EXPECTED**: Depending on data volume, the cleanup may cause temporary service disruption.

5. **SUPERADMIN VERIFICATION**: Ensure at least one SUPER_ADMIN user exists before proceeding. The cleanup will **ABORT** if no SuperAdmin is found.

## SuperAdmin Identification

The system identifies and preserves SuperAdmin accounts using:

| Identifier | Value |
|------------|-------|
| User Role | `SUPER_ADMIN` |
| Platform Tenant ID | `00000000-0000-0000-0000-000000000001` |

## What Gets Deleted vs Preserved

### ✅ PRESERVED (Will NOT be deleted)

| Entity | Details |
|--------|---------|
| SuperAdmin Users | All users with `role = 'SUPER_ADMIN'` |
| Platform Tenant | Tenant with `id = '00000000-0000-0000-0000-000000000001'` |
| SuperAdmin Posts | Posts created by SuperAdmin users |
| System Configuration | All system-level settings and configurations |

### ❌ DELETED (Will be purged)

| Entity | Count Preview Available |
|--------|------------------------|
| Non-SuperAdmin Users | Yes |
| Non-Platform Tenants | Yes |
| Classes | Yes |
| Homework Records | Yes |
| Marks/Grades | Yes |
| Attendance Records | Yes |
| Fee Records | Yes |
| News Articles | Yes |
| Circulars | Yes |
| Exam Schedules | Yes |
| Posts (non-superadmin) | Yes |
| Weekly Lesson Logs | Yes |

## Execution Methods

There are **two methods** to execute the cleanup:

### Method 1: SQL Script (Direct Database Execution)

**File**: `database/cleanup_non_superadmin_data.sql`

#### Step 1: Dry-Run (PREVIEW MODE)

The script defaults to dry-run mode. Execute it to see what would be deleted:

```bash
# Using psql
psql -h <host> -U <username> -d <database> -f database/cleanup_non_superadmin_data.sql

# Using Supabase SQL Editor
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Paste the script content
# 4. Click "Run"
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════════╗
║     MULTI-TENANT DATA CLEANUP - NON-SUPERADMIN PURGE        ║
╠══════════════════════════════════════════════════════════════╣
║ MODE: DRY RUN (No data will be modified)                    ║
╚══════════════════════════════════════════════════════════════╝

✅ SuperAdmin verification passed: 1 SUPER_ADMIN user(s) found
✅ Platform tenant verified: 00000000-0000-0000-0000-000000000001 exists

═══════════════════════════════════════════════════════════════
PHASE 1: ANALYZING DATA TO BE PURGED
═══════════════════════════════════════════════════════════════

📊 Non-SuperAdmin users to delete: 150
📊 Non-Platform tenants to delete: 5
📊 Classes to delete: 25
📊 Homework records to delete: 45
...

═══════════════════════════════════════════════════════════════
DRY RUN COMPLETE - No data was modified
═══════════════════════════════════════════════════════════════
```

#### Step 2: Execute Cleanup (DESTRUCTIVE)

1. Open `database/cleanup_non_superadmin_data.sql`
2. Change line 35 from:
   ```sql
   dry_run BOOLEAN := true;  -- CHANGE TO false TO EXECUTE CLEANUP
   ```
   to:
   ```sql
   dry_run BOOLEAN := false;  -- EXECUTING ACTUAL CLEANUP
   ```
3. Run the script

### Method 2: API Endpoints (Via Backend)

The backend provides three API endpoints for cleanup operations.

#### Prerequisites

1. Start the backend server
2. Authenticate as SuperAdmin to get a JWT token

#### Step 1: Get Cleanup Statistics (Dry-Run)

```bash
# Get SuperAdmin token first
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@school.com",
    "password": "your-superadmin-password"
  }'

# Use the returned token
export SUPERADMIN_TOKEN="your-jwt-token-here"

# Get cleanup statistics
curl -X GET http://localhost:3000/api/cleanup/stats \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "users": 150,
      "tenants": 5,
      "classes": 25,
      "homework": 45,
      "marks": 200,
      "attendance": 500,
      "fees": 75,
      "news": 30,
      "circulars": 15,
      "examSchedules": 20,
      "posts": 100,
      "weeklyLessonLogs": 50
    },
    "totalRecords": 1215,
    "safeguards": {
      "superAdminExists": true,
      "superAdminCount": 1,
      "platformTenantExists": true,
      "platformTenantId": "00000000-0000-0000-0000-000000000001"
    },
    "ready": true,
    "message": "System is ready for cleanup. SuperAdmin account will be preserved."
  }
}
```

#### Step 2: Execute Cleanup

```bash
curl -X POST http://localhost:3000/api/cleanup/execute \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": {
      "weeklyLessonLogs": 50,
      "examSchedules": 20,
      "circulars": 15,
      "news": 30,
      "fees": 75,
      "attendance": 500,
      "marks": 200,
      "homework": 45,
      "posts": 100,
      "studentsDetached": 100,
      "classes": 25,
      "users": 150,
      "tenants": 5
    },
    "totalRecords": 1215,
    "duration": 2345,
    "verification": {
      "superAdminExists": true,
      "superAdminCount": 1,
      "platformTenantExists": true,
      "orphanedUsers": 0,
      "orphanedClasses": 0
    }
  },
  "message": "Cleanup completed successfully. SuperAdmin system integrity verified."
}
```

#### Step 3: Verify System Integrity

```bash
curl -X GET http://localhost:3000/api/cleanup/verify \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "superAdminUsers": [
      {
        "id": "uuid-here",
        "email": "superadmin@school.com",
        "name": "Super Admin",
        "role": "SUPER_ADMIN"
      }
    ],
    "superAdminExists": true,
    "platformTenant": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "School Platform",
      "code": "PLATFORM"
    },
    "platformTenantExists": true,
    "orphanedUsers": 0,
    "orphanedClasses": 0,
    "rlsEnabled": true
  },
  "message": "System integrity verified. All checks passed."
}
```

## Pre-Execution Checklist

Before executing the cleanup, verify:

- [ ] **Database Backup Created**: Full backup of the database exists
- [ ] **SuperAdmin Access Verified**: You can log in as SuperAdmin
- [ ] **Dry-Run Completed**: Preview shows expected deletion counts
- [ ] **Low-Traffic Period**: Cleanup scheduled during maintenance window
- [ ] **Team Notified**: Relevant stakeholders aware of potential downtime
- [ ] **Rollback Plan**: Recovery procedure documented and tested

## Post-Execution Verification

After cleanup completes, verify:

1. **SuperAdmin Login Works**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "superadmin@school.com",
       "password": "your-password"
     }'
   ```

2. **System Integrity Check Passes**
   ```bash
   curl -X GET http://localhost:3000/api/cleanup/verify \
     -H "Authorization: Bearer $SUPERADMIN_TOKEN"
   ```

3. **No Orphaned Records**
   ```sql
   -- Check for orphaned users
   SELECT COUNT(*) FROM "User" 
   WHERE "tenantId" IS NOT NULL 
     AND "tenantId" != '00000000-0000-0000-0000-000000000001';
   
   -- Should return 0
   ```

## Rollback Procedure

### If Cleanup Fails Mid-Execution

The cleanup uses database transactions. If any error occurs:

1. **Transaction Automatically Rolls Back**: No data is modified
2. **Error Message Returned**: Review the error details
3. **Database Intact**: All data remains unchanged

### If Cleanup Succeeds But You Need to Restore

If cleanup completed successfully and you need to restore data:

1. **Restore from Backup**:
   ```bash
   # Using pg_restore (if you created a backup with pg_dump)
   pg_restore -h <host> -U <username> -d <database> backup_file.dump
   
   # Or restore from SQL backup
   psql -h <host> -U <username> -d <database> < backup_file.sql
   ```

2. **Verify Restoration**:
   ```sql
   SELECT COUNT(*) FROM "User";
   SELECT COUNT(*) FROM "Tenant";
   -- Verify counts match pre-cleanup values
   ```

## Safety Mechanisms

The cleanup script includes multiple safety features:

### 1. Pre-Execution Validation
- Verifies SuperAdmin exists before proceeding
- Checks platform tenant integrity
- Aborts if safeguards not met

### 2. Transaction Protection
- All deletions occur within a single transaction
- Automatic rollback on any error
- No partial deletions

### 3. Dependency-Aware Deletion
- Deletes child records before parent records
- Handles foreign key constraints gracefully
- Detaches students from classes before deleting classes

### 4. Post-Cleanup Verification
- Confirms SuperAdmin still exists
- Checks for orphaned records
- Verifies RLS policies are re-enabled

### 5. Row Level Security (RLS) Handling
- Temporarily disables RLS for cleanup
- Re-enables RLS after cleanup completes
- Ensures security policies remain intact

## Troubleshooting

### Error: "No SUPER_ADMIN user found"

**Cause**: No user with role `SUPER_ADMIN` exists in the database.

**Solution**:
1. Create a SuperAdmin user:
   ```sql
   INSERT INTO "User" (email, password, name, role, "createdAt", "updatedAt")
   VALUES (
     'superadmin@school.com',
     '$2b$10$hashed-password-here',
     'Super Admin',
     'SUPER_ADMIN',
     NOW(),
     NOW()
   );
   ```

### Error: "Foreign key constraint violation"

**Cause**: Attempting to delete parent records before child records.

**Solution**: The script handles this automatically by deleting in dependency order. If you see this error, the transaction will rollback automatically.

### Error: "Connection terminated"

**Cause**: Database connection lost during cleanup.

**Solution**: 
1. Check database connectivity
2. Increase connection timeout if needed
3. Re-run the cleanup (transaction ensures no partial deletions)

### Cleanup Taking Too Long

**Cause**: Large data volume being deleted.

**Solution**:
1. Let it complete - don't interrupt
2. Consider running during off-peak hours
3. For very large datasets, consider batch deletion

## Best Practices

1. **Always Run Dry-Run First**: Preview what will be deleted
2. **Schedule During Maintenance Window**: Minimize user impact
3. **Monitor Database Performance**: Watch for locks or slow queries
4. **Keep Backups Recent**: Always have a recent backup available
5. **Test Rollback Procedure**: Verify you can restore from backup
6. **Document Everything**: Keep records of cleanup operations

## Support

If you encounter issues:

1. Check the error logs
2. Review the troubleshooting section
3. Verify database connectivity
4. Ensure SuperAdmin account exists
5. Confirm backup is available

## Files Reference

| File | Purpose |
|------|---------|
| `database/cleanup_non_superadmin_data.sql` | SQL script for direct database cleanup |
| `backend/src/controllers/cleanupController.js` | Backend API controller |
| `backend/src/routes/cleanup.js` | API route definitions |
| `database/CLEANUP_EXECUTION_GUIDE.md` | This documentation |

---

**Last Updated**: 2026-07-28  
**Version**: 1.0.0  
**Author**: Principal Backend Engineer & Database Specialist