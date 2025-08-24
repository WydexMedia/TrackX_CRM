DROP INDEX "tenants_subdomain_idx";--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "subdomain" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" varchar(16) DEFAULT 'MEDIUM';--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "active";--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain");