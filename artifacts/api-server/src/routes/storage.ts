import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

/**
 * GET /storage/objects/*
 * Liefert ein gespeichertes Objekt aus GCS (Fotos, Audio, …).
 */
router.get("/storage/objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${filePath}`;
    const file = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((v, k) => res.setHeader(k, v));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Nicht gefunden" });
    } else {
      req.log.error({ err }, "Fehler beim Servieren des Objekts");
      res.status(500).json({ error: "Fehler beim Laden" });
    }
  }
});

export default router;
