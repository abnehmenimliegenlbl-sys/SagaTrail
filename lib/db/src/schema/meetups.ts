import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const meetupsTable = pgTable("meetups", {
  id: uuid("id").defaultRandom().primaryKey(),
  routeId: text("route_id").notNull(),
  routeName: text("route_name").notNull(),
  canton: text("canton").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  maxParticipants: integer("max_participants").notNull().default(8),
  pace: text("pace").notNull().default("gemuetlich"),
  note: text("note"),
  organizerId: text("organizer_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetupParticipantsTable = pgTable(
  "meetup_participants",
  {
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.meetupId, table.userId] })],
);

export type MeetupRow = typeof meetupsTable.$inferSelect;
export type MeetupParticipantRow = typeof meetupParticipantsTable.$inferSelect;