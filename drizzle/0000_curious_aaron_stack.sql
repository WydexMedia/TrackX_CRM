CREATE TABLE "call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_phone" varchar(32) NOT NULL,
	"salesperson_id" varchar(64),
	"phone" varchar(32) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"duration_ms" integer,
	"completed" boolean DEFAULT false,
	"qualified" boolean,
	"status" varchar(32) DEFAULT 'NONE',
	"notes" text,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" varchar(32) DEFAULT 'NOT_CONFIGURED' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"metrics_24h" jsonb,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_phone" varchar(32) NOT NULL,
	"type" varchar(48) NOT NULL,
	"data" jsonb,
	"at" timestamp with time zone DEFAULT now(),
	"actor_id" varchar(64),
	"tenant_id" integer
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"phone" varchar(32) PRIMARY KEY NOT NULL,
	"name" varchar(160),
	"email" varchar(256),
	"source" varchar(64),
	"utm" jsonb,
	"stage" varchar(48) DEFAULT 'NEW' NOT NULL,
	"owner_id" varchar(64),
	"score" integer DEFAULT 0,
	"last_activity_at" timestamp with time zone,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"consent" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"tenant_id" integer,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_phone" varchar(32) NOT NULL,
	"title" varchar(160) NOT NULL,
	"status" varchar(24) DEFAULT 'OPEN' NOT NULL,
	"type" varchar(24) DEFAULT 'OTHER',
	"owner_id" varchar(64),
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"subdomain" varchar(63) NOT NULL,
	"name" varchar(160),
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_subdomain_idx" ON "tenants" USING btree ("subdomain");