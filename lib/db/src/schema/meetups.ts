import { check, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  status: text("status").notNull().default("scheduled"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  sharedTokenHash: text("shared_token_hash"),
  shareExpiresAt: timestamp("share_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetupParticipantsTable = pgTable(
  "meetup_participants",
  {
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    attendanceStatus: text("attendance_status").notNull().default("confirmed"),
    delayMinutes: integer("delay_minutes"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.meetupId, table.userId] })],
);

export type MeetupRow = typeof meetupsTable.$inferSelect;
export type MeetupParticipantRow = typeof meetupParticipantsTable.$inferSelect;

export const meetupRemindersTable = pgTable(
  "meetup_reminders",
  {
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.meetupId, table.userId, table.kind] })],
);

export const meetupNotificationOutboxTable = pgTable(
  "meetup_notification_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    recipientUserId: text("recipient_user_id").notNull(),
    type: text("type").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    actorName: text("actor_name"),
    delayMinutes: integer("delay_minutes"),
    cancellationReason: text("cancellation_reason"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("meetup_notification_outbox_dedupe_key_unique").on(table.dedupeKey),
    check(
      "meetup_notification_outbox_type_check",
      sql`${table.type} in ('meetup_cancelled', 'meetup_delayed')`,
    ),
  ],
);

export const meetupReportsTable = pgTable("meetup_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").notNull(),
  reportedUserId: text("reported_user_id"),
  reason: text("reason").notNull(),
  note: text("note"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetupBlocksTable = pgTable(
  "meetup_blocks",
  {
    blockerId: text("blocker_id").notNull(),
    blockedUserId: text("blocked_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedUserId] })],
);