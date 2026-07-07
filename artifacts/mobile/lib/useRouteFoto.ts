import { getRoutePhoto } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import { HikingRoute } from "@/constants/routes";
import { panoramaFuerRoute } from "@/lib/panorama";

/**
 * Laedt fuer eine Route ein echtes, moeglichst saisonpassendes Foto aus der
 * Umgebung des Startpunkts (Wikimedia Commons, ueber den eigenen API-Server).
 * Solange nichts geladen ist oder kein Foto existiert, wird das gebuendelte
 * Saison-Panorama gezeigt — die Karte hat also nie ein leeres Bild.
 */

export interface RouteFoto {
  source: ImageSourcePropType;
  /** Urheber-/Lizenzangabe des Commons-Fotos; null beim gebuendelten Fallback. */
  attribution: string | null;
}

interface GecachtesFoto {
  url: string | null;
  attribution: string | null;
}

// Modulweiter Cache: pro gerundetem Startpunkt genau eine Serverabfrage
// waehrend der App-Sitzung (der Server cached zusaetzlich selbst).
const fotoCache = new Map<string, GecachtesFoto>();
const laufend = new Map<string, Promise<GecachtesFoto>>();

function cacheSchluessel(route: HikingRoute): string {
  return `${route.coordinates.lat.toFixed(3)}|${route.coordinates.lng.toFixed(3)}`;
}

async function ladeFoto(route: HikingRoute): Promise<GecachtesFoto> {
  const schluessel = cacheSchluessel(route);
  const vorhanden = fotoCache.get(schluessel);
  if (vorhanden) return vorhanden;
  const bereits = laufend.get(schluessel);
  if (bereits) return bereits;
  const anfrage = getRoutePhoto({
    lat: route.coordinates.lat,
    lng: route.coordinates.lng,
  })
    .then((antwort) => {
      const foto: GecachtesFoto = {
        url: antwort.photoUrl ?? null,
        attribution: antwort.attribution ?? null,
      };
      fotoCache.set(schluessel, foto);
      return foto;
    })
    .catch((): GecachtesFoto => {
      // Fehler NICHT dauerhaft cachen — beim naechsten Anzeigen erneut versuchen
      return { url: null, attribution: null };
    })
    .finally(() => {
      laufend.delete(schluessel);
    });
  laufend.set(schluessel, anfrage);
  return anfrage;
}

export function useRouteFoto(route: HikingRoute): RouteFoto {
  const fallback = panoramaFuerRoute(route.maxElevationM);
  const schluessel = cacheSchluessel(route);
  const [foto, setFoto] = useState<GecachtesFoto | null>(
    () => fotoCache.get(schluessel) ?? null,
  );

  useEffect(() => {
    let aktiv = true;
    ladeFoto(route).then((geladen) => {
      if (aktiv) setFoto(geladen);
    });
    return () => {
      aktiv = false;
    };
    // Der Schluessel repraesentiert den Startpunkt — mehr braucht der Effekt nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  if (foto?.url) {
    return { source: { uri: foto.url }, attribution: foto.attribution };
  }
  return { source: fallback, attribution: null };
}
