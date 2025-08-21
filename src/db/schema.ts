import { pgTable, varchar, integer, timestamp, boolean, jsonb, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql as dsql } from "drizzle-orm";

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }),
    email: varchar("email", { length: 256 }),
    source: varchar("source", { length: 64 }),
    utm: jsonb("utm"),
    stage: varchar("stage", { length: 48 }).notNull().default("NEW"),
    ownerId: varchar("owner_id", { length: 64 }),
    score: integer("score").default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    tenantId: integer("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    consent: boolean("consent").default(true),
  },
  (t) => ({
    leadsTenantPhoneIdx: uniqueIndex("leads_tenant_phone_idx").on(t.tenantId, t.phone),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    leadPhone: varchar("lead_phone", { length: 32 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    // PENDING | DONE | SKIPPED | OPEN (backward compatibility)
    status: varchar("status", { length: 24 }).notNull().default("OPEN"),
    // CALL | FOLLOW_UP | OTHER
    type: varchar("type", { length: 24 }).default("OTHER"),
    ownerId: varchar("owner_id", { length: 64 }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    tenantId: integer("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  }
);

export const integrations = pgTable(
  "integrations",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("NOT_CONFIGURED"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    metrics24h: jsonb("metrics_24h"),
    tenantId: integer("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);

export const settings = pgTable(
  "settings",
  {
    key: varchar("key", { length: 100 }).primaryKey().notNull(),
    value: jsonb("value").notNull(),
    tenantId: integer("tenant_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  }
);

export const leadEvents = pgTable(
  "lead_events",
  {
    id: serial("id").primaryKey(),
    leadPhone: varchar("lead_phone", { length: 32 }).notNull(),
    type: varchar("type", { length: 48 }).notNull(),
    data: jsonb("data"),
    at: timestamp("at", { withTimezone: true }).defaultNow(),
    actorId: varchar("actor_id", { length: 64 }),
    tenantId: integer("tenant_id"),
  }
);

export const callLogs = pgTable(
  "call_logs",
  {
    id: serial("id").primaryKey(),
    leadPhone: varchar("lead_phone", { length: 32 }).notNull(),
    salespersonId: varchar("salesperson_id", { length: 64 }),
    phone: varchar("phone", { length: 32 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    completed: boolean("completed").default(false),
    qualified: boolean("qualified"),
    status: varchar("status", { length: 32 }).default("NONE"),
    notes: text("notes"),
    tenantId: integer("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);

// Multi-tenant: tenants registry
export const tenants = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    subdomain: varchar("subdomain", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdateFn(() => dsql`now()`),
  }
);


