import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type TrailConditionLevel =
  | "excellent"
  | "clear"
  | "muddy"
  | "snow"
  | "icy"
  | "blocked";

/**
 * Community-gemeldete Wegbedingungen fuer eine Route. Berichte laufen nach
 * 7 Tagen aus und werden beim Abruf serverseitig gefiltert. Pro User und Route
 * ist maximal ein Bericht pro 2 Stunden erlaubt.
 */
export const trailConditionReportsTable = pgTable("trail_condition_reports", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  condition: text("condition").$type<TrailConditionLevel>().notNull(),
  note: text("note"),
  reportedAt: timestamp("reported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTrailConditionSchema = createInsertSchema(
  trailConditionReportsTable,
).omit({ reportedAt: true });

export type InsertTrailCondition = z.infer<typeof insertTrailConditionSchema>;
export type TrailConditionRow =
  typeof trailConditionReportsTable.$inferSelect;
