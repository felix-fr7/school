-- ============================================================================
-- MULTI-TENANT DATA CLEANUP SCRIPT (ROBUST POST & SCHEMA DETECTION)
-- ============================================================================

DO $$
DECLARE
    -- ⚠️ Set to FALSE to execute ACTUAL deletion
    dry_run BOOLEAN := true; 
    
    c_platform_tenant_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    c_superadmin_role CONSTANT TEXT := 'SUPER_ADMIN';

    v_superadmin_count INTEGER := 0;
    
    -- Helper variables for dynamic query execution
    v_count INTEGER := 0;
    v_tbl_name TEXT;
    v_tenant_col TEXT;
    v_author_col TEXT;
    v_query TEXT;

BEGIN
    RAISE NOTICE '==============================================================';
    RAISE NOTICE '   MULTI-TENANT DATA CLEANUP - NON-SUPERADMIN PURGE';
    RAISE NOTICE '==============================================================';
    
    IF dry_run THEN
        RAISE NOTICE 'MODE: DRY RUN (Preview mode - No data will be modified)';
    ELSE
        RAISE NOTICE '⚠️ MODE: LIVE EXECUTION (Destructive action - Deleting data)';
    END IF;
    
    RAISE NOTICE '==============================================================';

    -- SAFEGUARD 1: Check SuperAdmin
    SELECT COUNT(*) INTO v_superadmin_count 
    FROM "User" 
    WHERE "role" = c_superadmin_role;

    IF v_superadmin_count = 0 THEN
        RAISE EXCEPTION 'CRITICAL SAFEGUARD FAILED: No user with role % found.', c_superadmin_role;
    END IF;

    -- SAFEGUARD 2: Auto-Create Platform Tenant if missing
    INSERT INTO "Tenant" ("id", "name", "code")
    VALUES (c_platform_tenant_id, 'Platform System Tenant', 'PLATFORM')
    ON CONFLICT ("id") DO NOTHING;

    -- Link SuperAdmins to Platform Tenant (Using tenantId)
    UPDATE "User"
    SET "tenantId" = c_platform_tenant_id
    WHERE "role" = c_superadmin_role 
      AND ("tenantId" IS NULL OR "tenantId" != c_platform_tenant_id);

    RAISE NOTICE '✅ Safeguards Passed: % SUPER_ADMIN user(s) protected.', v_superadmin_count;
    RAISE NOTICE '--------------------------------------------------------------';

    -- =========================================================================
    -- DYNAMIC TABLE CLEANUP (AUTO DETECTS tenant_id vs tenantId)
    -- =========================================================================
    
    FOR v_tbl_name IN 
        SELECT unnest(ARRAY[
            'WeeklyLessonLog', 'ExamSchedule', 'Circular', 'News', 
            'Fee', 'Attendance', 'Mark', 'Homework', 'Class'
        ])
    LOOP
        -- Check if table exists in current database schema
        IF to_regclass('public.' || quote_ident(v_tbl_name)) IS NOT NULL THEN
            
            -- Detect whether table uses "tenant_id" or "tenantId" (Case-Insensitive Table Check)
            SELECT column_name INTO v_tenant_col
            FROM information_schema.columns 
            WHERE lower(table_name) = lower(v_tbl_name)
              AND column_name IN ('tenant_id', 'tenantId')
            LIMIT 1;

            IF v_tenant_col IS NOT NULL THEN
                IF dry_run THEN
                    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I != %L', v_tbl_name, v_tenant_col, c_platform_tenant_id) INTO v_count;
                    RAISE NOTICE ' - % (Preview): % records to delete', v_tbl_name, v_count;
                ELSE
                    EXECUTE format('DELETE FROM %I WHERE %I != %L', v_tbl_name, v_tenant_col, c_platform_tenant_id);
                    GET DIAGNOSTICS v_count = ROW_COUNT;
                    RAISE NOTICE ' - % (Purged): % records deleted', v_tbl_name, v_count;
                END IF;
            ELSE
                RAISE NOTICE ' - % : [No tenant column found - Skipped]', v_tbl_name;
            END IF;

        ELSE
            RAISE NOTICE ' - % : [Table does not exist - Skipped]', v_tbl_name;
        END IF;
    END LOOP;

    -- =========================================================================
    -- POSTS CLEANUP (SMART CONDITIONAL FILTERING)
    -- =========================================================================
    IF to_regclass('public."Post"') IS NOT NULL THEN
        -- Detect Tenant Column in Post
        SELECT column_name INTO v_tenant_col
        FROM information_schema.columns 
        WHERE lower(table_name) = 'post' AND column_name IN ('tenant_id', 'tenantId')
        LIMIT 1;

        -- Detect Author Column in Post
        SELECT column_name INTO v_author_col
        FROM information_schema.columns 
        WHERE lower(table_name) = 'post' AND column_name IN ('author_id', 'authorId')
        LIMIT 1;

        -- Build dynamic WHERE clause based on actual existing columns
        IF v_tenant_col IS NOT NULL AND v_author_col IS NOT NULL THEN
            v_query := format('FROM "Post" WHERE %I != %L OR %I NOT IN (SELECT "id" FROM "User" WHERE "role" = %L)', v_tenant_col, c_platform_tenant_id, v_author_col, c_superadmin_role);
        ELSIF v_author_col IS NOT NULL THEN
            v_query := format('FROM "Post" WHERE %I NOT IN (SELECT "id" FROM "User" WHERE "role" = %L)', v_author_col, c_superadmin_role);
        ELSIF v_tenant_col IS NOT NULL THEN
            v_query := format('FROM "Post" WHERE %I != %L', v_tenant_col, c_platform_tenant_id);
        ELSE
            v_query := NULL;
        END IF;

        IF v_query IS NOT NULL THEN
            IF dry_run THEN
                EXECUTE 'SELECT COUNT(*) ' || v_query INTO v_count;
                RAISE NOTICE ' - Post (Preview): % records to delete', v_count;
            ELSE
                EXECUTE 'DELETE ' || v_query;
                GET DIAGNOSTICS v_count = ROW_COUNT;
                RAISE NOTICE ' - Post (Purged): % records deleted', v_count;
            END IF;
        ELSE
            RAISE NOTICE ' - Post : [No author/tenant column found - Skipped]';
        END IF;
    END IF;

    -- Non-SuperAdmin Users Cleanup
    IF dry_run THEN
        SELECT COUNT(*) INTO v_count FROM "User" WHERE "role" != c_superadmin_role AND ("tenantId" IS NULL OR "tenantId" != c_platform_tenant_id);
        RAISE NOTICE ' - User (Preview): % non-admin users to delete', v_count;
    ELSE
        DELETE FROM "User" WHERE "role" != c_superadmin_role AND ("tenantId" IS NULL OR "tenantId" != c_platform_tenant_id);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE ' - User (Purged): % non-admin users deleted', v_count;
    END IF;

    -- Non-Platform Tenants Cleanup
    IF dry_run THEN
        SELECT COUNT(*) INTO v_count FROM "Tenant" WHERE "id" != c_platform_tenant_id;
        RAISE NOTICE ' - Tenant (Preview): % tenants to delete', v_count;
    ELSE
        DELETE FROM "Tenant" WHERE "id" != c_platform_tenant_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE ' - Tenant (Purged): % tenants deleted', v_count;
    END IF;

    RAISE NOTICE '==============================================================';
    IF dry_run THEN
        RAISE NOTICE 'DRY RUN COMPLETED: No records were modified.';
        RAISE NOTICE 'To execute live purge, set "dry_run BOOLEAN := false;" on line 8.';
    ELSE
        RAISE NOTICE '✅ CLEANUP COMPLETED SUCCESSFULLY!';
    END IF;

END $$;