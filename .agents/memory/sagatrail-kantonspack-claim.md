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
