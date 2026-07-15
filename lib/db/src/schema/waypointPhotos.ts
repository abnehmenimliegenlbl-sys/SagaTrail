import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const waypointPhotos = pgTable("waypoint_photos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sagaId: text("saga_id").notNull(),
  routeId: text("route_id"),
  chapterIndex: integer("chapter_index"),
  objectPath: text("object_path").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WaypointPhoto = typeof waypointPhotos.$inferSelect;
export type NewWaypointPhoto = typeof waypointPhotos.$inferInsert;
