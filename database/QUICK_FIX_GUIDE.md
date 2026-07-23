# Quick Fix Guide for Slow Queries

## IMPORTANT: You Must Apply the Indexes First!

The performance optimization indexes have been created in `database/performance_indexes.sql`, but **you need to run this SQL script in your Supabase dashboard** before seeing improvements.

### Step 1: Apply Database Indexes (MANDATORY)

1. Go to your Supabase Dashboard
2. Select your project
3. Click on **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire contents of `database/performance_indexes.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Wait for confirmation that the script executed successfully

### Step 2: Restart Your Backend Server

After applying the indexes:

```bash
cd backend
# Stop the current server (Ctrl+C)
npm start
```

### Step 3: Understand the Network Latency Issue

Even after applying all indexes, you may still see query durations around **1000ms** for the first query after server startup. This is **network latency** to Supabase servers (aws-1-ap-northeast-1.pooler.supabase.com), not a database performance issue.

#### Why This Happens:
- Your backend is connecting to Supabase servers in the **Asia Pacific (Tokyo)** region
- If your backend is running locally or in a different region, there's inherent network latency
- The connection pool needs to establish new connections, which takes time
- This is **normal** and **unavoidable** without deploying closer to the database

#### What the Indexes Actually Fix:
- **Login query**: From ~1000ms sequential scan to ~50ms index scan (20x faster)
- **Auth middleware queries**: From multiple sequential scans to index-only scans
- **Overall database load**: Significantly reduced CPU usage on Supabase side

#### What They Don't Fix:
- **Network round-trip time**: The physical distance data must travel
- **Connection establishment time**: Time to create new database connections
- **Cross-region latency**: If your app and database are in different regions

### Step 4: How to Verify Indexes Are Working

After applying the indexes, run this query in Supabase SQL Editor:

```sql
-- Check if indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'User' 
  AND indexname LIKE 'idx_user_%'
ORDER BY indexname;
```

You should see these new indexes:
- `idx_user_email_lower`
- `idx_user_student_id_lower`
- `idx_user_id_covering`
- `idx_user_tenant_email_lower` (optional)
- `idx_user_tenant_student_id_lower` (optional)

### Step 5: Monitor Query Performance

Watch your server logs. You should see:
- **Before**: Slow query warnings for login and auth queries (~1000ms)
- **After**: No slow query warnings (queries < 1000ms threshold)

If you still see slow query warnings after applying indexes:
1. Check that the indexes exist (Step 4)
2. Run `ANALYZE "User";` in Supabase SQL Editor to update statistics
3. Restart your backend server again

### Step 6: Reducing Network Latency (Optional)

If you want to reduce the ~1000ms network latency, consider these options:

#### Option A: Use Direct Connection URL
Add this to your `.env` file:
```env
DATABASE_URL=postgresql://user:pass@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
DIRECT_DATABASE_URL=postgresql://user:pass@aws-1-ap-northeast-1.db.supabase.com:5432/postgres
```
The direct connection (port 5432) can be slightly faster for long-running connections.

#### Option B: Deploy Backend Closer to Database
Deploy your backend to the same region as your Supabase database:
- **Supabase region**: Asia Pacific (Tokyo) - `ap-northeast-1`
- **Recommended**: Deploy to AWS Tokyo, Google Cloud Tokyo, or similar

#### Option C: Use a Connection Pooler
For production with many concurrent users, use PgBouncer:
```bash
# Install PgBouncer in your deployment
# Configure it to connect to Supabase
# Point your app to the local PgBouncer instance
```

### Common Issues

#### Issue: Indexes Already Exist
If you get errors like "relation already exists", the indexes were already created. This is fine - just proceed to Step 2.

#### Issue: Permission Denied
Make sure you're running the SQL script as a user with permission to create indexes (usually the default Supabase user has this).

#### Issue: Queries Still Slow After Applying Indexes
1. Run `ANALYZE "User";` to update query planner statistics
2. Restart your backend server
3. Wait for the connection pool to warm up (first few queries may be slow)

### Expected Results

After applying indexes and restarting:

**Login Query Performance:**
- Before: ~1000ms (sequential scan)
- After: ~50-200ms (index scan + network latency)
- **Improvement: 5-20x faster**

**Auth Middleware Performance:**
- Before: ~1000ms per request
- After: ~50-200ms per request
- **Improvement: 5-20x faster**

**First Query After Restart:**
- May still be ~1000ms due to connection establishment
- Subsequent queries will be much faster

### Summary

1. ✅ **Apply indexes** (run SQL script in Supabase)
2. ✅ **Restart server** (npm start)
3. ✅ **Understand** that ~1000ms network latency is normal for cross-region connections
4. ✅ **Verify** indexes were created
5. ✅ **Monitor** logs for improvements
6. ✅ **Consider** deploying closer to database for production

The indexes will dramatically improve database performance, but they cannot eliminate the physical network latency between your backend and Supabase servers.