import type { Logger } from "pino";
import { CANTON_ISO } from "./cantonIso";

/**
 * Orts-/Adresssuche und Kanton-Bestimmung ueber OpenStreetMap Nominatim
 * (oeffentlich, ohne API-Key). Dient der Eigene-Route-Eingabe: Start/Ziel
 * werden als Text gesucht und aus einer Vorschlagsliste gewaehlt.
 *
 * Nominatim verlangt einen identifizierenden User-Agent und maximal eine
 * Anfrage/Sekunde (https://operations.osmfoundation.org/policies/nominatim/).
 * Fuer eine Einzelnutzer-App reicht das ohne zusaetzliches Rate-Limiting.
 */

const SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
const RESULT_LIMIT = 6;

export interface GeocodePlace {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: { state?: string };
}

/** Sucht Orte/Adressen in der Schweiz und liefert eine kurze Vorschlagsliste. */
export async function searchPlaces(
  query: string,
  log: Logger,
): Promise<GeocodePlace[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    countrycodes: "ch",
    limit: String(RESULT_LIMIT),
    "accept-language": "de",
  });
  try {
    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      log.warn({ status: res.status }, "Nominatim-Suche: HTTP-Fehler");
      return [];
    }
    const data = (await res.json()) as NominatimResult[];
    return data
      .filter((r) => r.display_name && r.lat && r.lon)
      .map((r) => ({
        label: r.display_name as string,
        lat: Number(r.lat),
        lng: Number(r.lon),
      }));
  } catch (err) {
    log.warn({ err }, "Nominatim-Suche: Anfrage fehlgeschlagen");
    return [];
  }
}

const CANTON_NAMES = Object.keys(CANTON_ISO);

/** Ordnet einen von Nominatim gelieferten "state"-Namen einem App-Kanton zu. */
function matchCanton(state: string | undefined): string | null {
  if (!state) return null;
  const normalized = state.toLowerCase();
  return (
    CANTON_NAMES.find(
      (canton) =>
        normalized.includes(canton.toLowerCase()) ||
        canton.toLowerCase().includes(normalized),
    ) ?? null
  );
}

export interface ReverseGeocodeResult {
  label: string;
  canton: string | null;
}

/**
 * Ermittelt Anzeigename und (bestmoeglich) Kanton eines Punktes. Der Kanton
 * dient nur als Hinweis fuer die Sagen-Zuordnung; ohne Treffer bleibt er null
 * und die Sagen-Suche faellt auf die kantonsunabhaengige Naeherung zurueck.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  log: Logger,
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "14",
    addressdetails: "1",
    "accept-language": "de",
  });
  try {
    const res = await fetch(`${REVERSE_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      log.warn({ status: res.status }, "Nominatim-Reverse: HTTP-Fehler");
      return { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, canton: null };
    }
    const data = (await res.json()) as NominatimResult;
    return {
      label: data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      canton: matchCanton(data.address?.state),
    };
  } catch (err) {
    log.warn({ err }, "Nominatim-Reverse: Anfrage fehlgeschlagen");
    return { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, canton: null };
  }
}
