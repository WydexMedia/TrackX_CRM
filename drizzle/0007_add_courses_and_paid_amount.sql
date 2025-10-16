-- Migration: Add courses table and course/paid amount fields to leads
-- This migration adds support for course management and payment tracking

-- Step 1: Create courses table
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"price" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Step 2: Add unique index for course name per tenant
CREATE UNIQUE INDEX "course_tenant_name_idx" ON "courses" ("tenant_id","name");

-- Step 3: Add course_id and paid_amount columns to leads table
ALTER TABLE "leads" ADD COLUMN "course_id" integer;
ALTER TABLE "leads" ADD COLUMN "paid_amount" integer;

-- Step 4: Add comments to document the new fields
COMMENT ON COLUMN "leads"."course_id" IS 'Reference to courses table - set when stage changes to customer';
COMMENT ON COLUMN "leads"."paid_amount" IS 'Amount paid in cents - set when course is selected';
COMMENT ON TABLE "courses" IS 'Course catalog per tenant with pricing information';
