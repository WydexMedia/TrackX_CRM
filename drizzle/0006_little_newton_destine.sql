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
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "course_id" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "paid_amount" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "course_tenant_name_idx" ON "courses" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "call_logs_tenant_idx" ON "call_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "call_logs_lead_phone_idx" ON "call_logs" USING btree ("lead_phone");--> statement-breakpoint
CREATE INDEX "call_logs_salesperson_idx" ON "call_logs" USING btree ("salesperson_id");--> statement-breakpoint
CREATE INDEX "call_logs_started_at_idx" ON "call_logs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "call_logs_created_at_idx" ON "call_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "call_logs_completed_idx" ON "call_logs" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "leads_tenant_idx" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "leads_owner_idx" ON "leads" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "leads_stage_idx" ON "leads" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "leads_last_activity_idx" ON "leads" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "leads_followup_idx" ON "leads" USING btree ("need_followup","followup_date");--> statement-breakpoint
CREATE INDEX "tasks_tenant_idx" ON "tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tasks_owner_idx" ON "tasks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_due_at_idx" ON "tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "tasks_lead_phone_idx" ON "tasks" USING btree ("lead_phone");--> statement-breakpoint
CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");