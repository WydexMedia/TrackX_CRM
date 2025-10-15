CREATE TABLE "lead_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"lead_phone" varchar(32) NOT NULL,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lead_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"color" varchar(32) DEFAULT 'slate' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false,
	"tenant_id" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "alternate_number" varchar(32);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "need_followup" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "followup_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "followup_notes" text;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_list_items_unique" ON "lead_list_items" USING btree ("list_id","lead_phone","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_tenant_name_idx" ON "lead_stages" USING btree ("tenant_id","name");