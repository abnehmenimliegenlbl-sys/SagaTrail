import { and, eq, gte, lt } from "drizzle-orm";

import {
  db,
  meetupParticipantsTable,
  meetupRemindersTable,
  meetupsTable,
  profilesTable,
} from "@workspace/db";
import { logger } from "./logger";

type ReminderKind = "day_before" | "soon";

async function sendPush(token: string, title: string, body: string): Promise<void> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ to: token, title, body, sound: "default", data: { type: "meetup_reminder" } }),
  });
  if (!response.ok) throw new Error(`Expo Push ${response.status}`);
}

function reminderText(language: string, routeName: string, kind: ReminderKind) {
  if (language === "fr") {
    return kind === "soon"
      ? { title: "Votre randonnée commence bientôt", body: routeName }
      : { title: "Rendez-vous demain", body: routeName };
  }
  if (language === "it") {
    return kind === "soon"
      ? { title: "La vostra escursione inizia presto", body: routeName }
      : { title: "Ritrovo domani", body: routeName };
  }
  if (language === "en") {
    return kind === "soon"
      ? { title: "Your hike starts soon", body: routeName }
      : { title: "Hike meetup tomorrow", body: routeName };
  }
  return kind === "soon"
    ? { title: "Eure Wanderung beginnt bald", body: routeName }
    : { title: "Treffpunkt morgen", body: routeName };
}

async function processWindow(kind: ReminderKind, lower: Date, upper: Date): Promise<void> {
  const meetups = await db
    .select()
    .from(meetupsTable)
    .where(
      and(
        eq(meetupsTable.status, "scheduled"),
        gte(meetupsTable.startsAt, lower),
        lt(meetupsTable.startsAt, upper),
      ),
    );

  for (const meetup of meetups) {
    const participants = await db
      .select({
        userId: meetupParticipantsTable.userId,
        pushToken: profilesTable.pushToken,
        language: profilesTable.language,
      })
      .from(meetupParticipantsTable)
      .leftJoin(profilesTable, eq(profilesTable.id, meetupParticipantsTable.userId))
      .where(eq(meetupParticipantsTable.meetupId, meetup.id));

    for (const participant of participants) {
      if (!participant.pushToken) continue;
      const [claimed] = await db
        .insert(meetupRemindersTable)
        .values({ meetupId: meetup.id, userId: participant.userId, kind })
        .onConflictDoNothing()
        .returning({ meetupId: meetupRemindersTable.meetupId });
      if (!claimed) continue;

      const text = reminderText(participant.language ?? "de", meetup.routeName, kind);
      try {
        await sendPush(participant.pushToken, text.title, text.body);
      } catch (error) {
        await db
          .delete(meetupRemindersTable)
          .where(
            and(
              eq(meetupRemindersTable.meetupId, meetup.id),
              eq(meetupRemindersTable.userId, participant.userId),
              eq(meetupRemindersTable.kind, kind),
            ),
          )
          .execute();
        logger.warn({ error, meetupId: meetup.id, userId: participant.userId }, "Treffpunkt-Erinnerung konnte nicht gesendet werden");
      }
    }
  }
}

export async function sendMeetupReminders(): Promise<void> {
  const now = new Date();
  await processWindow(
    "day_before",
    new Date(now.getTime() + 23 * 60 * 60_000),
    new Date(now.getTime() + 25 * 60 * 60_000),
  );
  await processWindow(
    "soon",
    new Date(now.getTime() + 55 * 60_000),
    new Date(now.getTime() + 65 * 60_000),
  );
}

export function startMeetupReminderCron(): void {
  void sendMeetupReminders().catch((error) => logger.error({ error }, "Treffpunkt-Erinnerungen fehlgeschlagen"));
  setInterval(() => {
    void sendMeetupReminders().catch((error) => logger.error({ error }, "Treffpunkt-Erinnerungen fehlgeschlagen"));
  }, 15 * 60_000);
}