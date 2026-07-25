# Slow Query Optimization Summary

## Problem

Two slow queries were identified in the application:

### Query 1: User Authentication Lookup (1355ms)
```sql
SELECT 
  u.id, u.email, u.name, u.phone, u.role, u."tenantId", u."classId", u."studentId",
  u."createdAt", u."updatedAt",
  t.id as "tenant_table_id", t.name as "tenantName", t.code as "tenantCode",
  c.id as "class_table_id", c.name as "className", c.section as "classSection"
FROM "User" u
LEFT JOIN "Tenant" t ON u."tenantId" = t.id
LEFT JOIN "Class" c ON u."classId" = c.id
WHERE u.id = $1
```

**Issue**: This query runs on EVERY authenticated request (auth middleware). Despite having a primary key lookup, it was taking 1.3+ seconds.

**Root Cause**: While the primary key lookup is fast, the JOIN operations required additional table lookups to fetch the Tenant and Class data. Without covering indexes, PostgreSQL had to perform index scans followed by heap fetches (table lookups) for each joined row.

### Query 2: Homework Count Query (1047ms)
```sql
SELECT COUNT(*) as total FROM "Homework" h 
WHERE h."tenant_id" = $1 AND h."is_published" = $2
```

**Issue**: A simple COUNT query taking over 1 second.

**Root Cause**: The existing indexes were on individual columns (`tenantId` and `isPublished` separately), but PostgreSQL can only efficiently use one index per table in a query. Without a composite index, it had to:
1. Use one index to find matching rows
2. Filter the results by the second condition
3. Or worse - perform a sequential scan

## Solution

Created migration file: `database/migrations/20250125_slow_query_fix_indexes.sql`

### Indexes Added

#### 1. Homework Composite Index (Primary Fix for Query 2)
```sql
CREATE INDEX idx_homework_tenant_published ON "Homework"("tenantId", "isPublished");
```
- Allows PostgreSQL to satisfy both WHERE conditions in a single index scan
- Expected improvement: 1047ms → <100ms

#### 2. User Covering Index (Fix for Query 1)
```sql
CREATE INDEX idx_user_id_covering ON "User"(id) 
  INCLUDE (email, password, name, phone, role, "tenantId", "classId", "studentId", "createdAt", "updatedAt");
```
- Includes all columns needed by the query, avoiding table lookups
- Expected improvement: 1355ms → <50ms

#### 3. Tenant Covering Index (Optimizes JOIN)
```sql
CREATE INDEX idx_tenant_id_covering ON "Tenant"(id) 
  INCLUDE (name, code, email, phone, address, "schoolLogoUrl", "createdAt", "updatedAt");
```

#### 4. Class Covering Index (Optimizes JOIN)
```sql
CREATE INDEX idx_class_id_covering ON "Class"(id) 
  INCLUDE (name, section, "teacherId", "tenantId", class_code, password, "createdAt", "updatedAt");
```

#### 5. Additional Supporting Indexes
```sql
-- For class-specific homework queries
CREATE INDEX idx_homework_class_published ON "Homework"("classId", "isPublished");

-- For teacher assignment lookups
CREATE INDEX idx_homework_assigned_by_tenant ON "Homework"("assignedBy", "tenantId");

-- For due date filtering
CREATE INDEX idx_homework_due_date ON "Homework"("dueDate") WHERE "isPublished" = true;
```

## Deployment Instructions

1. **Run the migration** in your Supabase SQL Editor or PostgreSQL client:
   ```bash
   # If using psql
   psql -h your-host -U postgres -d postgres -f database/migrations/20250125_slow_query_fix_indexes.sql
   ```

2. **Verify indexes were created**:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes 
   WHERE tablename = 'Homework' AND indexname LIKE 'idx_homework%'
   ORDER BY indexname;
   ```

3. **Monitor query performance** - The indexes should show immediate improvement.

## Expected Results

| Query | Before | After |
|-------|--------|-------|
| User auth JOIN | ~1355ms | <50ms |
| Homework COUNT | ~1047ms | <100ms |

## Notes

- The `ANALYZE` commands in the migration are **critical** - without them, PostgreSQL won't know about the new indexes and will continue using sequential scans
- Covering indexes (using `INCLUDE`) increase index size but dramatically improve read performance
- These indexes are read-optimized and won't significantly impact write performance
- The migration uses `IF NOT EXISTS` clauses for safe re-running