import { pgTable, varchar, integer, timestamp, boolean, jsonb, serial } from "drizzle-orm/pg-core";

export const leads = pgTable("leads", {
  phone: varchar("phone", { length: 32 }).primaryKey().notNull(),
  name: varchar("name", { length: 160 }),
  email: varchar("email", { length: 256 }),
  source: varchar("source", { length: 64 }),
  utm: jsonb("utm"),
  stage: varchar("stage", { length: 48 }).notNull().default("NEW"),
  ownerId: varchar("owner_id", { length: 64 }),
  score: integer("score").default(0),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  consent: boolean("consent").default(true),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  leadPhone: varchar("lead_phone", { length: 32 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("OPEN"),
  ownerId: varchar("owner_id", { length: 64 }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("NOT_CONFIGURED"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  metrics24h: jsonb("metrics_24h"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey().notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const leadEvents = pgTable("lead_events", {
  id: serial("id").primaryKey(),
  leadPhone: varchar("lead_phone", { length: 32 }).notNull(),
  type: varchar("type", { length: 48 }).notNull(),
  data: jsonb("data"),
  at: timestamp("at", { withTimezone: true }).defaultNow(),
  actorId: varchar("actor_id", { length: 64 }),
});


