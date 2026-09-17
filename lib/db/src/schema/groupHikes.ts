import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Durable group-hike header/idempotency registry.  It intentionally has no
 * foreign key to group_sessions because rooms are ephemeral.
 */
export const groupHikesTable = pgTable("group_hikes", {
  groupHikeId: text("group_hike_id").primaryKey(),
  roomCode: text("room_code").notNull(),
  leaderId: text("leader_id").notNull(),
  clientHikeId: text("client_hike_id"),
  sagaId: text("saga_id"),
  routeId: text("route_id"),
  routeName: text("route_name"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  eligibleUserIds: text("eligible_user_ids").array().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  finishRequestedAt: timestamp("finish_requested_at", { withTimezone: true }),
});

export type GroupHikeRow = typeof groupHikesTable.$inferSelect;