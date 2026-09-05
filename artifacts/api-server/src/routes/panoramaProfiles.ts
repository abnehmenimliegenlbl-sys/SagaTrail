import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { computeElevationProfile } from "../lib/elevation";

const router: IRouter = Router();

const BodySchema = z.object({
  observer: z.object({
    lat: z.number().finite().min(45).max(48.5),
    lng: z.number().finite().min(5).max(11),
  }),
  peaks: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        lat: z.number().finite().min(45).max(48.5),
        lng: z.number().finite().min(5).max(11),
      }),
    )
    .min(1)
    .max(8),
});

function sampleLine(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  sampleCount = 32,
): { lat: number; lng: number }[] {
  return Array.from({ length: sampleCount }, (_, index) => {
    const fraction = index / (sampleCount - 1);
    return {
      lat: start.lat + (end.lat - start.lat) * fraction,
      lng: start.lng + (end.lng - start.lng) * fraction,
    };
  });
}

/**
 * POST /panorama-profiles
 * Liefert echte SwissTopo-DTM-Profile vom aktuellen Beobachter bis zu den
 * sichtbaren Gipfeln. Einzelne nicht verfügbare Profile werden ausgelassen,
 * damit die übrigen Gipfel weiterhin dargestellt werden können.
 */
router.post("/panorama-profiles", async (req: Request, res: Response): Promise<void> => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "observer und höchstens acht Gipfel mit gültigen Koordinaten erwartet.",
    });
    return;
  }

  const uniquePeaks = Array.from(
    new Map(parsed.data.peaks.map((peak) => [peak.id, peak])).values(),
  );
  const profiles: Array<{
    peakId: string;
    profile: Array<{ distanceKm: number; altM: number }>;
  }> = [];
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < uniquePeaks.length) {
      const peak = uniquePeaks[nextIndex++];
      if (!peak) return;
      try {
        const profile = await computeElevationProfile(
          sampleLine(parsed.data.observer, peak),
          req.log,
        );
        if (profile && profile.length >= 2) {
          profiles.push({ peakId: peak.id, profile });
        }
      } catch (err) {
        // Ein einzelnes SwissTopo-Profil darf die sichtbaren Nachbarn nicht
        // ausblenden. Der Client zeigt für diesen Gipfel nur den Marker.
        req.log.warn({ err, peakId: peak.id }, "Panorama-Profil für Gipfel nicht verfügbar");
      }
    }
  };

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(3, uniquePeaks.length) },
        () => worker(),
      ),
    );
    res.json({ profiles });
  } catch (err) {
    req.log.error({ err }, "Panorama-Höhenprofile fehlgeschlagen");
    res.status(502).json({ error: "Panorama-Höhenprofile konnten nicht geladen werden." });
  }
});

export default router;