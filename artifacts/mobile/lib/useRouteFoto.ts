import { getRoutePhoto } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

import { HikingRoute } from "@/constants/routes";
import { panoramaFuerRoute } from "@/lib/panorama";

/**
 * Laedt fuer eine Route ein echtes, moeglichst saisonpassendes Foto aus der
 * Umgebung des Startpunkts (Wikimedia Commons, ueber den eigenen API-Server).
 *
 * Wenn das Foto bereits in der Route-Antwort mitgeliefert wurde (route.photoUrl),
 * wird kein separater Netzwerkrequest gemacht. Andernfalls ruft der Hook den
 * /routes/photo-Endpunkt auf, der das Ergebnis anschliessend in der DB
 * persistiert (routeId mitschicken), sodass kuenftige Ladungen direkt das Foto
 * aus der Route-Antwort bekommen.
 *
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
    // routeId + routeName mitschicken: Server persistiert das Foto in external_routes
    // und nutzt den Namen als Fallback-Textsuche wenn Geosuche kein Landschaftsfoto findet
    routeId: route.id,
    routeName: route.name,
  } as Parameters<typeof getRoutePhoto>[0])
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

  // Sofort-Ergebnis: bevorzuge das in der Route-Antwort mitgelieferte Foto
  // (kein Netzwerkrequest noetig), sonst schaue in den Sitzungs-Cache.
  function sofortFoto(): GecachtesFoto | null {
    if (route.photoUrl) {
      return { url: route.photoUrl, attribution: route.photoAttribution ?? null };
    }
    return fotoCache.get(schluessel) ?? null;
  }

  const [foto, setFoto] = useState<GecachtesFoto | null>(sofortFoto);

  useEffect(() => {
    // Wenn die Route bereits ein Foto hat, brauchen wir keinen API-Aufruf.
    if (route.photoUrl) {
      setFoto({ url: route.photoUrl, attribution: route.photoAttribution ?? null });
      return;
    }
    let aktiv = true;
    ladeFoto(route).then((geladen) => {
      if (aktiv) setFoto(geladen);
    });
    return () => {
      aktiv = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, route.photoUrl]);

  if (foto?.url) {
    return { source: { uri: foto.url }, attribution: foto.attribution };
  }
  return { source: fallback, attribution: null };
}
