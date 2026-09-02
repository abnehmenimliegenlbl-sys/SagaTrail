import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const groupSessionsTable = pgTable("group_sessions", {
  code: text("code").primaryKey(),
  leaderId: text("leader_id").notNull(),
  members: jsonb("members").$type<unknown[]>().notNull().default([]),
  rendezvous: jsonb("rendezvous").$type<unknown | null>(),
  lastHikeState: jsonb("last_hike_state").$type<unknown | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type GroupSessionRow = typeof groupSessionsTable.$inferSelect;