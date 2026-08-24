/**
 * Display-Logik fuer POI-Titel:
 * Wenn der Name nach Abzug von Ziffern und Sonderzeichen <= 2 bedeutungslose
 * Zeichen uebrig laesst (reiner Code/Zahl wie "42", "K17", "GB 42"),
 * wird der lesbare Objekttyp vorangestellt → "Historischer Grenzstein 42".
 * Bereits beschreibende Namen ("Grenzstein 151", "Liestaler Törli") bleiben unveraendert.
 */

const KIND_LABEL: Record<string, string> = {
  "historic=boundary_stone":      "Historischer Grenzstein",
  "historic=ruins":               "Historische Ruine",
  "historic=castle":              "Burg oder Schloss",
  "historic=manor":               "Historisches Herrenhaus",
  "historic=monument":            "Denkmal",
  "historic=memorial":            "Gedenkstätte",
  "historic=wayside_cross":       "Wegkreuz",
  "historic=wayside_shrine":      "Wegkapelle",
  "historic=church":              "Historische Kirche",
  "historic=city_gate":           "Historisches Stadttor",
  "historic=fort":                "Historische Festung",
  "historic=archaeological_site": "Archäologische Stätte",
  "historic=milestone":           "Historischer Meilenstein",
  "historic=battlefield":         "Historisches Schlachtfeld",
  "historic=mine":                "Historisches Bergwerk",
  "historic=building":            "Historisches Gebäude",
  "historic=tomb":                "Historisches Grabmal",
  "historic=yes":                 "Historisches Objekt",
  "tourism=artwork":              "Kunstobjekt",
  "tourism=attraction":           "Sehenswürdigkeit",
  "tourism=viewpoint":            "Aussichtspunkt",
  "tourism=museum":               "Museum",
  "tourism=information":          "Infotafel",
  "historic=roman_road":          "Römerstrasse",
  "historic=roman_villa":         "Römische Villa",
  "historic=roman_building":      "Römisches Gebäude",
  "natural=gorge":                "Schlucht / Tobel",
  "amenity=shelter":              "Unterstand / Biwak",
  "geological=erratic":           "Findling",
  "geological=moraine":           "Moräne",
};

/** Gibt den anzuzeigenden POI-Titel zurueck.
 *  Reine Codes/Zahlen werden mit dem Objekttyp als Praefix angereichert. */
export function poiDisplayName(name: string, kind: string | undefined): string {
  const label = kind ? KIND_LABEL[kind] : undefined;
  if (!label) return name;

  // Pruefe ob der Name nach Abzug von Ziffern, Leerzeichen und Sonderzeichen
  // noch einen beschreibenden Wortanteil hat (> 2 Buchstaben).
  const meaningful = name.replace(/[\d\s.\-\/\\,#]+/g, "");
  if (meaningful.length > 2) return name;

  // Reiner Code/Zahl → Praefix anhaengen
  return `${label} ${name}`;
}

/** POI-Kategorien, die eine stufenweise Annaeherungs-Ansage erhalten:
 *  300 m → Kachel, 200 m → Richtungshinweis, 50 m → Geschichte. */
export const POI_APPROACH_KINDS = new Set([
  "natural=cave_entrance",
  "natural=arch",
  // Grenzsteine werden wie andere historische Wegpunkte gestaffelt
  // angekündigt: 300 m Karte, 200 m Hinweis, 50 m Geschichte.
  "historic=boundary_stone",
  "historic=castle",
  "historic=ruins",
  "historic=archaeological_site",
  "historic=fort",
  "historic=roman_road",
  "historic=roman_villa",
  "historic=roman_building",
  "historic=battlefield",
  "historic=chapel",
  "historic=wayside_shrine",
  "tourism=viewpoint",
  "tourism=attraction",
  "tourism=artwork",
  "tourism=information",
  "man_made=cross",
  "man_made=obelisk",
  "amenity=place_of_worship",
  "amenity=shelter",
]);

/** Reine Objekttyp-Bezeichnungen ohne individuellen Charakter (generisch). */
const GENERIC_NAMES = new Set([
  // DE
  "kapelle", "ruine", "ruinen", "burg", "schloss", "aussichtspunkt", "wegkreuz",
  "wegkapelle", "unterstand", "infotafel", "kunstobjekt", "denkmal", "höhle",
  "felsbogen", "festung", "obelisk", "kirche", "sehenswürdigkeit",
  // EN
  "chapel", "ruins", "castle", "viewpoint", "cross", "shrine", "shelter",
  "information", "artwork", "monument", "cave", "arch", "fort", "obelisk",
  "church", "attraction",
  // FR
  "chapelle", "ruines", "château", "point de vue", "croix", "abri",
  "grotte", "forteresse", "église",
  // IT
  "cappella", "rovine", "castello", "belvedere", "croce", "grotta",
  "fortezza", "chiesa",
]);

/** Gibt true zurück wenn der POI-Name spezifisch genug ist, um einen
 *  Annaeherungs-Hinweis auszuloesen (kein reiner Objekttyp, kein Code). */
export function isPoiNameSpecific(name: string, kind: string | undefined): boolean {
  if (!name || name.trim().length < 3) return false;
  const lower = name.toLowerCase().trim();
  if (GENERIC_NAMES.has(lower)) return false;
  // Wenn poiDisplayName ein Praefix anhaengt, war der Name nur ein Code
  if (poiDisplayName(name, kind) !== name) return false;
  // Name muss mindestens 4 bedeutungsvolle Buchstaben enthalten
  const meaningful = name.replace(/[\d\s.\-\/\\,#()]+/g, "");
  return meaningful.length >= 4;
}
