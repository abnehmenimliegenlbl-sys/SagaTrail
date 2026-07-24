import { getRoutePhoto } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import { HikingRoute } from "@/constants/routes";
import { panoramaFuerRoute } from "@/lib/panorama";

/**
 * Laedt fuer eine Route ein Foto – DB-first, dann Wiki-Fallback.
 *
 * 1. route.photoUrl vorhanden (aus DB via API)?  → sofort anzeigen, kein Request.
 * 2. Nicht in DB?  → /routes/photo (Wikimedia-Suche); Server persistiert Ergebnis.
 * 3. Kein Ergebnis  → gebuendeltes Saison-Panorama.
 */

export interface RouteFoto {
  source: ImageSourcePropType;
  fallback: ImageSourcePropType;
  attribution: string | null;
}

interface GecachtesFoto {
  url: string | null;
  attribution: string | null;
}

const fotoCache = new Map<string, GecachtesFoto>();
const laufend   = new Map<string, Promise<GecachtesFoto>>();

function cacheKey(route: HikingRoute): string {
  return `${route.coordinates.lat.toFixed(3)}|${route.coordinates.lng.toFixed(3)}`;
}

export function clearRouteFotoCache(route: HikingRoute): void {
  fotoCache.delete(cacheKey(route));
}

async function ladeFoto(route: HikingRoute): Promise<GecachtesFoto> {
  const key = cacheKey(route);
  const hit = fotoCache.get(key);
  if (hit) return hit;
  const laufendes = laufend.get(key);
  if (laufendes) return laufendes;

  const anfrage = getRoutePhoto({
    lat:       route.coordinates.lat,
    lng:       route.coordinates.lng,
    routeId:   route.id,
    routeName: route.name,
  } as Parameters<typeof getRoutePhoto>[0])
    .then((r): GecachtesFoto => {
      const f: GecachtesFoto = { url: r.photoUrl ?? null, attribution: r.attribution ?? null };
      fotoCache.set(key, f);
      return f;
    })
    .catch((): GecachtesFoto => ({ url: null, attribution: null }))
    .finally(() => laufend.delete(key));

  laufend.set(key, anfrage);
  return anfrage;
}

export function useRouteFoto(route: HikingRoute): RouteFoto {
  const fallback = panoramaFuerRoute(route.maxElevationM);

  function sofort(): GecachtesFoto | null {
    if (route.photoUrl) return { url: route.photoUrl, attribution: route.photoAttribution ?? null };
    return fotoCache.get(cacheKey(route)) ?? null;
  }

  const [foto, setFoto] = useState<GecachtesFoto | null>(sofort);

  useEffect(() => {
    // Schritt 1: URL direkt aus DB-Response → kein weiterer Request.
    if (route.photoUrl) {
      setFoto({ url: route.photoUrl, attribution: route.photoAttribution ?? null });
      return;
    }
    // Schritt 2: Wiki-Fallback via /routes/photo.
    let aktiv = true;
    ladeFoto(route).then((f) => { if (aktiv) setFoto(f); });
    return () => { aktiv = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey(route), route.photoUrl]);

  if (foto?.url) {
    return { source: { uri: foto.url }, fallback, attribution: foto.attribution };
  }
  return { source: fallback, fallback, attribution: null };
}
