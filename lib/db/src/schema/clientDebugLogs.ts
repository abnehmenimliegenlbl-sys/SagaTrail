import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const clientDebugLogsTable = pgTable(
  "client_debug_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tag: text("tag").notNull(),
    message: text("message").notNull(),
    eventId: text("event_id"),
    emittedAt: timestamp("emitted_at", { withTimezone: true }),
    sequence: integer("sequence"),
    clientHikeId: text("client_hike_id"),
    hikeDebugInstanceId: text("hike_debug_instance_id"),
    data: jsonb("data")
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("client_debug_logs_received_idx").on(
      sql`${table.receivedAt} DESC NULLS FIRST`,
    ),
  ],
);

export type ClientDebugLogRow = typeof clientDebugLogsTable.$inferSelect;