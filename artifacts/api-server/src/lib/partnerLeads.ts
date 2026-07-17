/**
 * Google Places API – Partner-Leads für alle Schweizer Kantone.
 * Liefert Restaurants, Bars, Cafés, Souvenir-/Outdoor-Läden in der Nähe
 * jeder Kantonshauptregion als CSV.
 */

export interface PartnerLead {
  kanton: string;
  sprache: string;
  typ: string;
  name: string;
  adresse: string;
  telefon: string;
  website: string;
  googleMaps: string;
}

const CANTON_CONFIG: {
  slug: string;
  label: string;
  sprache: string;
  lat: number;
  lng: number;
}[] = [
  { slug: "aargau",                   label: "Aargau",                   sprache: "DE",          lat: 47.3887, lng: 8.0457 },
  { slug: "appenzell_ausserrhoden",   label: "Appenzell Ausserrhoden",   sprache: "DE",          lat: 47.3656, lng: 9.2741 },
  { slug: "appenzell_innerrhoden",    label: "Appenzell Innerrhoden",    sprache: "DE",          lat: 47.3160, lng: 9.4159 },
  { slug: "basel_landschaft",         label: "Basel-Landschaft",         sprache: "DE",          lat: 47.4401, lng: 7.7558 },
  { slug: "basel_stadt",              label: "Basel-Stadt",              sprache: "DE",          lat: 47.5596, lng: 7.5886 },
  { slug: "bern",                     label: "Bern",                     sprache: "DE/FR",       lat: 46.9480, lng: 7.4474 },
  { slug: "freiburg",                 label: "Freiburg",                 sprache: "DE/FR",       lat: 46.8065, lng: 7.1616 },
  { slug: "genf",                     label: "Genf",                     sprache: "FR",          lat: 46.2044, lng: 6.1432 },
  { slug: "glarus",                   label: "Glarus",                   sprache: "DE",          lat: 47.0407, lng: 9.0672 },
  { slug: "graubuenden",              label: "Graubünden",               sprache: "DE/RM/IT",    lat: 46.6568, lng: 9.6279 },
  { slug: "jura",                     label: "Jura",                     sprache: "FR",          lat: 47.3607, lng: 7.3436 },
  { slug: "luzern",                   label: "Luzern",                   sprache: "DE",          lat: 47.0502, lng: 8.3093 },
  { slug: "neuenburg",                label: "Neuenburg",                sprache: "FR",          lat: 47.0000, lng: 6.9293 },
  { slug: "nidwalden",                label: "Nidwalden",                sprache: "DE",          lat: 46.9268, lng: 8.3847 },
  { slug: "obwalden",                 label: "Obwalden",                 sprache: "DE",          lat: 46.8779, lng: 8.2516 },
  { slug: "schaffhausen",             label: "Schaffhausen",             sprache: "DE",          lat: 47.6950, lng: 8.6350 },
  { slug: "schwyz",                   label: "Schwyz",                   sprache: "DE",          lat: 47.0207, lng: 8.6539 },
  { slug: "solothurn",                label: "Solothurn",                sprache: "DE",          lat: 47.2088, lng: 7.5323 },
  { slug: "st_gallen",                label: "St. Gallen",               sprache: "DE",          lat: 47.4245, lng: 9.3767 },
  { slug: "tessin",                   label: "Tessin",                   sprache: "IT",          lat: 46.1955, lng: 9.0166 },
  { slug: "thurgau",                  label: "Thurgau",                  sprache: "DE",          lat: 47.5536, lng: 9.0748 },
  { slug: "uri",                      label: "Uri",                      sprache: "DE",          lat: 46.8804, lng: 8.6342 },
  { slug: "waadt",                    label: "Waadt",                    sprache: "FR",          lat: 46.5197, lng: 6.6323 },
  { slug: "wallis",                   label: "Wallis",                   sprache: "DE/FR",       lat: 46.2284, lng: 7.3601 },
  { slug: "zug",                      label: "Zug",                      sprache: "DE",          lat: 47.1662, lng: 8.5154 },
  { slug: "zuerich",                  label: "Zürich",                   sprache: "DE",          lat: 47.3769, lng: 8.5417 },
];

const SEARCH_TYPES = [
  { type: "restaurant", label: "Restaurant" },
  { type: "bar",        label: "Bar" },
  { type: "cafe",       label: "Café" },
  { type: "tourist_attraction", label: "Souvenir/Tourismus" },
];

const BASE = "https://maps.googleapis.com/maps/api/place";

async function nearbySearch(lat: number, lng: number, type: string, radius: number, apiKey: string): Promise<string[]> {
  const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json() as { results?: { place_id: string }[]; status: string };
  return (data.results ?? []).slice(0, 5).map((p) => p.place_id);
}

async function placeDetails(placeId: string, apiKey: string): Promise<{
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  url?: string;
  types?: string[];
} | null> {
  const fields = "name,formatted_address,formatted_phone_number,website,types,url";
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json() as { result?: Record<string, unknown>; status: string };
  return (data.result as any) ?? null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPartnerLeads(
  apiKey: string,
  radius = 3000,
): Promise<PartnerLead[]> {
  const seen = new Set<string>();
  const leads: PartnerLead[] = [];

  for (const canton of CANTON_CONFIG) {
    for (const { type, label } of SEARCH_TYPES) {
      const placeIds = await nearbySearch(canton.lat, canton.lng, type, radius, apiKey);
      for (const placeId of placeIds) {
        if (seen.has(placeId)) continue;
        seen.add(placeId);
        const d = await placeDetails(placeId, apiKey);
        if (!d) continue;
        const cleanType = d.types?.find(
          (t) => !["point_of_interest", "establishment", "food", "premise"].includes(t)
        ) ?? label;
        leads.push({
          kanton: canton.label,
          sprache: canton.sprache,
          typ: cleanType,
          name: d.name ?? "",
          adresse: d.formatted_address ?? "",
          telefon: d.formatted_phone_number ?? "",
          website: d.website ?? "",
          googleMaps: d.url ?? "",
        });
      }
      await sleep(50);
    }
  }

  return leads;
}

export function leadsToCSV(leads: PartnerLead[]): string {
  const header = "Kanton;Sprache;Typ;Name;Adresse;Telefon;Website;Google Maps";
  const rows = leads.map((l) =>
    [l.kanton, l.sprache, l.typ, l.name, l.adresse, l.telefon, l.website, l.googleMaps]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  );
  return [header, ...rows].join("\n");
}
