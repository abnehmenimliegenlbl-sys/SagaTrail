---
name: SagaTrail Partner-Öffnungszeiten Datenmodell
description: JSON-Struktur für strukturierte Öffnungszeiten im Partnerportal (Website-Formular)
---

# Partner-Öffnungszeiten: Datenmodell für Website-Formular

## Speicherort
Feld `oeffnungszeiten TEXT` in der `partners`-Tabelle, Inhalt: JSON-String.
Kein Schema-Migration nötig — plain TEXT, JSON-Parse clientseitig.

## JSON-Struktur (vollständig)
```json
{
  "montag":     { "von": "09:00", "bis": "17:00" },
  "dienstag":   { "von": "09:00", "bis": "17:00" },
  "mittwoch":   null,
  "donnerstag": { "von": "09:00", "bis": "17:00" },
  "freitag":    { "von": "09:00", "bis": "18:00" },
  "samstag":    { "von": "10:00", "bis": "16:00" },
  "sonntag":    null,

  "saisonStart": "04-15",
  "saisonEnde":  "10-31",

  "feiertage": {
    "neujahr":            false,
    "berchtoldstag":      null,
    "heiligeDreiKoenige": null,
    "josefstag":          null,
    "karfreitag":         false,
    "ostermontag":        false,
    "tagDerArbeit":       false,
    "auffahrt":           false,
    "pfingstmontag":      false,
    "fronleichnam":       null,
    "nationalfeiertag":   false,
    "mariaHimmelfahrt":   null,
    "bettag":             null,
    "allerheiligen":      null,
    "mariaEmpfaengnis":   null,
    "heiligabend":        false,
    "weihnachten":        false,
    "stephanstag":        false,
    "silvester":          false
  }
}
```

## Felder-Semantik

### Wochenplan
- `null` = an diesem Tag geschlossen
- `{ von, bis }` = Öffnungszeit (Format "HH:MM", 24h)

### Saisonbetrieb
- `saisonStart` + `saisonEnde`: MM-DD ohne Jahreszahl (immer aktuelles Jahr)
- Beide null = ganzjährig geöffnet
- Wrap-Around unterstützt (z.B. Nov–Feb: `"11-01"` bis `"03-31"`)

### Feiertage-Overrides (`feiertage`)
- `true` = an diesem Feiertag geöffnet (Wochenplan gilt)
- `false` = an diesem Feiertag geschlossen
- `null` / fehlt = Wochenplan gilt unverändert (kein spezielles Verhalten)

## Feiertag-Daten (Berechnung serverseitig in oeffnungszeitenLogic.ts)
| Key               | Datum                         |
|-------------------|-------------------------------|
| neujahr           | 01-01                         |
| berchtoldstag     | 01-02                         |
| heiligeDreiKoenige| 01-06                         |
| josefstag         | 03-19                         |
| karfreitag        | Ostern − 2 Tage               |
| ostermontag       | Ostern + 1 Tag                |
| tagDerArbeit      | 05-01                         |
| auffahrt          | Ostern + 39 Tage              |
| pfingstmontag     | Ostern + 49 Tage              |
| fronleichnam      | Ostern + 60 Tage              |
| nationalfeiertag  | 08-01                         |
| mariaHimmelfahrt  | 08-15                         |
| bettag            | 3. Sonntag im September       |
| allerheiligen     | 11-01                         |
| mariaEmpfaengnis  | 12-08                         |
| heiligabend       | 12-24                         |
| weihnachten       | 12-25                         |
| stephanstag       | 12-26                         |
| silvester         | 12-31                         |

## API-Response-Felder (Partner-Objekt)
```typescript
istOffen:      boolean | null  // null = keine strukturierten Öffnungszeiten
schliesstUm:   string | null   // "17:30" — nur wenn gerade offen
oeffnetAmTag:  string | null   // "heute" | "morgen" | "montag" | ... — wenn geschlossen
oeffnetUm:     string | null   // "09:00" — wenn geschlossen
```

## Website-Formular (für später)
Das Partner-Portal-Formular soll bieten:
1. **Wochenplan**: 7 Zeilen (Mo–So), je "geschlossen" Toggle + Von/Bis Zeitpicker
2. **Saisonbetrieb**: "Saisonal" Toggle → Datepicker (Eröffnungsdatum + Schlussdatum, kein Jahr)
3. **Feiertage**: Liste aller 19 Feiertage, je 3-State-Toggle: "wie normal" / "geöffnet" / "geschlossen"
4. **Preview**: Live-Anzeige "Jetzt: Geöffnet / Geschlossen · öffnet am Montag um 09:00 Uhr"

## Implementierungsdateien
- Logik: `artifacts/api-server/src/lib/oeffnungszeitenLogic.ts`
- API: `artifacts/api-server/src/routes/partners.ts` (toPartner)
- Mobile Display: `artifacts/mobile/app/hike/[id].tsx` (formatPartnerOeffnungsInfo)
- i18n: `artifacts/mobile/lib/i18n/screens/hike.ts` (partnerSchliesstUm etc.)

**Why:** Der User will eine Webseite für Partnerportal bauen; dieses Datenmodell muss 1:1 vom Formular bedient werden können. Die Logik ist bereits serverseitig implementiert.
