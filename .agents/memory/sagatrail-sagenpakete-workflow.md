---
name: SagaTrail Sagenpakete batch workflow
description: Step-by-step process for adding new canton saga packages (Sagenpakete) from user-supplied JSON files.
---

# SagaTrail Sagenpakete – Workflow für neue Kantone

## Ziel
Jeder Kanton bekommt genau **8 Paket-Sagen** in `PACKAGE_SAGAS` (`curatedSagasPakete.ts`).  
Keine Duplikate mit den 27 Standalone-Sagen in `curatedSagas.ts`.

## Dateipfade
- Server: `artifacts/api-server/src/lib/curatedSagasPakete.ts` → exportiert `PACKAGE_SAGAS: InsertCatalogSaga[]` (flache `lat`/`lng`-Felder, `isAnchorPlace: false`)
- Mobile: `artifacts/mobile/constants/sagasPakete.ts` → `coordinates: { lat, lng }` (verschachtelt)
- Seed: `artifacts/api-server/src/lib/catalogSeed.ts` → importiert beide Arrays

## Schritt-für-Schritt

### 1. JSON-Dateien analysieren
User liefert JSON-Dateien als `attached_assets/sagen_<kanton>_*.json`.  
Format: Array von Saga-Objekten mit `id`, `title`, `summary` (multilingual), `coordinates: {lat, lng}`, `bildmotiv`.

### 2. Duplikate identifizieren
Alle `id`-Felder der neuen JSON gegen die IDs in `curatedSagas.ts` prüfen (grep).  
Duplikate in die `REMOVE`-Menge aufnehmen.

### 3. Zählen & Lücken schliessen
Nach dem Entfernen der Duplikate zählen: `len(canton_sagas)`.  
- < 8 → neue Sagen handschreiben (bis 8 aufgefüllt)
- > 8 → auf 8 kürzen (die stärksten/vielfältigsten behalten)
- = 8 → fertig

### 4. Neue Sagen handschreiben
Als `/tmp/new_sagas.json` mit dem `write`-Tool speichern (kein Python-Heredoc wegen Anführungszeichen-Problemen).  
Jede neue Sage braucht:
- `id`: kebab-case, kantonsrelevant
- `title`, `summary` in allen 9 Sprachen: `de`, `fr`, `it`, `en`, `rm`, `gsw`, `ru`, `ja`, `zh`
- `coordinates: {lat, lng}` (nested, wie im JSON-Format)
- `bildmotiv`: spezifisches Motiv/Figur (z.B. "Drache von Leuk", nicht nur "Drache"); NICHT Ort/Landschaft
- `canton`, `region`, `difficulty`, `isAnchorPlace: false`
- `gsw`/`rm`-Fallback auf Deutsch ist erlaubt wenn nötig

### 5. Python-Skript ausführen
`/tmp/gen_pakete.py` liest alle JSON-Dateien und:
- Filtert `REMOVE`-IDs heraus
- Wendet `BILDMOTIV`-Dict an (motif-focused Korrekturen)
- Gibt flaches JSON-Array aus (lat/lng extrahiert)

Kombinationsskript liest dann gen_pakete.py-Output + new_sagas.json und schreibt `curatedSagasPakete.ts`.

### 6. Bildmotiv-Regeln
**Why:** Commons-Bildsuche funktioniert nur mit spezifischen Motiv-Begriffen, nicht mit Ortsangaben.
- Gut: "Drache von Leuk", "Wildmaennli Surenenalp", "Nixe Walensee"
- Schlecht: "Bergsee", "Alpenpanorama", "Waldweg", reine Ortsnamen

### 7. TypeScript schreiben
Output-Format für `curatedSagasPakete.ts`:
```ts
import type { InsertCatalogSaga } from "@workspace/db";
export const PACKAGE_SAGAS: InsertCatalogSaga[] = [ ... ];
```
Felder: `id`, `canton`, `region`, `lat`, `lng`, `difficulty`, `isAnchorPlace`,  
`titleDe/Fr/It/En/Rm/Gsw/Ru/Ja/Zh`,  
`summaryDe/Fr/It/En/Rm/Gsw/Ru/Ja/Zh`, `bildmotiv`

### 8. Katalog-Seed updaten
In `catalogSeed.ts`:
```ts
import { PACKAGE_SAGAS } from "./curatedSagasPakete";
// dann im seed: [...CURATED_SAGAS, ...PACKAGE_SAGAS]
```

### 9. Mobile-Datei generieren
`sagasPakete.ts` in `artifacts/mobile/constants/` mit verschachteltem `coordinates: { lat, lng }`.

### 10. TypeScript kompilieren
```
pnpm --filter @workspace/api-server run build
```
Auf Typfehler prüfen.

## Bekannte Fallstricke
- Python-Heredocs mit chinesischen Anführungszeichen/Guillemets → neue Sagen immer als JSON-Datei mit dem `write`-Tool speichern, nie im Heredoc
- Duplikat-IDs immer nach IDs (nicht Titeln) prüfen — Titel können leicht abweichen
- Uri hat eine manuelle Auswahl von 8 IDs (URI_SELECT); bei Änderungen dort sorgfältig prüfen
