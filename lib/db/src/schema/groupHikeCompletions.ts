import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Authoritative completion ledger for private group hikes.
 *
 * The room itself is ephemeral and deliberately is not referenced by a
 * foreign key.  The composite key makes replayed finish events harmless.
 */
export const groupHikeCompletionsTable = pgTable(
  "group_hike_completions",
  {
    groupHikeId: text("group_hike_id").notNull(),
    userId: text("user_id").notNull(),
    roomCode: text("room_code").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupHikeId, table.userId] }),
  }),
);

export type GroupHikeCompletionRow = typeof groupHikeCompletionsTable.$inferSelect;