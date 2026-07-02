import type { Logger } from "pino";
import { downsample, wgs84ToLV95, type LatLng } from "./geo";

/**
 * Berechnet die Aufstiegs-Hoehenmeter entlang eines Wegverlaufs ueber den
 * amtlichen swisstopo-Profildienst (api3.geo.admin.ch/rest/services/profile.json).
 *
 * Der Dienst akzeptiert nur Schweizer Bezugssysteme (LV95 = EPSG:2056), daher
 * werden die WGS84-Punkte vorher umgerechnet. Zur Begrenzung der Anfragegroesse
 * wird der Verlauf auf wenige Stuetzpunkte ausgeduennt; swisstopo interpoliert
 * das Feinprofil dazwischen selbst.
 */

const PROFILE_URL = "https://api3.geo.admin.ch/rest/services/profile.json";
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
const MAX_INPUT_POINTS = 100;

interface ProfilePoint {
  alts?: { COMB?: number; DTM2?: number; DTM25?: number };
}

/** Summe der positiven Hoehenunterschiede (Aufstieg) in Metern, oder null bei Fehler. */
export async function computeAscentM(
  points: LatLng[],
  log: Logger,
): Promise<number | null> {
  if (points.length < 2) return 0;
  const reduced = downsample(points, MAX_INPUT_POINTS);
  const coordinates = reduced.map((p) => wgs84ToLV95(p.lat, p.lng));
  const geom = JSON.stringify({ type: "LineString", coordinates });

  try {
    const url = `${PROFILE_URL}?sr=2056&geom=${encodeURIComponent(geom)}`;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      log.warn({ status: res.status }, "swisstopo-Profil: HTTP-Fehler");
      return null;
    }
    const data = (await res.json()) as ProfilePoint[];
    if (!Array.isArray(data) || data.length === 0) return null;

    let ascent = 0;
    let prev: number | null = null;
    for (const p of data) {
      const alt = p.alts?.COMB ?? p.alts?.DTM2 ?? p.alts?.DTM25;
      if (typeof alt !== "number") continue;
      if (prev != null && alt > prev) ascent += alt - prev;
      prev = alt;
    }
    return Math.round(ascent);
  } catch (err) {
    log.warn({ err }, "swisstopo-Profil: Anfrage fehlgeschlagen");
    return null;
  }
}
