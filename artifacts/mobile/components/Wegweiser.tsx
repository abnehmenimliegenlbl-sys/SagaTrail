import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { fonts } from "@/constants/typography";
import { CantonWappen } from "@/components/brand/CantonWappen";

/**
 * Schweizer Wanderweg-Wegweiser als UI-Element.
 *
 * Aufbau wie die echte Signalisation:
 * - gelber Körper mit grünem Wanderland-Feld (Routennummer)
 * - Pfeilspitze nach SAC-Grad:
 *   T1/T2  → ganz gelb (Wanderweg)
 *   T3/T4  → weiss mit rotem Balken (Bergwanderweg)
 *   T5/T6  → weiss mit blauem Balken (Alpinwanderweg)
 */

const GELB = "#FFCC00";
const GELB_TRANSPARENT = "rgba(255,204,0,0.55)";
// Wanderland-Grasgrün wie im offiziellen Routenlogo (z. B. Jura-Höhenweg)
const GRUEN = "#7FB73F";
const SCHWARZ = "#141412";
const ROT = "#E30613";
const BLAU = "#005EB8";

export interface WegweiserDaten {
  nummer: string | null;       // z.B. "60" oder "K11"
  kategorie: string | null;    // "Wanderland national" | "Wanderland regional" | "Wanderland lokal" | "kantonal" | null
  titel: string;               // z.B. "Via Rhenana"
  etappe: string | null;       // z.B. "Etappe 6"
  strecke: string | null;      // z.B. "Eglisau - Bad Zurzach"
}

/** Zerlegt einen Routennamen aus der DB in Wegweiser-Bestandteile. */
export function parseRouteName(name: string): WegweiserDaten {
  let rest = name.trim();
  let nummer: string | null = null;
  let kategorie: string | null = null;

  // Kantonal: "K11 SZ Name ..." (Kantonskürzel optional)
  const k = rest.match(/^K(\d+)\s+(?:([A-Z]{2})\s+)?(.*)$/);
  if (k) {
    nummer = k[1];
    kategorie = k[2] ?? null; // Kantonskürzel ins Feld, falls vorhanden
    rest = k[3];
  } else {
    // SchweizMobil: "60 Via Rhenana ..." — 1-3-stellige Nummer, optional Buchstaben-Suffix (z.B. "4a")
    const m = rest.match(/^(\d{1,3}[a-z]?)\s+(.*)$/);
    if (m) {
      nummer = m[1];
      const numLen = parseInt(m[1], 10).toString().length; // "4a" → 4 → length 1
      kategorie =
        numLen === 1
          ? "Wanderland national"
          : numLen === 2
            ? "Wanderland regional"
            : "Wanderland lokal";
      rest = m[2];
    }
  }

  // Sonderfall: Name beginnt direkt mit "Etappe N: A – B" (wiki-* Platzhalter)
  // → Etappennummer ins grüne Feld, Strecke in die zweite Zeile
  const etappeStart = rest.match(/^(Etappe\s+(\d+))\s*[:\s]\s*(.+?)\s*[-–]\s*(.+)$/i);
  if (etappeStart && !nummer) {
    return {
      nummer: etappeStart[2],
      kategorie: null,
      titel: etappeStart[1],
      etappe: null,
      strecke: `${etappeStart[3].trim()} – ${etappeStart[4].trim()}`,
    };
  }

  // Etappe herauslösen
  let etappe: string | null = null;
  const e = rest.match(/^(.*?)\s+((?:Etappe|Étape|Etape|Tappa)\s+\d+[a-z]?)\s*(.*)$/i);
  if (e) {
    let titel = e[1].trim();
    const streckeRest = e[3]?.trim() || null;
    // Wenn der Gesamtrouten-Name schon ein "Von – Bis" enthält (z.B.
    // "Alpenpanorama-Weg Rorschach – Genève"), soll das NICHT im Titel
    // der Etappe erscheinen — nur der Routenname ohne Strecke.
    const outerVonBis = titel.match(/^(.+?)\s+([^-–\s][^-–]*\s[-–]\s.+)$/);
    if (outerVonBis && outerVonBis[1].trim().length >= 3) {
      titel = outerVonBis[1].trim();
    }
    return { nummer, kategorie, titel, etappe: e[2], strecke: streckeRest };
  }

  // "Name Von - Nach": letzte " A - B"-Sequenz als Strecke abtrennen.
  // Greedy (.+) damit "Via Jura Basel - Biel" → titel="Via Jura", strecke="Basel - Biel"
  // und nicht titel="Via", strecke="Jura Basel - Biel".
  const s = rest.match(/^(.+)\s+([^-–]+\s[-–]\s.+)$/);
  if (s && s[1].length >= 3) {
    let titel = s[1].trim();
    // Falls der Titel selbst noch ein "Von – Bis" enthält (z.B. "Alpenpanorama-Weg
    // Rorschach – Genève"), nur den eigentlichen Routennamen behalten.
    const innerVonBis = titel.match(/^(.+?)\s+([^-–\s][^-–]*\s[-–]\s.+)$/);
    if (innerVonBis && innerVonBis[1].trim().length >= 3) {
      titel = innerVonBis[1].trim();
    }
    return { nummer, kategorie, titel, etappe: null, strecke: s[2].trim() };
  }
  return { nummer, kategorie, titel: rest, etappe: null, strecke: null };
}

