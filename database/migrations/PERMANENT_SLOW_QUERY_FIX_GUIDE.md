# Permanent Slow Query Fix Guide

## 🔴 CRITICAL: You Must Execute the SQL Migration

The indexes I created **will not work until you run them in your database**. This is why the queries are still slow.

## Step 1: Run the Database Migration

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Copy the entire contents of `database/migrations/20250125_slow_query_fix_indexes.sql`
4. Paste it into the SQL Editor
5. Click **Run** or press `Ctrl+Enter`

### Option B: Using psql Command Line

```bash
# Connect to your Supabase database
psql -h db.<your-project-ref>.supabase.co -U postgres -d postgres -f database/migrations/20250125_slow_query_fix_indexes.sql

# Or using the connection string from .env
psql "$DIRECT_DATABASE_URL" -f database/migrations/20250125_slow_query_fix_indexes.sql
```

## Step 2: Verify Indexes Were Created

Run this query in Supabase SQL Editor to confirm:

```sql
-- Check Homework indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Homework' 
  AND indexname LIKE 'idx_homework%'
ORDER BY indexname;

-- Check User indexes  
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'User' 
  AND indexname LIKE 'idx_user%'
ORDER BY indexname;

-- Check Tenant indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Tenant' 
  AND indexname LIKE 'idx_tenant%'
ORDER BY indexname;

-- Check Class indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Class' 
  AND indexname LIKE 'idx_class%'
ORDER BY indexname;
```

You should see these new indexes:
- `idx_homework_tenant_published` - **Critical for COUNT query**
- `idx_homework_tenant_id_published` - Snake_case variant
- `idx_homework_class_published` - For class-specific queries
- `idx_user_id_covering` - **Critical for User JOIN query**
- `idx_tenant_id_covering` - For Tenant JOIN
- `idx_class_id_covering` - For Class JOIN

## Step 3: Run Database Maintenance

After creating indexes, run these commands to update PostgreSQL statistics:

```sql
-- Update statistics for all affected tables
ANALYZE "User";
ANALYZE "Tenant"; 
ANALYZE "Class";
ANALYZE "Homework";
ANALYZE "News";

-- Optional: Run VACUUM to reclaim storage and update visibility map
VACUUM ANALYZE "User";
VACUUM ANALYZE "Tenant";
VACUUM ANALYZE "Class";
VACUUM ANALYZE "Homework";
VACUUM ANALYZE "News";
```

## Step 4: Test Query Performance

Use the telemetry endpoint to check database latency:

```bash
# Check DB latency
curl http://localhost:3000/api/superadmin/db-latency

# Check system health
curl http://localhost:3000/api/superadmin/system-health
```

Or run these test queries in Supabase SQL Editor:

```sql
-- Test User query (should be <50ms)
EXPLAIN ANALYZE 
SELECT u.id, u.email, u.name, u."tenantId", 
       t.name as "tenantName", t.code as "tenantCode",
       c.name as "className", c.section as "classSection"
FROM "User" u
LEFT JOIN "Tenant" t ON u."tenantId" = t.id
LEFT JOIN "Class" c ON u."classId" = c.id
WHERE u.id = 'some-uuid-here';

-- Test Homework COUNT query (should be <100ms)
EXPLAIN ANALYZE
SELECT COUNT(*) as total FROM "Homework" h 
WHERE h."tenantId" = 'some-uuid-here' AND h."isPublished" = true;
```

Look for:
- `Index Scan` or `Index Only Scan` instead of `Seq Scan`
- `Actual Time` should be <50ms for User query, <100ms for COUNT

## Step 5: Address Network Latency (If Still Slow)

If queries are still slow after creating indexes, the issue is **network latency** to Supabase.

### Check Network Latency

Run this in Supabase SQL Editor:
```sql
-- This measures server-side execution time (should be <10ms)
SELECT pg_sleep(0); 
```

If the SQL executes in <10ms but your app sees 1000ms+, it's network latency.

### Solutions for Network Latency:

1. **Use Connection Pooler Correctly**
   - Session pooler (port 5432) for prepared statements
   - Transaction pooler (port 6543) for connection pooling
   - Your app uses transaction pooler - this is correct for Supabase

2. **Enable Connection Pooling in Production**
   - Supabase already provides connection pooling
   - No additional configuration needed

3. **Consider Geographic Location**
   - If your Supabase region is far from your server, latency will be high
   - Choose a region closest to your users

## Expected Results After Fix

| Query Type | Before | After Indexes |
|------------|--------|---------------|
| User auth JOIN | 1000-1500ms | 50-200ms* |
| Homework COUNT | 1000-1200ms | 50-200ms* |
| Class list | 1000-4000ms | 100-300ms* |
| News COUNT | 1000-3000ms | 50-200ms* |

\* Includes network latency to Supabase (typically 50-150ms)

## Troubleshooting

### Indexes Not Being Used?

Run this to see query plan:
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) FROM "Homework" 
WHERE "tenantId" = 'uuid' AND "isPublished" = true;
```

If you see `Seq Scan` instead of `Index Scan`:
1. Run `ANALYZE "Homework";` again
2. Check that the UUID value exists in the table
3. Verify index exists: `SELECT * FROM pg_indexes WHERE indexname = 'idx_homework_tenant_published';`

### Still Slow After Indexes?

The remaining time is likely **network latency**. To confirm:

1. Check DB latency endpoint: `GET /api/superadmin/db-latency`
2. If latency is >100ms, it's network issues
3. Consider using a Supabase region closer to your server

### Connection Pool Exhaustion?

If you see many "Connected to PostgreSQL database" messages:
- The pool is creating new connections frequently
- This indicates high load or connection leaks
- Check for unclosed connections in your code

## Summary

1. **Run the SQL migration** - This is mandatory
2. **Run ANALYZE** - Updates query planner statistics  
3. **Verify indexes exist** - Use the verification queries
4. **Test performance** - Use EXPLAIN ANALYZE
5. **Address network latency** - If still slow, it's network issues

The indexes will reduce query execution time from 1000ms+ to <50ms. Any remaining time is network latency to Supabase, which is normal for cloud databases.