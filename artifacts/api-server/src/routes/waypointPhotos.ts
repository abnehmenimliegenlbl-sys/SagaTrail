import express, { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { waypointPhotos } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

const PostPhotoBody = z.object({
  sagaId: z.string().min(1),
  routeId: z.string().optional(),
  chapterIndex: z.number().int().min(0).optional(),
  objectPath: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  caption: z.string().max(200).optional(),
});

const UploadQuerySchema = z.object({
  sagaId: z.string().min(1),
  routeId: z.string().optional(),
  chapterIndex: z.coerce.number().int().min(0).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  caption: z.string().max(200).optional(),
});

/**
 * POST /waypoint-photos/upload
 * Kombinierter Endpunkt: nimmt Bild-Binary (image/jpeg) als Body entgegen,
 * laedt es direkt nach GCS (via file.save()) und speichert Metadaten in der DB.
 * Metadaten kommen als Query-Parameter.
 * Erfordert Clerk-Authentifizierung.
 */
router.post(
  "/waypoint-photos/upload",
  express.raw({ type: "*/*", limit: "10mb" }),
  async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Nicht angemeldet" });
      return;
    }
    const parsed = UploadQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Ungueltige Query-Parameter", issues: parsed.error.issues });
      return;
    }
    const { sagaId, routeId, chapterIndex, lat, lng, caption } = parsed.data;
    const buffer = req.body as Buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      res.status(400).json({ error: "Kein Bild-Body empfangen" });
      return;
    }
    try {
      const objectId = randomUUID();
      const subPath = `uploads/${objectId}.jpg`;
      const objectPath = await storage.uploadBuffer(buffer, "image/jpeg", subPath);
      const [photo] = await db
        .insert(waypointPhotos)
        .values({
          id: objectId,
          userId,
          sagaId,
          routeId: routeId ?? null,
          chapterIndex: chapterIndex ?? null,
          objectPath,
          lat: lat ?? null,
          lng: lng ?? null,
          caption: caption ?? null,
        })
        .returning();
      res.status(201).json(photo);
    } catch (err) {
      req.log.error({ err }, "Fehler beim Foto-Upload");
      res.status(500).json({ error: "Foto-Upload fehlgeschlagen" });
    }
  }
);

/**
 * POST /waypoint-photos
 * Speichert Metadaten eines bereits nach GCS hochgeladenen Fotos.
 * Erfordert Clerk-Authentifizierung.
 */
router.post("/waypoint-photos", async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Nicht angemeldet" });
    return;
  }
  const parsed = PostPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Parameter", issues: parsed.error.issues });
    return;
  }
  const { sagaId, routeId, chapterIndex, objectPath, lat, lng, caption } = parsed.data;
  try {
    const [photo] = await db
      .insert(waypointPhotos)
      .values({
        id: randomUUID(),
        userId,
        sagaId,
        routeId: routeId ?? null,
        chapterIndex: chapterIndex ?? null,
        objectPath,
        lat: lat ?? null,
        lng: lng ?? null,
        caption: caption ?? null,
      })
      .returning();
    res.status(201).json(photo);
  } catch (err) {
    req.log.error({ err }, "Fehler beim Speichern des Waypoint-Fotos");
    res.status(500).json({ error: "Foto konnte nicht gespeichert werden" });
  }
});

/**
 * GET /waypoint-photos?sagaId=...
 * Community-Galerie: alle Fotos fuer eine bestimmte Sage (oeffentlich).
 */
router.get("/waypoint-photos", async (req: Request, res: Response) => {
  const sagaId = typeof req.query.sagaId === "string" ? req.query.sagaId : null;
  if (!sagaId) {
    res.status(400).json({ error: "sagaId fehlt" });
    return;
  }
  try {
    const photos = await db
      .select()
      .from(waypointPhotos)
      .where(eq(waypointPhotos.sagaId, sagaId))
      .orderBy(desc(waypointPhotos.createdAt))
      .limit(50);
    res.json(photos);
  } catch (err) {
    req.log.error({ err }, "Fehler beim Laden der Waypoint-Fotos");
    res.status(500).json({ error: "Fotos konnten nicht geladen werden" });
  }
});

export default router;
