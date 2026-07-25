-- ============================================================================
-- INDEX VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to check if optimization indexes exist
-- ============================================================================

-- Check if critical indexes exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_homework_tenant_published') 
    THEN '✓ idx_homework_tenant_published EXISTS' 
    ELSE '✗ idx_homework_tenant_published MISSING - Run migration!' 
  END as homework_index_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_id_covering') 
    THEN '✓ idx_user_id_covering EXISTS' 
    ELSE '✗ idx_user_id_covering MISSING - Run migration!' 
  END as user_index_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tenant_id_covering') 
    THEN '✓ idx_tenant_id_covering EXISTS' 
    ELSE '✗ idx_tenant_id_covering MISSING - Run migration!' 
  END as tenant_index_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_class_id_covering') 
    THEN '✓ idx_class_id_covering EXISTS' 
    ELSE '✗ idx_class_id_covering MISSING - Run migration!' 
  END as class_index_status;

-- List all indexes for key tables
SELECT '=== HOMEWORK INDEXES ===' as info;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Homework' ORDER BY indexname;

SELECT '=== USER INDEXES ===' as info;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'User' ORDER BY indexname;

SELECT '=== TENANT INDEXES ===' as info;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Tenant' ORDER BY indexname;

SELECT '=== CLASS INDEXES ===' as info;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Class' ORDER BY indexname;

-- Check table sizes
SELECT '=== TABLE SIZES ===' as info;
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('User', 'Tenant', 'Class', 'Homework', 'News', 'Attendance', 'Mark', 'Fee')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check when tables were last analyzed
SELECT '=== TABLE STATISTICS AGE ===' as info;
SELECT 
  relname as table_name,
  last_analyze,
  last_autoanalyze,
  n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE relname IN ('User', 'Tenant', 'Class', 'Homework', 'News')
ORDER BY relname;

-- ============================================================================
-- If any indexes show as MISSING, run the migration:
-- Copy contents of: database/migrations/20250125_slow_query_fix_indexes.sql
-- Paste into SQL Editor and run
-- ============================================================================