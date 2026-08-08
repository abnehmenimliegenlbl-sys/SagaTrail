---
name: async-IIFE cancelled race in React effects
description: Ein await in einer async IIFE vor einem Netzwerk-Call lässt React den Effekt canceln bevor der Call startet — verhindert das Laden von Daten.
---

## Regel

Niemals `if (cancelled) return` VOR einem Netzwerk-Call platzieren, der in einer async IIFE innerhalb eines useEffect läuft.

**Why:** Das `await` für einen Cache-Check (z.B. AsyncStorage) gibt React einen Microtask-Tick. Wenn Dependencies des Effekts sich in dieser Zeit ändern (z.B. `mapCenter` bei GPS-Updates, oder ein State-Setter wie `setSelectedPoiWiki` der einen Re-render auslöst), läuft die Cleanup-Funktion (`cancelled = true`) bevor der Netzwerk-Call startet. Der Call wird nie gestartet, der Loading-State bleibt stuck.

**How to apply:** Immer so strukturieren:

```tsx
(async () => {
  const cached = await checkCache(...);
  if (cached !== null && !cancelled) {
    setState(cached);    // nur State-Update prüft cancelled
    return;
  }
  // Kein "if (cancelled) return" hier!
  fetchFromNetwork()
    .then(r => { if (!cancelled) setState(r); })   // cancelled hier
    .finally(() => { if (!cancelled) setLoading(false); }); // und hier
})();
```

Der `cancelled`-Check gehört nur in `.then()` / `.catch()` / `.finally()`, um State-Updates nach Unmount zu verhindern — nie als Wächter vor dem Call selbst.

## Betroffene Dateien (Beispiel)

- `artifacts/mobile/app/hike/[id].tsx` — 5 Effekte: selectedPoi story/wiki, nearbyPoi wiki/story, POI map loading
