import { check, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { communitiesTable } from "./communities";

export const meetupsTable = pgTable("meetups", {
  id: uuid("id").defaultRandom().primaryKey(),
  routeId: text("route_id").notNull(),
  routeName: text("route_name").notNull(),
  canton: text("canton").notNull(),
  communityId: uuid("community_id").references(() => communitiesTable.id, { onDelete: "set null" }),
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
}, (table) => [
  index("meetups_community_starts_idx").on(table.communityId, table.startsAt),
  check("meetups_status_check", sql`${table.status} in ('scheduled', 'in_progress', 'completed', 'cancelled')`),
]);

export const meetupParticipantsTable = pgTable(
  "meetup_participants",
  {
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    attendanceStatus: text("attendance_status").notNull().default("confirmed"),
    delayMinutes: integer("delay_minutes"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).notNull().defaultNow(),
    nameMentionConsentAt: timestamp("name_mention_consent_at", { withTimezone: true }),
    nameMentionConsentVersion: text("name_mention_consent_version"),
  },
  (table) => [primaryKey({ columns: [table.meetupId, table.userId] })],
);

export const meetupWaitlistTable = pgTable(
  "meetup_waitlist",
  {
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.meetupId, table.userId] }),
    index("meetup_waitlist_meetup_joined_idx").on(table.meetupId, table.joinedAt),
  ],
);

export const meetupMessagesTable = pgTable(
  "meetup_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetupId: uuid("meetup_id").notNull().references(() => meetupsTable.id, { onDelete: "cascade" }),
    senderUserId: text("sender_user_id").notNull(),
    senderName: text("sender_name").notNull(),
    messageText: text("message_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("meetup_messages_meetup_created_idx").on(table.meetupId, table.createdAt),
    check("meetup_messages_text_length_check", sql`char_length(${table.messageText}) between 1 and 500`),
  ],
);

export type MeetupRow = typeof meetupsTable.$inferSelect;
export type MeetupParticipantRow = typeof meetupParticipantsTable.$inferSelect;
export type MeetupWaitlistRow = typeof meetupWaitlistTable.$inferSelect;
export type MeetupMessageRow = typeof meetupMessagesTable.$inferSelect;

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
    actorUserId: text("actor_user_id"),
    messageText: text("message_text"),
    delayMinutes: integer("delay_minutes"),
    cancellationReason: text("cancellation_reason"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("meetup_notification_outbox_dedupe_key_unique").on(table.dedupeKey),
    index("meetup_notification_outbox_meetup_type_created_idx").on(table.meetupId, table.type, table.createdAt),
    index("meetup_notification_outbox_meetup_actor_created_idx").on(table.meetupId, table.actorUserId, table.createdAt),
    check(
      "meetup_notification_outbox_type_check",
      sql`${table.type} in ('meetup_cancelled', 'meetup_delayed', 'meetup_started', 'meetup_completed', 'meetup_message', 'meetup_updated', 'meetup_promoted')`,
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