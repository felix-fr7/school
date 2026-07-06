-- ============================================================================
-- MIGRATION: Add School Branding Fields to Tenant Table
-- Description: Adds schoolLogoUrl field for dynamic school logo display
--              on the student dashboard
-- Created: 2026-07-06
-- ============================================================================

-- Add schoolLogoUrl column to Tenant table
ALTER TABLE "Tenant" 
ADD COLUMN IF NOT EXISTS "schoolLogoUrl" VARCHAR(500) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "Tenant"."schoolLogoUrl" IS 'URL to the school logo image for dashboard display';

-- Create index for better performance if needed
CREATE INDEX IF NOT EXISTS "idx_tenant_logo_url" ON "Tenant"("schoolLogoUrl") 
WHERE "schoolLogoUrl" IS NOT NULL;