-- Fix the default stage value for leads table
-- Run this SQL directly in your database

-- 1. Change the default value for new leads
ALTER TABLE "leads" ALTER COLUMN "stage" SET DEFAULT 'Not contacted';

-- 2. Update existing leads that have "NEW" stage to "Not contacted"
UPDATE "leads" SET "stage" = 'Not contacted' WHERE "stage" = 'NEW';

-- 3. Verify the change
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'stage';

-- 4. Check how many leads were updated
SELECT COUNT(*) as updated_leads FROM "leads" WHERE "stage" = 'Not contacted'; 