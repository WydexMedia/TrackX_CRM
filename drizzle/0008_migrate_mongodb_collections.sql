-- Migration: Migrate MongoDB collections to PostgreSQL
-- This migration adds tables for users, sales, team_assignments, daily_reports, and jwt_blacklist

-- Step 1: Create users table
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"password" varchar(255) NOT NULL,
	"code" varchar(255),
	"name" varchar(255),
	"role" varchar(32) NOT NULL DEFAULT 'sales',
	"target" integer DEFAULT 0,
	"tenant_id" integer,
	"last_login" timestamp with time zone,
	"last_logout" timestamp with time zone,
	"last_token_revocation" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Step 2: Create indexes for users table
CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");
CREATE UNIQUE INDEX "users_tenant_code_idx" ON "users" ("tenant_id","code");
CREATE INDEX "users_tenant_idx" ON "users" ("tenant_id");
CREATE INDEX "users_role_idx" ON "users" ("role");

-- Step 3: Create sales table
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"course_name" varchar(255),
	"course_id" integer,
	"new_admission" varchar(10) DEFAULT 'Yes',
	"oga_name" varchar(255),
	"lead_id" integer,
	"stage_notes" text,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Step 4: Create indexes for sales table
CREATE INDEX "sales_tenant_idx" ON "sales" ("tenant_id");
CREATE INDEX "sales_created_at_idx" ON "sales" ("created_at" DESC);
CREATE INDEX "sales_oga_name_idx" ON "sales" ("oga_name");
CREATE INDEX "sales_customer_phone_idx" ON "sales" ("customer_phone");

-- Step 5: Create team_assignments table
CREATE TABLE "team_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"salesperson_id" integer NOT NULL,
	"jl_id" integer NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'active',
	"assigned_by" integer,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"deactivated_at" timestamp with time zone,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Step 6: Create indexes for team_assignments table
CREATE INDEX "team_assignments_tenant_status_idx" ON "team_assignments" ("tenant_id","status");
CREATE INDEX "team_assignments_salesperson_idx" ON "team_assignments" ("salesperson_id","status");
CREATE INDEX "team_assignments_jl_idx" ON "team_assignments" ("jl_id","status");

-- Step 7: Create daily_reports table
CREATE TABLE "daily_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- Step 8: Create indexes for daily_reports table
CREATE UNIQUE INDEX "daily_reports_tenant_date_idx" ON "daily_reports" ("tenant_id","date");

-- Step 9: Create daily_report_entries table (normalized from MongoDB array)
CREATE TABLE "daily_report_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"salesperson_name" varchar(255) NOT NULL,
	"prospects" integer DEFAULT 0,
	"collection" integer,
	"sales" integer,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);

-- Step 10: Create indexes for daily_report_entries table
CREATE INDEX "daily_report_entries_report_idx" ON "daily_report_entries" ("report_id");
CREATE INDEX "daily_report_entries_salesperson_idx" ON "daily_report_entries" ("salesperson_name");

-- Step 11: Create jwt_blacklist table
CREATE TABLE "jwt_blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(500) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now()
);

-- Step 12: Create indexes for jwt_blacklist table
CREATE UNIQUE INDEX "jwt_blacklist_token_idx" ON "jwt_blacklist" ("token");
CREATE INDEX "jwt_blacklist_revoked_at_idx" ON "jwt_blacklist" ("revoked_at");

-- Step 13: Add comments for documentation
COMMENT ON TABLE "users" IS 'User accounts migrated from MongoDB - supports multi-tenant with tenant_id';
COMMENT ON TABLE "sales" IS 'Sales/transaction records migrated from MongoDB';
COMMENT ON TABLE "team_assignments" IS 'Team hierarchy assignments (salespersons -> junior leaders) migrated from MongoDB';
COMMENT ON TABLE "daily_reports" IS 'Daily performance reports migrated from MongoDB';
COMMENT ON TABLE "daily_report_entries" IS 'Normalized salesperson entries from daily_reports.salespersons array';
COMMENT ON TABLE "jwt_blacklist" IS 'Revoked JWT tokens for session management migrated from MongoDB';

