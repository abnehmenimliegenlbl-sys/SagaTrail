/**
 * Strukturierte Öffnungszeiten-Logik für Partnerbetriebe.
 *
 * Das Datenformat wird als JSON-String im TEXT-Feld `oeffnungszeiten` gespeichert
 * (kein Schema-Migration nötig). Wenn das Feld kein gültiges JSON enthält oder
 * keinen Tages-Key hat, fallen alle Status-Felder auf null zurück.
 *
 * JSON-Struktur (wird später auch für das Partner-Web-Portal verwendet):
 * {
 *   // Wochenplan: null = geschlossen an diesem Tag
 *   montag?:     { von: "09:00", bis: "17:00" } | null,
 *   dienstag?:   { von: "09:00", bis: "17:00" } | null,
 *   mittwoch?:   { von: "09:00", bis: "17:00" } | null,
 *   donnerstag?: { von: "09:00", bis: "17:00" } | null,
 *   freitag?:    { von: "09:00", bis: "18:00" } | null,
 *   samstag?:    { von: "10:00", bis: "16:00" } | null,
 *   sonntag?:    null,
 *
 *   // Saisonbetrieb: MM-DD ohne Jahreszahl, bezieht sich aufs aktuelle Jahr
 *   saisonStart?: "04-15" | null,
 *   saisonEnde?:  "10-31" | null,
 *
 *   // Kantonale Feiertage: true = geöffnet, false = geschlossen
 *   // Nicht aufgeführte Feiertage = Normalbetrieb (Wochenplan gilt)
 *   feiertage?: {
 *     neujahr?:            boolean,   // 01-01
 *     berchtoldstag?:      boolean,   // 01-02
 *     heiligeDreiKoenige?: boolean,   // 01-06
 *     josefstag?:          boolean,   // 03-19
 *     karfreitag?:         boolean,   // Ostern -2
 *     ostermontag?:        boolean,   // Ostern +1
 *     tagDerArbeit?:       boolean,   // 05-01
 *     auffahrt?:           boolean,   // Ostern +39
 *     pfingstmontag?:      boolean,   // Ostern +49
 *     fronleichnam?:       boolean,   // Ostern +60
 *     nationalfeiertag?:   boolean,   // 08-01
 *     mariaHimmelfahrt?:   boolean,   // 08-15
 *     bettag?:             boolean,   // 3. Sonntag im September
 *     allerheiligen?:      boolean,   // 11-01
 *     mariaEmpfaengnis?:   boolean,   // 12-08
 *     heiligabend?:        boolean,   // 12-24
 *     weihnachten?:        boolean,   // 12-25
 *     stephanstag?:        boolean,   // 12-26
 *     silvester?:          boolean,   // 12-31
 *   } | null,
 * }
 */

export type FeiertageKey =
  | "neujahr" | "berchtoldstag" | "heiligeDreiKoenige" | "josefstag"
  | "karfreitag" | "ostermontag" | "tagDerArbeit" | "auffahrt"
  | "pfingstmontag" | "fronleichnam" | "nationalfeiertag"
  | "mariaHimmelfahrt" | "bettag" | "allerheiligen" | "mariaEmpfaengnis"
  | "heiligabend" | "weihnachten" | "stephanstag" | "silvester";

export type TagName =
  | "montag" | "dienstag" | "mittwoch" | "donnerstag"
  | "freitag" | "samstag" | "sonntag";

export interface Zeitspanne { von: string; bis: string; }

export interface PartnerOeffnungszeiten {
  montag?: Zeitspanne | null;
  dienstag?: Zeitspanne | null;
  mittwoch?: Zeitspanne | null;
  donnerstag?: Zeitspanne | null;
  freitag?: Zeitspanne | null;
  samstag?: Zeitspanne | null;
  sonntag?: Zeitspanne | null;
  saisonStart?: string | null;
  saisonEnde?: string | null;
  feiertage?: Partial<Record<FeiertageKey, boolean>> | null;
}

