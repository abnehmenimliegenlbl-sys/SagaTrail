import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, safetySharesTable } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();
const MAX_DURATION_MINUTES = 24 * 60;
const LOCATION_MIN_INTERVAL_MS = 8_000;

const CreateSafetyShareSchema = z.object({
  routeName: z.string().trim().min(1).max(180),
  durationMinutes: z.number().int().min(15).max(MAX_DURATION_MINUTES),
});

const LocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100_000).nullable().optional(),
});

function requireUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return null;
  }
  return userId;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function publicStatus(row: typeof safetySharesTable.$inferSelect) {
  const expired = row.status === "active" && row.expiresAt.getTime() <= Date.now();
  return {
    status: expired ? "expired" : row.status,
    routeName: row.routeName,
    startedAt: row.startedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    latestLocation: row.latestLat != null && row.latestLng != null && row.latestUpdatedAt
      ? {
          lat: row.latestLat,
          lng: row.latestLng,
          accuracy: row.latestAccuracy,
          updatedAt: row.latestUpdatedAt.toISOString(),
        }
      : null,
  };
}

async function findActiveShare(token: string) {
  const [row] = await db
    .select()
    .from(safetySharesTable)
    .where(eq(safetySharesTable.tokenHash, tokenHash(token)))
    .limit(1);
  return row ?? null;
}

// Creates a link only after the authenticated user explicitly starts sharing.
router.post("/safety-shares", async (req, res): Promise<void> => {
  const ownerId = requireUserId(req, res);
  if (!ownerId) return;
  const parsed = CreateSafetyShareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Sicherheitsfreigabe" });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.data.durationMinutes * 60_000);
  const [row] = await db
    .insert(safetySharesTable)
    .values({
      id: randomUUID(),
      tokenHash: tokenHash(token),
      ownerId,
      routeName: parsed.data.routeName,
      expiresAt,
      startedAt: now,
    })
    .returning();

  res.status(201).json({
    id: row.id,
    token,
    path: `/safety/${encodeURIComponent(token)}`,
    ...publicStatus(row),
  });
});

// The public viewer uses this read-only endpoint. It intentionally returns no
// account identity and expires links server-side as well as in the UI.
router.get("/safety-shares/:token", async (req, res): Promise<void> => {
  const token = String(req.params.token ?? "");
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) {
    res.status(404).json({ error: "Freigabe nicht gefunden" });
    return;
  }
  const row = await findActiveShare(token);
  if (!row) {
    res.status(404).json({ error: "Freigabe nicht gefunden" });
    return;
  }
  res.json(publicStatus(row));
});

// Location updates are authenticated by possession of the one-time random
// link token. They are deliberately throttled and accept only fresh GPS data
// supplied by the mobile client.
router.post("/safety-shares/:token/location", async (req, res): Promise<void> => {
  const token = String(req.params.token ?? "");
  const parsed = LocationSchema.safeParse(req.body);
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token) || !parsed.success) {
    res.status(400).json({ error: "Ungültige Position" });
    return;
  }
  const row = await findActiveShare(token);
  if (!row || row.status !== "active") {
    res.status(410).json({ error: "Freigabe ist nicht mehr aktiv" });
    return;
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.update(safetySharesTable).set({ status: "expired" }).where(eq(safetySharesTable.id, row.id));
    res.status(410).json({ error: "Freigabe ist abgelaufen" });
    return;
  }
  if (row.latestUpdatedAt && Date.now() - row.latestUpdatedAt.getTime() < LOCATION_MIN_INTERVAL_MS) {
    res.status(429).json({ error: "Zu viele Positionsupdates" });
    return;
  }
  const now = new Date();
  await db.update(safetySharesTable).set({
    latestLat: parsed.data.lat,
    latestLng: parsed.data.lng,
    latestAccuracy: parsed.data.accuracy ?? null,
    latestUpdatedAt: now,
  }).where(and(eq(safetySharesTable.id, row.id), eq(safetySharesTable.status, "active")));
  res.json({ ok: true, updatedAt: now.toISOString() });
});

router.delete("/safety-shares/:token", async (req, res): Promise<void> => {
  const ownerId = requireUserId(req, res);
  if (!ownerId) return;
  const token = String(req.params.token ?? "");
  const row = await findActiveShare(token);
  if (!row || row.ownerId !== ownerId) {
    res.status(404).json({ error: "Freigabe nicht gefunden" });
    return;
  }
  await db.update(safetySharesTable).set({
    status: "ended",
    endedAt: new Date(),
  }).where(eq(safetySharesTable.id, row.id));
  res.json({ ok: true });
});

export default router;