---
name: Kantonspack consumable claim pattern
description: One consumable RC product, server assigns canton via entitlement grant; concurrency and double-charge safeguards
---

# Kantonspack: ein Verbrauchsprodukt, serverseitige Zuordnung

Regel: Der Client darf sich Kanton-Packs nie selbst geben. Er kauft nur das eine consumable Produkt; ein Server-Claim-Endpunkt zaehlt gueltige Kaeufe (nur Status `owned`, inkl. `quantity`) gegen bereits vergebene `pack_*`-Entitlements und grantet erst bei Ueberschuss.

**Why:** Entitlement-Grants sind clientseitig faelschbar; RevenueCat ist die einzige Wahrheitsquelle fuer Kaeufe.

**How to apply:**
- Der Claim ist Check-then-act gegen RevenueCat → pro Customer strikt serialisieren (In-Process-Promise-Kette reicht bei einprozessigem Server), sonst schaltet EIN Kauf bei parallelen Requests MEHRERE Kantone frei.
- Doppelbelastungs-Schutz im Client: vor jedem Neukauf zuerst versuchen, einen offenen Kauf zuzuordnen (409 = keiner da); erst dann kaufen.
- Consumables muessen in App Store Connect / Play Console als Verbrauchsprodukt angelegt werden, damit Mehrfachkauf funktioniert (Test Store: consumable).
- NIE pro Kanton ein eigenes kaeufliches RC-Produkt anlegen (`sagatrail_pack_<kanton>`) — nur die `pack_<kanton>`-Entitlements existieren pro Kanton, das Kauf-Produkt bleibt immer das eine `sagatrail_kantonspack`. App-Store-/Play-Store-Eintraege daher auch nur 1x, nicht 26x.

## Nach Produkt-Neuerstellung: Paket ebenfalls neu erstellen, nicht nur Produkte neu anhaengen
Test-Store-Preise sind unveraenderlich (einmal gesetzt) -> Produkt loeschen + mit neuem Preis neu anlegen ist der einzige Weg. Wenn danach `attachProductsToPackage` das neue Produkt an ein BESTEHENDES Paket haengt, kann das Paket fuer den oeffentlichen `/v1/subscribers/{id}/offerings`-Endpoint trotzdem unsichtbar bleiben (je nach `X-Platform`: ios/web fehlten, android ging) — obwohl die v2-Admin-API absolut korrekt aussieht (gleiche Struktur wie ein funktionierendes Paket, korrekte `subscription.duration`, korrekte `eligibility_criteria`).

**Fix:** Das betroffene Paket komplett loeschen (`deletePackageFromOffering`) und unter demselben `lookup_key` neu erstellen (`createPackages` + `attachProductsToPackage`). Propagiert dann fuer ios/android quasi sofort, fuer test_store (`X-Platform: web`) mit ggf. ~1 Min Verzoegerung.

**Wie erkennen:** Oeffentlichen v1-Endpoint mit frischer anonymer subscriber-ID direkt pruefen (`curl .../subscribers/{fresh-id}/offerings -H "X-Platform: {ios|android|web}"`), NICHT nur die v2-Admin-API — deren Daten koennen komplett korrekt aussehen, waehrend der oeffentliche Endpoint das Paket trotzdem nicht ausliefert.