export interface OeffnungsStatus {
  istOffen: boolean | null;
  schliesstUm: string | null;    // z.B. "17:30" — wenn gerade offen
  oeffnetAmTag: string | null;   // "heute" | "morgen" | TagName — wenn gerade geschlossen
  oeffnetUm: string | null;      // z.B. "09:00" — wenn gerade geschlossen
}

// --- Hilfsfunktionen ---

const TAG_REIHENFOLGE: TagName[] = [
  "sonntag", "montag", "dienstag", "mittwoch",
  "donnerstag", "freitag", "samstag",
];

/** Osterdatum nach dem Gauss-Algorithmus (gregorianisch). */
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const ii = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * ii - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Eidgenössischer Dank-, Buss- und Bettag: 3. Sonntag im September. */
function bettagDate(year: number): Date {
  const sept1 = new Date(year, 8, 1);
  const daysToSun = (7 - sept1.getDay()) % 7;
  return new Date(year, 8, 1 + daysToSun + 14);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Vollständige Feiertagskarte für ein Jahr. */
function buildHolidayMap(year: number): Map<FeiertageKey, Date> {
  const easter = easterDate(year);
  const map = new Map<FeiertageKey, Date>();
  map.set("neujahr",            new Date(year, 0, 1));
  map.set("berchtoldstag",      new Date(year, 0, 2));
  map.set("heiligeDreiKoenige", new Date(year, 0, 6));
  map.set("josefstag",          new Date(year, 2, 19));
  map.set("karfreitag",         addDays(easter, -2));
  map.set("ostermontag",        addDays(easter, 1));
  map.set("tagDerArbeit",       new Date(year, 4, 1));
  map.set("auffahrt",           addDays(easter, 39));
  map.set("pfingstmontag",      addDays(easter, 49));
  map.set("fronleichnam",       addDays(easter, 60));
  map.set("nationalfeiertag",   new Date(year, 7, 1));
  map.set("mariaHimmelfahrt",   new Date(year, 7, 15));
  map.set("bettag",             bettagDate(year));
  map.set("allerheiligen",      new Date(year, 10, 1));
  map.set("mariaEmpfaengnis",   new Date(year, 11, 8));
  map.set("heiligabend",        new Date(year, 11, 24));
  map.set("weihnachten",        new Date(year, 11, 25));
  map.set("stephanstag",        new Date(year, 11, 26));
  map.set("silvester",          new Date(year, 11, 31));
  return map;
}

/** Aktuelle Uhrzeit in der Schweizer Zeitzone als lokales Date-Objekt. */
function getNowZurich(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const g = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0");
  // hour12:false kann "24" für Mitternacht liefern — auf 0 normieren
  const h = g("hour") === 24 ? 0 : g("hour");
  return new Date(g("year"), g("month") - 1, g("day"), h, g("minute"), g("second"));
}

function parseMinutes(t: string): number {
  const [h = "0", m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
}

/** MM-DD-String für Saisonvergleich. */
function toMmDd(date: Date): string {
  return (
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function isInSeason(oz: PartnerOeffnungszeiten, date: Date): boolean {
  if (!oz.saisonStart || !oz.saisonEnde) return true;
  const today = toMmDd(date);
  const { saisonStart: s, saisonEnde: e } = oz;
  // Normalfall (z.B. 04-15 bis 10-31) oder Jahreswechsel (z.B. 11-01 bis 03-31)
  return s <= e ? today >= s && today <= e : today >= s || today <= e;
}

/**
 * Gibt zurück, ob der Partner an einem bestimmten Datum laut Feiertagsregel
 * offen (true), geschlossen (false) oder normal (null = kein Feiertag) ist.
 */
function getHolidayOverride(
  oz: PartnerOeffnungszeiten,
  date: Date,
  holidayMap: Map<FeiertageKey, Date>,
): boolean | null {
  if (!oz.feiertage) return null;
  for (const [key, hDate] of holidayMap) {
    if (!isSameDay(date, hDate)) continue;
    const override = oz.feiertage[key];
    // Explizit offen oder geschlossen
    if (override === true) return true;
    if (override === false) return false;
    // Feiertag im System, aber kein Override → Wochenplan gilt weiterhin
    return null;
  }
  return null; // kein Feiertag
}

function getDayHours(oz: PartnerOeffnungszeiten, date: Date): Zeitspanne | null {
  return oz[TAG_REIHENFOLGE[date.getDay()]] ?? null;
}

// --- Hauptfunktion ---

export function berechneOeffnungsStatus(
  oeffnungszeitenRaw: string | null | undefined,
): OeffnungsStatus {
  const leer: OeffnungsStatus = {
    istOffen: null,
    schliesstUm: null,
    oeffnetAmTag: null,
    oeffnetUm: null,
  };
  if (!oeffnungszeitenRaw) return leer;

  let oz: PartnerOeffnungszeiten;
  try {
    oz = JSON.parse(oeffnungszeitenRaw) as PartnerOeffnungszeiten;
  } catch {
    return leer;
  }
  // Mindestens ein Tages-Key muss vorhanden sein
  const hasDayKey = (
    ["montag","dienstag","mittwoch","donnerstag","freitag","samstag","sonntag"] as const
  ).some((k) => k in oz);
  if (!hasDayKey) return leer;

  const now = getNowZurich();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const holidayMap = buildHolidayMap(now.getFullYear());

  /**
   * Prüft für ein beliebiges Datum + Minutenwert, ob der Partner offen ist.
   * Gibt { open, schliesstUm } zurück.
   */
  function checkOpen(
    date: Date,
    minutesOfDay: number,
  ): { open: boolean; schliesstUm: string | null } {
    if (!isInSeason(oz, date)) return { open: false, schliesstUm: null };
    const override = getHolidayOverride(oz, date, holidayMap);
    if (override === false) return { open: false, schliesstUm: null };
    // override === true oder null → Wochenplan prüfen
    const hours = getDayHours(oz, date);
    if (!hours) return { open: false, schliesstUm: null };
    const von = parseMinutes(hours.von);
    const bis = parseMinutes(hours.bis);
    if (minutesOfDay >= von && minutesOfDay < bis) {
      return { open: true, schliesstUm: hours.bis };
    }
    return { open: false, schliesstUm: null };
  }

  // Gerade offen?
  const current = checkOpen(now, nowMin);
  if (current.open) {
    return {
      istOffen: true,
      schliesstUm: current.schliesstUm,
      oeffnetAmTag: null,
      oeffnetUm: null,
    };
  }

  // Gerade geschlossen → nächste Öffnung suchen.
  // Zuerst: Heute noch nicht aufgemacht (vor den Öffnungszeiten)?
  if (isInSeason(oz, now)) {
    const todayOverride = getHolidayOverride(oz, now, holidayMap);
    if (todayOverride !== false) {
      const todayHours = getDayHours(oz, now);
      if (todayHours) {
        const von = parseMinutes(todayHours.von);
        if (nowMin < von) {
          return {
            istOffen: false,
            schliesstUm: null,
            oeffnetAmTag: "heute",
            oeffnetUm: todayHours.von,
          };
        }
      }
    }
  }

  // Die nächsten 13 Tage durchsuchen
  for (let i = 1; i <= 13; i++) {
    const date = addDays(now, i);
    if (!isInSeason(oz, date)) continue;
    const override = getHolidayOverride(oz, date, holidayMap);
    if (override === false) continue;
    const hours = getDayHours(oz, date);
    if (!hours) continue;
    const tag = i === 1 ? "morgen" : TAG_REIHENFOLGE[date.getDay()];
    return {
      istOffen: false,
      schliesstUm: null,
      oeffnetAmTag: tag,
      oeffnetUm: hours.von,
    };
  }

  return {
    istOffen: false,
    schliesstUm: null,
    oeffnetAmTag: null,
    oeffnetUm: null,
  };
}
