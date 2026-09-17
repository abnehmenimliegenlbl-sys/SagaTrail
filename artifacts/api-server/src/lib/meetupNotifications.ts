import { and, eq, gte, isNull, lte, lt } from "drizzle-orm";

import {
  db,
  meetupNotificationOutboxTable,
  meetupParticipantsTable,
  meetupRemindersTable,
  meetupsTable,
  profilesTable,
} from "@workspace/db";
import { logger } from "./logger";

type ReminderKind = "day_before" | "soon";
type MeetupPushData = {
  type: "meetup_reminder" | "meetup_cancelled" | "meetup_delayed" | "meetup_started" | "meetup_completed" | "meetup_message";
  meetupId: string;
};

async function sendPush(token: string, title: string, body: string, data: MeetupPushData): Promise<void> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ to: token, title, body, sound: "default", data }),
  });
  if (!response.ok) throw new Error(`Expo Push ${response.status}`);
  const payload = await response.json() as { data?: { status?: string; message?: string } };
  if (payload.data?.status !== "ok") {
    throw new Error(`Expo Push abgelehnt: ${payload.data?.message ?? payload.data?.status ?? "unbekannt"}`);
  }
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
        await sendPush(participant.pushToken, text.title, text.body, {
          type: "meetup_reminder",
          meetupId: meetup.id,
        });
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

function cancelledText(language: string, routeName: string, reason: string, actorName: string | null) {
  const suffix = actorName ? ` (${actorName})` : "";
  if (language === "gsw") return { title: "Wanderig abgseit", body: `${routeName}: ${reason}${suffix}` };
  if (language === "fr") return { title: "Randonnée annulée", body: `${routeName}: ${reason}${suffix}` };
  if (language === "it") return { title: "Escursione annullata", body: `${routeName}: ${reason}${suffix}` };
  if (language === "en") return { title: "Hike cancelled", body: `${routeName}: ${reason}${suffix}` };
  if (language === "zh") return { title: "徒步活动已取消", body: `${routeName}：${reason}${suffix}` };
  if (language === "es") return { title: "Caminata cancelada", body: `${routeName}: ${reason}${suffix}` };
  if (language === "pt") return { title: "Caminhada cancelada", body: `${routeName}: ${reason}${suffix}` };
  if (language === "ru") return { title: "Поход отменён", body: `${routeName}: ${reason}${suffix}` };
  return { title: "Wanderung abgesagt", body: `${routeName}: ${reason}${suffix}` };
}

function delayedText(language: string, routeName: string, delayMinutes: number, actorName: string | null) {
  const suffix = actorName ? ` (${actorName})` : "";
  if (language === "gsw") return { title: "Verspötig bim Treffpunkt", body: `${routeName}: öppe ${delayMinutes} Minute spöter${suffix}` };
  if (language === "fr") return { title: "Retard au rendez-vous", body: `${routeName}: environ ${delayMinutes} minutes de retard${suffix}` };
  if (language === "it") return { title: "Ritardo al ritrovo", body: `${routeName}: circa ${delayMinutes} minuti di ritardo${suffix}` };
  if (language === "en") return { title: "Delayed at meetup", body: `${routeName}: about ${delayMinutes} minutes late${suffix}` };
  if (language === "zh") return { title: "集合将迟到", body: `${routeName}：约迟到 ${delayMinutes} 分钟${suffix}` };
  if (language === "es") return { title: "Retraso en el encuentro", body: `${routeName}: unos ${delayMinutes} minutos tarde${suffix}` };
  if (language === "pt") return { title: "Atraso no encontro", body: `${routeName}: cerca de ${delayMinutes} minutos de atraso${suffix}` };
  if (language === "ru") return { title: "Опоздание на встречу", body: `${routeName}: опоздание примерно на ${delayMinutes} мин.${suffix}` };
  return { title: "Verspätung beim Treffpunkt", body: `${routeName}: ungefähr ${delayMinutes} Minuten später${suffix}` };
}

function lifecycleText(language: string, routeName: string, type: "meetup_started" | "meetup_completed") {
  const started = type === "meetup_started";
  const texts: Record<string, { title: string; body: string }> = {
    de: started ? { title: "Wanderung gestartet", body: `${routeName} hat begonnen` } : { title: "Wanderung abgeschlossen", body: `${routeName} ist abgeschlossen` },
    gsw: started ? { title: "Wanderig isch los", body: `${routeName} het aagfange` } : { title: "Wanderig fertig", body: `${routeName} isch abgschlosse` },
    fr: started ? { title: "Randonnée commencée", body: `${routeName} a commencé` } : { title: "Randonnée terminée", body: `${routeName} est terminée` },
    it: started ? { title: "Escursione iniziata", body: `${routeName} è iniziata` } : { title: "Escursione completata", body: `${routeName} è terminata` },
    en: started ? { title: "Hike started", body: `${routeName} has started` } : { title: "Hike completed", body: `${routeName} is complete` },
    zh: started ? { title: "徒步已开始", body: `${routeName} 已开始` } : { title: "徒步已完成", body: `${routeName} 已完成` },
    es: started ? { title: "Caminata iniciada", body: `${routeName} ha comenzado` } : { title: "Caminata completada", body: `${routeName} ha terminado` },
    pt: started ? { title: "Caminhada iniciada", body: `${routeName} começou` } : { title: "Caminhada concluída", body: `${routeName} foi concluída` },
    ru: started ? { title: "Поход начался", body: `${routeName} начался` } : { title: "Поход завершён", body: `${routeName} завершён` },
  };
  return texts[language] ?? texts.de;
}

