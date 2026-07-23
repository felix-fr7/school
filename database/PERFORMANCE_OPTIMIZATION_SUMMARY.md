# Database Performance Optimization Summary

## Problem Identified

The backend server was showing slow query warnings:
- `SELECT 1` taking 1069ms (connection test)
- Login query taking 1016ms: `SELECT * FROM "User" WHERE LOWER(email) = $1 OR LOWER("studentId") = $1 LIMIT 1`
- User auth query taking 1050ms: Complex query with LEFT JOINs to Tenant and Class tables

## Root Cause Analysis

### 1. Missing Functional Indexes (Primary Issue)
The login query uses `LOWER(email)` and `LOWER("studentId")` for case-insensitive matching. PostgreSQL **cannot use regular indexes** on columns when a function is applied to them. The existing indexes:
- `idx_user_email` ON `"User"(email)`
- `idx_user_student_id` ON `"User"("studentId")`

These indexes are useless for `LOWER(email) = $1` queries because the database must compute `LOWER()` for every row.

### 2. Missing Covering Indexes for Joins
The `protect` middleware runs a complex query on every authenticated request that joins User with Tenant and Class tables. Without covering indexes, this requires multiple lookups.

### 3. Unnecessary Data Fetching
The auth middleware was fetching the `password` hash on every request, even though it's only needed for password verification (which happens separately in the updatePassword controller).

### 4. Connection Pool Configuration
The connection pool was configured with conservative settings that may not be optimal for cross-region latency to Supabase.

## Solution Implemented

### 1. Created Functional Indexes
Added to `database/performance_indexes.sql`:

```sql
-- Critical for login performance
CREATE INDEX IF NOT EXISTS "idx_user_email_lower" ON "User"(LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_user_student_id_lower" ON "User"(LOWER("studentId"));

-- Optional: Tenant-scoped versions for multi-tenant optimization
CREATE INDEX IF NOT EXISTS "idx_user_tenant_email_lower" ON "User"("tenantId", LOWER(email));
CREATE INDEX IF NOT EXISTS "idx_user_tenant_student_id_lower" ON "User"("tenantId", LOWER("studentId"));
```

### 2. Created Covering Indexes for Joins
```sql
-- Covering index for User primary key lookup (includes all needed columns)
CREATE INDEX IF NOT EXISTS "idx_user_id_covering" ON "User"(id) 
  INCLUDE ("email", "password", "name", "phone", "role", "tenantId", "classId", "studentId", "createdAt", "updatedAt");

-- Covering index for Tenant primary key lookup (optimizes LEFT JOIN)
CREATE INDEX IF NOT EXISTS "idx_tenant_id_covering" ON "Tenant"(id) 
  INCLUDE ("name", "code");

-- Covering index for Class primary key lookup (optimizes LEFT JOIN)
CREATE INDEX IF NOT EXISTS "idx_class_id_covering" ON "Class"(id) 
  INCLUDE ("name", "section");
```

### 3. Additional Performance Indexes
```sql
-- User lookup optimization
CREATE INDEX IF NOT EXISTS "idx_user_id_role" ON "User"(id, role) WHERE role IS NOT NULL;

-- Class-based login optimization
CREATE INDEX IF NOT EXISTS "idx_class_code" ON "Class"("class_code");

-- Weekly lessons query optimization
CREATE INDEX IF NOT EXISTS "idx_weeklylessonlog_class_subject" ON "WeeklyLessonLog"("classId", "subject");
```

### 4. Optimized Auth Middleware Queries
Updated `backend/src/middleware/auth.js`:
- Removed `password` column from SELECT in `protect` and `optionalAuth` middleware
- The password is now only fetched when explicitly needed (in updatePassword controller)
- This reduces data transfer and query execution time on every authenticated request

### 5. Optimized Connection Pool
Updated `backend/src/config/db.js`:
- Increased `max` connections from 10 to 20 for better concurrency
- Restored standard `idleTimeoutMillis` to 30000
- Added `application_name` for monitoring

## Deployment Instructions

### Step 1: Apply Database Indexes
Run the SQL script in your Supabase SQL Editor:

1. Go to Supabase Dashboard → Your Project → SQL Editor
2. Copy the contents of `database/performance_indexes.sql`
3. Execute the script
4. Verify indexes were created:
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'User' 
   ORDER BY indexname;
   ```

### Step 2: Restart Backend Server
After applying the indexes, restart your backend server to pick up the connection pool changes:

```bash
cd backend
npm restart
# or if using PM2:
pm2 restart all
```

### Step 3: Monitor Performance
Watch the server logs for slow query warnings. After the indexes are applied, the login query should execute in **milliseconds** instead of seconds.

## Expected Results

### Before Optimization
- Login query: ~1000ms
- Connection test: ~1000ms (network latency)

### After Optimization
- Login query: **<50ms** (20-50x faster)
- Connection test: Same (network latency is unavoidable)

## Why This Works

### Functional Indexes
A functional index stores the result of applying a function to a column. When you query `LOWER(email) = 'test@example.com'`, PostgreSQL can:
1. Compute `LOWER('test@example.com')` → `'test@example.com'`
2. Look up this value directly in the `idx_user_email_lower` index
3. Retrieve the matching row(s) instantly

Without the functional index, PostgreSQL must:
1. Scan every row in the User table
2. Compute `LOWER(email)` for each row
3. Compare each result
4. This is a **sequential scan** - very slow for large tables

### Connection Pool Optimization
The increased pool size allows more concurrent database connections, reducing wait times when multiple users are active simultaneously.

## Additional Recommendations

### 1. Use Direct Connection URL (If Possible)
If you're using the Supabase pooler (port 6543), consider also configuring `DIRECT_DATABASE_URL` (port 5432) for session-based operations. The pooler is great for serverless/short-lived connections, but a direct connection can be faster for long-running applications.

Add to your `.env`:
```env
DATABASE_URL=postgresql://user:pass@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://user:pass@aws-1-ap-northeast-1.db.supabase.com:5432/postgres
```

### 2. Enable Connection Pooling in Production
For production, consider using a connection pooler like PgBouncer if you have many concurrent users.

### 3. Monitor Query Performance
Enable PostgreSQL's `pg_stat_statements` extension to track slow queries:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Then query:
```sql
SELECT query, calls, total_time, mean_time, rows 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 4. Consider Region Optimization
If your users are primarily in a specific region, consider deploying your backend closer to your Supabase database region to reduce network latency.

## Maintenance

### Rebuild Indexes Periodically
Over time, indexes can become fragmented. Rebuild them periodically:
```sql
REINDEX TABLE "User";
REINDEX TABLE "Class";
```

### Update Statistics
Run `ANALYZE` to update query planner statistics:
```sql
ANALYZE "User";
ANALYZE "Class";
```

## Troubleshooting

### Index Not Being Used
If queries are still slow, check if the index is being used:
```sql
EXPLAIN ANALYZE 
SELECT * FROM "User" 
WHERE LOWER(email) = 'test@example.com' 
LIMIT 1;
```

Look for `Index Scan using idx_user_email_lower` in the output. If you see `Seq Scan`, the index isn't being used.

### Index Creation Failed
If index creation fails due to duplicate names, the indexes may already exist. Check:
```sql
SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_user_%';
```

## Conclusion

The primary performance issue was the missing functional indexes for case-insensitive login queries. After applying the indexes and optimizing the connection pool, login performance should improve dramatically. The connection test query latency is due to network distance to Supabase servers and cannot be eliminated without deploying closer to the database region.