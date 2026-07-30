/**
 * Cleanup Controller
 * Production-safe cleanup operations for multi-tenant data purging
 * 
 * This controller provides API endpoints to:
 * 1. Preview cleanup operations (dry-run)
 * 2. Execute cleanup of all non-superadmin data
 * 3. Verify system integrity post-cleanup
 * 
 * SECURITY: All endpoints require SUPER_ADMIN role
 */

const db = require('../config/db');

// ============================================================================
// CONSTANTS - SuperAdmin Identification
// ============================================================================

const SUPERADMIN_ROLE = 'SUPER_ADMIN';
const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ============================================================================
// TABLE DEPENDENCY ORDER (for safe deletion)
// ============================================================================
// Tables are deleted in this order to respect foreign key constraints:
// 1. Child tables (no dependents)
// 2. Parent tables (have dependents that were already deleted)
// 3. Root tables (Tenant, User)

const TABLES_TO_CLEANUP = [
  // Phase 1: Child records (tenant-scoped)
  { table: 'WeeklyLessonLog', condition: '"tenantId" != $1' },
  { table: 'ExamSchedule', condition: '"tenantId" != $1' },
  { table: 'Circular', condition: '"tenantId" != $1' },
  { table: 'News', condition: '"tenantId" != $1' },
  { table: 'Fee', condition: '"tenantId" != $1' },
  { table: 'Attendance', condition: '"tenantId" != $1' },
  { table: 'Mark', condition: '"tenantId" != $1' },
  { table: 'Homework', condition: '"tenantId" != $1' },
  { table: 'Post', condition: '"userId" IN (SELECT id FROM "User" WHERE role != $2)' },
  
  // Phase 2: Classes (detach students first)
  { table: 'Class', condition: '"tenantId" != $1', preDelete: 'detachStudents' },
  
  // Phase 3: Users (non-superadmin)
  { table: 'User', condition: 'role != $2' },
  
  // Phase 4: Tenants (non-platform)
  { table: 'Tenant', condition: 'id != $1' },
];

/**
 * Get cleanup statistics (dry-run analysis)
 * Returns counts of records that would be affected
 */
