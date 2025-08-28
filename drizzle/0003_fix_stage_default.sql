-- Migration: Fix stage default value from 'NEW' to 'Not contacted'
-- This migration fixes the default stage value for the leads table

-- Step 1: Change the default value for the stage column
ALTER TABLE "leads" ALTER COLUMN "stage" SET DEFAULT 'Not contacted';

-- Step 2: Update existing leads that have "NEW" stage to "Not contacted"
UPDATE "leads" SET "stage" = 'Not contacted' WHERE "stage" = 'NEW';

-- Step 3: Add a comment to document the change
COMMENT ON COLUMN "leads"."stage" IS 'Lead stage with default "Not contacted"'; 