function spitzenFarben(sac: string | null | undefined): { balken: string | null } {
  const n = sac && /^T([1-6])$/.test(sac) ? parseInt(sac[1], 10) : 0;
  if (n >= 5) return { balken: BLAU };
  if (n >= 3) return { balken: ROT };
  return { balken: null }; // T1/T2 oder unbekannt → ganz gelb
}

export function Wegweiser({
  name,
  sac,
  kompakt,
  umgekehrt,
  kanton,
}: {
  name: string;
  sac?: string | null;
  kompakt?: boolean;
  /** Route wird in Gegenrichtung gewandert → Strecke "A - B" als "B - A" anzeigen. */
  umgekehrt?: boolean;
  /** Kantonsname (z. B. "Schwyz") — für Wappen bei regionalen/kantonalen Routen. */
  kanton?: string | null;
}) {
  const d = parseRouteName(name);
  if (umgekehrt && d.strecke) {
    const teile = d.strecke.split(/\s[-–]\s/);
    if (teile.length === 2) d.strecke = `${teile[1]} - ${teile[0]}`;
  }
  const { balken } = spitzenFarben(sac);
  const hoehe = kompakt ? 54 : 68;
  const spitzeBreite = hoehe * 0.55;

  return (
    <View style={[styles.reihe, { height: hoehe }]}>
      {/* Gelber Körper */}
      <View style={[styles.koerper, { height: hoehe }]}>
        {d.nummer && (
          <View style={[styles.gruenFeld, { width: hoehe - 8, height: hoehe - 8 }]}>
            {d.kategorie && d.kategorie.length === 2 ? (
              // Kantonale Route: Wappen links oben, Nummer "K1-BE" darunter
              <>
                <CantonWappen canton={d.kategorie} size={kompakt ? 14 : 18} />
                <Text
                  style={[styles.nummerText, { fontSize: kompakt ? 13 : 16, lineHeight: kompakt ? 15 : 18 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {`K${d.nummer}-${d.kategorie}`}
                </Text>
              </>
            ) : (
              <>
                {d.kategorie && d.kategorie.length > 2 && (
                  // Lokale Route (3-stellig): Wappen als Hintergrund hinter dem Kategorietext
                  <View style={{ alignSelf: "flex-start" }}>
                    {kanton && d.kategorie === "Wanderland lokal" && (
                      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, justifyContent: "center" }}>
                        <CantonWappen canton={kanton} size={kompakt ? 15 : 19} greenShade />
                      </View>
                    )}
                    <Text style={styles.kategorieText} numberOfLines={2}>
                      {d.kategorie.replace(/\s+/, "\n")}
                    </Text>
                  </View>
                )}
                <View style={styles.nummerZeile}>
                  {d.kategorie === "Wanderland national" ? (
                    <View style={[styles.flagge, kompakt && { width: 9, height: 9 }]}>
                      <View style={styles.kreuzQuer} />
                      <View style={styles.kreuzHoch} />
                    </View>
                  ) : kanton && d.kategorie !== "Wanderland lokal" ? (
                    <View style={{ marginBottom: 2 }}>
                      <CantonWappen canton={kanton} size={kompakt ? 12 : 15} />
                    </View>
                  ) : null}
                  <Text
                    style={[styles.nummerText, kompakt && { fontSize: 27, lineHeight: 28 }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {d.nummer}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
        <View style={styles.textSpalte}>
          <Text style={[styles.titel, kompakt && { fontSize: 19, lineHeight: 22 }]} numberOfLines={1}>
            {d.titel}
          </Text>
          {d.etappe && (
            <Text style={[styles.zeile, kompakt && { fontSize: 12, lineHeight: 15 }]} numberOfLines={1}>
              {d.etappe}
            </Text>
          )}
          {d.strecke && (
            <Text style={[styles.zeile, kompakt && { fontSize: 12, lineHeight: 15 }]} numberOfLines={1}>
              {d.strecke}
            </Text>
          )}
        </View>
      </View>
      {/* Pfeilspitze */}
      <View style={{ width: spitzeBreite, height: hoehe }}>
        <View
          style={[
            styles.spitze,
            {
              borderTopWidth: hoehe / 2,
              borderBottomWidth: hoehe / 2,
              borderLeftWidth: spitzeBreite,
              borderLeftColor: balken ? "rgba(255,255,255,0.55)" : GELB_TRANSPARENT,
            },
          ]}
        />
        {balken && (
          <View
            style={[
              styles.balken,
              {
                top: hoehe / 2 - hoehe * 0.09,
                height: hoehe * 0.18,
                width: spitzeBreite * 0.62,
                backgroundColor: balken,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reihe: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    // leichter Schattenwurf wie ein echtes Schild
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  koerper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GELB_TRANSPARENT,
    paddingLeft: 6,
    paddingRight: 8,
    gap: 8,
    flexShrink: 1,
  },
  gruenFeld: {
    backgroundColor: GRUEN,
    paddingHorizontal: 5,
    paddingVertical: 4,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  kategorieText: {
    color: SCHWARZ,
    fontFamily: fonts.bodyBold,
    fontStyle: "italic",
    fontSize: 7,
    lineHeight: 8.5,
  },
  nummerZeile: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  nummerText: {
    color: "#FFFFFF",
    fontFamily: fonts.titleBlack,
    fontSize: 36,
    fontStyle: "italic",
    lineHeight: 37,
    marginLeft: "auto",
  },
  flagge: {
    width: 11,
    height: 11,
    backgroundColor: "#C42526",
    transform: [{ rotate: "-8deg" }],
    marginBottom: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  kreuzQuer: {
    position: "absolute",
    width: "62%",
    height: "20%",
    backgroundColor: "#FFFFFF",
  },
  kreuzHoch: {
    position: "absolute",
    width: "20%",
    height: "62%",
    backgroundColor: "#FFFFFF",
  },
  textSpalte: { flexShrink: 1 },
  titel: {
    color: "#FFFFFF",
    fontFamily: fonts.titleBold,
    fontSize: 24,
    lineHeight: 27,
  },
  zeile: {
    color: "#FFFFFF",
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 17,
  },
  spitze: {
    width: 0,
    height: 0,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderStyle: "solid",
  },
  balken: {
    position: "absolute",
    left: 0,
  },
});