const getCleanupStats = async (req, res, next) => {
  try {
    const stats = {};
    let totalRecords = 0;
    
    // Count non-superadmin users
    const userResult = await db.query(
      'SELECT COUNT(*) as count FROM "User" WHERE role != $1',
      [SUPERADMIN_ROLE]
    );
    stats.users = parseInt(userResult.rows[0].count);
    totalRecords += stats.users;
    
    // Count non-platform tenants
    const tenantResult = await db.query(
      'SELECT COUNT(*) as count FROM "Tenant" WHERE id != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.tenants = parseInt(tenantResult.rows[0].count);
    totalRecords += stats.tenants;
    
    // Count classes for non-platform tenants
    const classResult = await db.query(
      'SELECT COUNT(*) as count FROM "Class" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.classes = parseInt(classResult.rows[0].count);
    totalRecords += stats.classes;
    
    // Count homework for non-platform tenants
    const homeworkResult = await db.query(
      'SELECT COUNT(*) as count FROM "Homework" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.homework = parseInt(homeworkResult.rows[0].count);
    totalRecords += stats.homework;
    
    // Count marks for non-platform tenants
    const markResult = await db.query(
      'SELECT COUNT(*) as count FROM "Mark" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.marks = parseInt(markResult.rows[0].count);
    totalRecords += stats.marks;
    
    // Count attendance for non-platform tenants
    const attendanceResult = await db.query(
      'SELECT COUNT(*) as count FROM "Attendance" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.attendance = parseInt(attendanceResult.rows[0].count);
    totalRecords += stats.attendance;
    
    // Count fees for non-platform tenants
    const feeResult = await db.query(
      'SELECT COUNT(*) as count FROM "Fee" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.fees = parseInt(feeResult.rows[0].count);
    totalRecords += stats.fees;
    
    // Count news for non-platform tenants
    const newsResult = await db.query(
      'SELECT COUNT(*) as count FROM "News" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.news = parseInt(newsResult.rows[0].count);
    totalRecords += stats.news;
    
    // Count circulars for non-platform tenants
    const circularResult = await db.query(
      'SELECT COUNT(*) as count FROM "Circular" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.circulars = parseInt(circularResult.rows[0].count);
    totalRecords += stats.circulars;
    
    // Count exam schedules for non-platform tenants
    const examScheduleResult = await db.query(
      'SELECT COUNT(*) as count FROM "ExamSchedule" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.examSchedules = parseInt(examScheduleResult.rows[0].count);
    totalRecords += stats.examSchedules;
    
    // Count posts by non-superadmin users
    const postResult = await db.query(
      'SELECT COUNT(*) as count FROM "Post" WHERE "userId" IN (SELECT id FROM "User" WHERE role != $1)',
      [SUPERADMIN_ROLE]
    );
    stats.posts = parseInt(postResult.rows[0].count);
    totalRecords += stats.posts;
    
    // Count weekly lesson logs for non-platform tenants
    const weeklyLessonResult = await db.query(
      'SELECT COUNT(*) as count FROM "WeeklyLessonLog" WHERE "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    stats.weeklyLessonLogs = parseInt(weeklyLessonResult.rows[0].count);
    totalRecords += stats.weeklyLessonResult;
    
    // Verify superadmin exists
    const superAdminResult = await db.query(
      'SELECT COUNT(*) as count FROM "User" WHERE role = $1',
      [SUPERADMIN_ROLE]
    );
    const superAdminCount = parseInt(superAdminResult.rows[0].count);
    
    // Verify platform tenant exists
    const platformTenantResult = await db.query(
      'SELECT COUNT(*) as count FROM "Tenant" WHERE id = $1',
      [PLATFORM_TENANT_ID]
    );
    const platformTenantExists = parseInt(platformTenantResult.rows[0].count) > 0;
    
    res.status(200).json({
      success: true,
      data: {
        stats,
        totalRecords,
        safeguards: {
          superAdminExists: superAdminCount > 0,
          superAdminCount,
          platformTenantExists,
          platformTenantId: PLATFORM_TENANT_ID,
        },
        ready: superAdminCount > 0,
        message: superAdminCount > 0 
          ? 'System is ready for cleanup. SuperAdmin account will be preserved.'
          : 'WARNING: No SuperAdmin account found! Cleanup cannot proceed safely.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Execute cleanup of all non-superadmin data
 * This is a destructive operation that cannot be undone
 */
const executeCleanup = async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const results = {
      deleted: {},
      totalRecords: 0,
      duration: Date.now(),
    };
    
    // Step 0: Pre-flight checks
    const superAdminCheck = await client.query(
      'SELECT COUNT(*) as count FROM "User" WHERE role = $1',
      [SUPERADMIN_ROLE]
    );
    
    if (parseInt(superAdminCheck.rows[0].count) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: {
          message: 'Cannot proceed: No SUPER_ADMIN user found in the system.',
        },
      });
    }
    
    // Step 1: Disable RLS for cleanup operations
    const tables = [
      'Tenant', 'User', 'Class', 'Homework', 'Mark', 
      'Attendance', 'Fee', 'News', 'Circular', 'ExamSchedule', 
      'Post', 'WeeklyLessonLog'
    ];
    
    for (const table of tables) {
      await client.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
    
    // Step 2: Delete child records (in dependency order)
    
    // 2.1 WeeklyLessonLog
    const weeklyLessonResult = await client.query(
      'DELETE FROM "WeeklyLessonLog" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.weeklyLessonLogs = weeklyLessonResult.rowCount;
    results.totalRecords += weeklyLessonResult.rowCount;
    
    // 2.2 ExamSchedule
    const examScheduleResult = await client.query(
      'DELETE FROM "ExamSchedule" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.examSchedules = examScheduleResult.rowCount;
    results.totalRecords += examScheduleResult.rowCount;
    
    // 2.3 Circular
    const circularResult = await client.query(
      'DELETE FROM "Circular" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.circulars = circularResult.rowCount;
    results.totalRecords += circularResult.rowCount;
    
    // 2.4 News
    const newsResult = await client.query(
      'DELETE FROM "News" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.news = newsResult.rowCount;
    results.totalRecords += newsResult.rowCount;
    
    // 2.5 Fee
    const feeResult = await client.query(
      'DELETE FROM "Fee" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.fees = feeResult.rowCount;
    results.totalRecords += feeResult.rowCount;
    
    // 2.6 Attendance
    const attendanceResult = await client.query(
      'DELETE FROM "Attendance" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.attendance = attendanceResult.rowCount;
    results.totalRecords += attendanceResult.rowCount;
    
    // 2.7 Mark
    const markResult = await client.query(
      'DELETE FROM "Mark" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.marks = markResult.rowCount;
    results.totalRecords += markResult.rowCount;
    
    // 2.8 Homework
    const homeworkResult = await client.query(
      'DELETE FROM "Homework" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.homework = homeworkResult.rowCount;
    results.totalRecords += homeworkResult.rowCount;
    
    // 2.9 Post (by non-superadmin users)
    const postResult = await client.query(
      'DELETE FROM "Post" WHERE "userId" IN (SELECT id FROM "User" WHERE role != $1) RETURNING id',
      [SUPERADMIN_ROLE]
    );
    results.deleted.posts = postResult.rowCount;
    results.totalRecords += postResult.rowCount;
    
    // Step 3: Detach students from classes before deleting classes
    const detachResult = await client.query(
      `UPDATE "User" 
       SET "classId" = NULL 
       WHERE "classId" IN (SELECT id FROM "Class" WHERE "tenantId" != $1)`,
      [PLATFORM_TENANT_ID]
    );
    results.deleted.studentsDetached = detachResult.rowCount;
    
    // Step 4: Delete Classes
    const classResult = await client.query(
      'DELETE FROM "Class" WHERE "tenantId" != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.classes = classResult.rowCount;
    results.totalRecords += classResult.rowCount;
    
    // Step 5: Delete non-superadmin users
    const userResult = await client.query(
      'DELETE FROM "User" WHERE role != $1 RETURNING id',
      [SUPERADMIN_ROLE]
    );
    results.deleted.users = userResult.rowCount;
    results.totalRecords += userResult.rowCount;
    
    // Step 6: Delete non-platform tenants
    const tenantResult = await client.query(
      'DELETE FROM "Tenant" WHERE id != $1 RETURNING id',
      [PLATFORM_TENANT_ID]
    );
    results.deleted.tenants = tenantResult.rowCount;
    results.totalRecords += tenantResult.rowCount;
    
    // Step 7: Re-enable RLS
    for (const table of tables) {
      await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
    
    // Step 8: Post-cleanup verification
    const verification = {};
    
    // Verify SuperAdmin exists
    const postSuperAdminCheck = await client.query(
      'SELECT COUNT(*) as count FROM "User" WHERE role = $1',
      [SUPERADMIN_ROLE]
    );
    verification.superAdminExists = parseInt(postSuperAdminCheck.rows[0].count) > 0;
    verification.superAdminCount = parseInt(postSuperAdminCheck.rows[0].count);
    
    // Verify Platform Tenant exists
    const postPlatformTenantCheck = await client.query(
      'SELECT COUNT(*) as count FROM "Tenant" WHERE id = $1',
      [PLATFORM_TENANT_ID]
    );
    verification.platformTenantExists = parseInt(postPlatformTenantCheck.rows[0].count) > 0;
    
    // Check for orphaned records
    const orphanedUsersCheck = await client.query(
      'SELECT COUNT(*) as count FROM "User" WHERE "tenantId" IS NOT NULL AND "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    verification.orphanedUsers = parseInt(orphanedUsersCheck.rows[0].count);
    
    const orphanedClassesCheck = await client.query(
      'SELECT COUNT(*) as count FROM "Class" WHERE "tenantId" IS NOT NULL AND "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    verification.orphanedClasses = parseInt(orphanedClassesCheck.rows[0].count);
    
    // Commit transaction
    await client.query('COMMIT');
    
    results.duration = Date.now() - results.duration;
    results.verification = verification;
    
    // Check if verification passed
    const verificationPassed = 
      verification.superAdminExists && 
      verification.platformTenantExists &&
      verification.orphanedUsers === 0 &&
      verification.orphanedClasses === 0;
    
    res.status(200).json({
      success: verificationPassed,
      data: results,
      message: verificationPassed
        ? 'Cleanup completed successfully. SuperAdmin system integrity verified.'
        : 'Cleanup completed but verification found issues. Review the verification data.',
    });
    
  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Cleanup failed. Transaction rolled back. No data was modified.',
        details: error.message,
      },
    });
  } finally {
    client.release();
  }
};

/**
 * Verify SuperAdmin system integrity
 * Checks that SuperAdmin account and platform tenant are intact
 */
const verifySystemIntegrity = async (req, res, next) => {
  try {
    const checks = {};
    let allPassed = true;
    
    // Check 1: SuperAdmin user exists
    const superAdminResult = await db.query(
      'SELECT id, email, name, role FROM "User" WHERE role = $1',
      [SUPERADMIN_ROLE]
    );
    checks.superAdminUsers = superAdminResult.rows;
    checks.superAdminExists = superAdminResult.rows.length > 0;
    if (!checks.superAdminExists) allPassed = false;
    
    // Check 2: Platform tenant exists
    const platformTenantResult = await db.query(
      'SELECT id, name, code FROM "Tenant" WHERE id = $1',
      [PLATFORM_TENANT_ID]
    );
    checks.platformTenant = platformTenantResult.rows[0] || null;
    checks.platformTenantExists = platformTenantResult.rows.length > 0;
    if (!checks.platformTenantExists) allPassed = false;
    
    // Check 3: No orphaned records
    const orphanedUsersResult = await db.query(
      'SELECT COUNT(*) as count FROM "User" WHERE "tenantId" IS NOT NULL AND "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    checks.orphanedUsers = parseInt(orphanedUsersResult.rows[0].count);
    if (checks.orphanedUsers > 0) allPassed = false;
    
    const orphanedClassesResult = await db.query(
      'SELECT COUNT(*) as count FROM "Class" WHERE "tenantId" IS NOT NULL AND "tenantId" != $1',
      [PLATFORM_TENANT_ID]
    );
    checks.orphanedClasses = parseInt(orphanedClassesResult.rows[0].count);
    if (checks.orphanedClasses > 0) allPassed = false;
    
    // Check 4: RLS is enabled on all tables
    const rlsResult = await db.query(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'Tenant', 'User', 'Class', 'Homework', 'Mark', 
        'Attendance', 'Fee', 'News', 'Circular', 'ExamSchedule', 
        'Post', 'WeeklyLessonLog'
      )
    `);
    checks.rlsEnabled = rlsResult.rows.every(row => row.rowsecurity === true);
    if (!checks.rlsEnabled) allPassed = false;
    
    res.status(200).json({
      success: allPassed,
      data: checks,
      message: allPassed
        ? 'System integrity verified. All checks passed.'
        : 'System integrity check found issues. Review the details.',
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCleanupStats,
  executeCleanup,
  verifySystemIntegrity,
};