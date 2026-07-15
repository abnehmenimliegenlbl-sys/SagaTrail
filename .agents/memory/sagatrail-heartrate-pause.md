---
name: SagaTrail Herzfrequenz-basierte Pausen-Vorschläge
description: Geplante Verbesserung — Pausen-Cues während der Wanderung basierend auf Herzfrequenz oder GPS/Zeit-Daten
---

## Idee
Während der Wanderung automatisch gesprochene Pausen-Vorschläge via `speak()` auslösen, wenn der Nutzer erschöpft wirkt.

## Zwei Stufen

### Stufe 1 — kein Health-Framework nötig (Expo Go tauglich)
Bereits vorhandene Daten: GPS, Höhenprofil, Schrittmesser (expo-sensors Pedometer).
- Nach X Minuten konstantem Aufstieg
- Nach Y Höhenmetern Gesamtanstieg
- Wenn Schrittfrequenz (Kadenz) deutlich abfällt
- Zeitbasiert: alle 45 Min bei Routen ≥ 90 Min

### Stufe 2 — HealthKit / Health Connect (erfordert Dev/EAS-Build)
Package: `react-native-health` (iOS) + `react-native-health-connect` (Android).

**Welche Geräte liefern Real-time-Daten WÄHREND einer Wanderung:**
- ✅ Apple Watch → HealthKit live queries
- ✅ Bluetooth HR-Brustgurt (Polar H10, Wahoo TICKR) → CoreBluetooth direkt
- ❌ Garmin / Fitbit / Samsung Galaxy Watch → synken erst NACH dem Workout (batch)

**Why:** Garmin & Co. speichern intern und synken nach der Aktivität — kein Echtzeit-Stream zum Phone.

## Implementierungsplan (wenn gewünscht)
1. HealthKit-Permission optional abfragen (graceful fallback auf Stufe 1 wenn verweigert/kein Gerät)
2. Live-Herzfrequenz polling alle 30s über `HKQuantityTypeIdentifierHeartRate`
3. Schwellwert-Logik: Puls > 160 bpm für > 3 Min → `speak(pack.pauseSuggestion)`
4. `pauseSuggestion` als neues `StoryPack`-Feld (alle 9 Sprachen)
5. Kein Gerät verbunden → automatisch Stufe-1-Logik

**How to apply:** Beim nächsten Ausbau der Hike-Screen-Features; Stufe 1 ist schnell umsetzbar und für alle Nutzer, Stufe 2 nur wenn Apple-Watch-Nutzeranteil signifikant.
