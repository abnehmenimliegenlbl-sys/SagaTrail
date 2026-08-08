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