function messageText(language: string, routeName: string, text: string, actorName: string | null) {
  const sender = actorName ? ` (${actorName})` : "";
  const titles: Record<string, string> = {
    de: "Neue Nachricht zur Wanderung", gsw: "Neui Nachricht zur Wanderig", fr: "Nouveau message de randonnée",
    it: "Nuovo messaggio sull'escursione", en: "New hike message", zh: "徒步新消息",
    es: "Nuevo mensaje de la caminata", pt: "Nova mensagem da caminhada", ru: "Новое сообщение о походе",
  };
  return { title: titles[language] ?? titles.de, body: `${routeName}: ${text}${sender}` };
}

async function claimNextOutboxRow(now: Date) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(meetupNotificationOutboxTable)
      .where(
        and(
          isNull(meetupNotificationOutboxTable.sentAt),
          lte(meetupNotificationOutboxTable.nextAttemptAt, now),
        ),
      )
      .for("update", { skipLocked: true })
      .limit(1);
    if (!row) return null;
    const attempts = row.attempts + 1;
    await tx
      .update(meetupNotificationOutboxTable)
      .set({
        attempts,
        nextAttemptAt: new Date(now.getTime() + 30 * 60_000),
      })
      .where(eq(meetupNotificationOutboxTable.id, row.id));
    return { ...row, attempts };
  });
}
type OutboxRow = NonNullable<Awaited<ReturnType<typeof claimNextOutboxRow>>>;

async function markOutboxSent(id: string): Promise<void> {
  await db
    .update(meetupNotificationOutboxTable)
    .set({ sentAt: new Date() })
    .where(eq(meetupNotificationOutboxTable.id, id));
}

async function markOutboxFailure(
  id: string,
  attempts: number,
  meetupId: string,
  recipientUserId: string,
  error: unknown,
): Promise<void> {
  if (attempts >= 8) {
    await markOutboxSent(id);
    logger.error({ error, meetupId, recipientUserId, attempts }, "Treffpunkt-Benachrichtigung nach acht Versuchen verworfen");
    return;
  }
  const retryDelay = Math.min(30 * 60_000, 30_000 * 2 ** (attempts - 1));
  await db
    .update(meetupNotificationOutboxTable)
    .set({ nextAttemptAt: new Date(Date.now() + retryDelay) })
    .where(eq(meetupNotificationOutboxTable.id, id));
  logger.warn({ error, meetupId, recipientUserId, attempts, retryDelay }, "Treffpunkt-Benachrichtigung wird erneut versucht");
}

async function deliverOutboxRow(row: OutboxRow): Promise<void> {
  const [context] = await db
    .select({
      pushToken: profilesTable.pushToken,
      language: profilesTable.language,
      routeName: meetupsTable.routeName,
    })
    .from(meetupNotificationOutboxTable)
    .leftJoin(profilesTable, eq(profilesTable.id, meetupNotificationOutboxTable.recipientUserId))
    .leftJoin(meetupsTable, eq(meetupsTable.id, meetupNotificationOutboxTable.meetupId))
    .where(eq(meetupNotificationOutboxTable.id, row.id))
    .limit(1);
  if (!context?.pushToken || !context.routeName) {
    await markOutboxSent(row.id);
    return;
  }
  if (!["meetup_cancelled", "meetup_delayed", "meetup_started", "meetup_completed", "meetup_message"].includes(row.type)) {
    await markOutboxSent(row.id);
    logger.warn({ meetupId: row.meetupId, outboxId: row.id, type: row.type }, "Unbekannter Treffpunkt-Outbox-Typ verworfen");
    return;
  }
  const language = context.language ?? "de";
  const data: MeetupPushData = { type: row.type as MeetupPushData["type"], meetupId: row.meetupId };
  const message = row.type === "meetup_cancelled"
    ? cancelledText(language, context.routeName, row.cancellationReason ?? "Treffpunkt abgesagt", row.actorName)
    : row.type === "meetup_delayed"
      ? delayedText(language, context.routeName, row.delayMinutes ?? 5, row.actorName)
      : row.type === "meetup_message"
        ? messageText(language, context.routeName, row.messageText ?? "", row.actorName)
        : lifecycleText(language, context.routeName, row.type);
  try {
    await sendPush(context.pushToken, message.title, message.body, data);
    await markOutboxSent(row.id);
  } catch (error) {
    await markOutboxFailure(row.id, row.attempts, row.meetupId, row.recipientUserId, error);
  }
}

export async function sendMeetupNotificationOutbox(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const row = await claimNextOutboxRow(new Date());
    if (!row) return;
    await deliverOutboxRow(row);
  }
}

export function startMeetupNotificationOutboxWorker(): void {
  void sendMeetupNotificationOutbox().catch((error) => logger.error({ error }, "Treffpunkt-Outbox fehlgeschlagen"));
  setInterval(() => {
    void sendMeetupNotificationOutbox().catch((error) => logger.error({ error }, "Treffpunkt-Outbox fehlgeschlagen"));
  }, 30_000);
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
  startMeetupNotificationOutboxWorker();
  void sendMeetupReminders().catch((error) => logger.error({ error }, "Treffpunkt-Erinnerungen fehlgeschlagen"));
  setInterval(() => {
    void sendMeetupReminders().catch((error) => logger.error({ error }, "Treffpunkt-Erinnerungen fehlgeschlagen"));
  }, 15 * 60_000);
}