import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
const PERSISTED_TAGS = new Set(["decision_flow", "story_audio"]);
let tableReady: Promise<void> | null = null;

function ensureDebugLogTable(): Promise<void> {
  if (!tableReady) {
    tableReady = db
      .execute(sql`
        CREATE TABLE IF NOT EXISTS client_debug_logs (
          id BIGSERIAL PRIMARY KEY,
          tag TEXT NOT NULL,
          message TEXT NOT NULL,
          event_id TEXT,
          emitted_at TIMESTAMPTZ,
          sequence INTEGER,
          client_hike_id TEXT,
          hike_debug_instance_id TEXT,
          data JSONB NOT NULL DEFAULT '[]'::jsonb,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      .then(() =>
        db.execute(sql`
          CREATE INDEX IF NOT EXISTS client_debug_logs_received_idx
          ON client_debug_logs (received_at DESC)
        `),
      )
      .then(() => undefined);
  }
  return tableReady;
}

function firstDataObject(data: unknown): Record<string, unknown> {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Nimmt Debug-Log-Zeilen vom Client entgegen und schreibt sie in die
 * Server-Logs. Noetig, weil `console.log` in einem TestFlight-/App-Store-Build
 * nur lokal auf dem Geraet landet — ohne Weiterleitung sind Kauf-Probleme
 * (z.B. der IAP-Freeze) auf einem echten Geraet sonst nur per Mac/Xcode-
 * Konsole einsehbar. Bewusst ohne Auth: die Paywall-Logs werden schon vor
 * einer eventuellen Anmeldung erzeugt, und der Inhalt ist nicht sensibel.
 */
router.post("/debug/log", async (req, res) => {
  const { tag, message, data, eventId, emittedAt, sequence } = req.body ?? {};
  const normalizedTag = typeof tag === "string" ? tag : "client";
  const normalizedMessage =
    typeof message === "string" ? message : "log";
  req.log.info(
    {
      tag: normalizedTag,
      eventId: typeof eventId === "string" ? eventId : undefined,
      emittedAt: typeof emittedAt === "string" ? emittedAt : undefined,
      sequence: Number.isFinite(sequence) ? sequence : undefined,
      data,
    },
    `[CLIENT-DEBUG] ${normalizedMessage}`,
  );
  if (PERSISTED_TAGS.has(normalizedTag)) {
    try {
      await ensureDebugLogTable();
      const context = firstDataObject(data);
      await db.execute(sql`
        INSERT INTO client_debug_logs (
          tag, message, event_id, emitted_at, sequence,
          client_hike_id, hike_debug_instance_id, data
        )
        VALUES (
          ${normalizedTag},
          ${normalizedMessage},
          ${typeof eventId === "string" ? eventId : null},
          ${typeof emittedAt === "string" ? emittedAt : null},
          ${Number.isFinite(sequence) ? sequence : null},
          ${typeof context.clientHikeId === "string" ? context.clientHikeId : null},
          ${typeof context.hikeDebugInstanceId === "string"
            ? context.hikeDebugInstanceId
            : null},
          ${JSON.stringify(Array.isArray(data) ? data : [])}::jsonb
        )
      `);
    } catch (error) {
      req.log.error(
        { error, tag: normalizedTag, eventId },
        "Persisting client debug log failed",
      );
    }
  }
  res.status(204).end();
});

router.get("/debug/logs", async (req, res) => {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.header("x-admin-token");
  if (!expected || !provided || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const requestedTag =
    typeof req.query.tag === "string" && PERSISTED_TAGS.has(req.query.tag)
      ? req.query.tag
      : null;
  const parsedLimit = Number(req.query.limit ?? 500);
  const limit = Math.max(1, Math.min(2_000, Number.isFinite(parsedLimit) ? parsedLimit : 500));
  try {
    await ensureDebugLogTable();
    const result = requestedTag
      ? await db.execute(sql`
          SELECT id, tag, message, event_id AS "eventId",
            emitted_at AS "emittedAt", sequence,
            client_hike_id AS "clientHikeId",
            hike_debug_instance_id AS "hikeDebugInstanceId",
            data, received_at AS "receivedAt"
          FROM client_debug_logs
          WHERE tag = ${requestedTag}
          ORDER BY id DESC
          LIMIT ${limit}
        `)
      : await db.execute(sql`
          SELECT id, tag, message, event_id AS "eventId",
            emitted_at AS "emittedAt", sequence,
            client_hike_id AS "clientHikeId",
            hike_debug_instance_id AS "hikeDebugInstanceId",
            data, received_at AS "receivedAt"
          FROM client_debug_logs
          ORDER BY id DESC
          LIMIT ${limit}
        `);
    res.json({ logs: result.rows });
  } catch (error) {
    req.log.error({ error }, "Reading persisted client debug logs failed");
    res.status(500).json({ error: "Debug logs unavailable" });
  }
});

export default router;
