---
name: SagaTrail Stripe Partner-Onboarding
description: Vollautomatischer Partner-Onboarding-Flow via Stripe — Architektur, Einschränkungen, Deployment-Schritte.
---

## Architektur

**Flow:** WordPress-Formular → `POST /api/partner/checkout` → Stripe-Checkout-Session → Webhook `checkout.session.completed` → Partner in DB anlegen → Magic-Link-Mail senden → Partner öffnet Portal.

## Neue Dateien (API-Server)

- `src/lib/stripeClient.ts` — Replit-Connector-Credentials-Fetch, `getUncachableStripeClient()`, `getStripeSync()`, `constructStripeEvent()`
- `src/lib/webhookHandlers.ts` — Thin wrapper um `stripe-replit-sync` processWebhook
- `src/lib/partnerWebhookHandler.ts` — Business-Logik: `checkout.session.completed` → DB-Insert + Magic-Link, `customer.subscription.deleted` → deaktivieren, `invoice.payment_failed` → mahnung1
- `src/routes/stripeCheckout.ts` — `POST /api/partner/checkout` (sucht Produkt+Preis by Name+Interval, erstellt Customer+Session mit Metadata)

## Webhook-Route

Registriert in `app.ts` VOR `express.json()` (kritisch). Ruft beide auf: stripe-replit-sync sync + eigene Business-Logik.

## Datenbank

- `partners.stripe_customer_id` und `partners.stripe_subscription_id` via Migration in index.ts addiert (idempotent)
- `partners.lat` und `partners.lng` jetzt nullable (waren NOT NULL, für Stripe-ongeboardete Partner ohne Adresse)
- `Zahlungsstatus` Typ erweitert um `"gekündigt"`
- Adresse/PLZ/Ort/KontaktName → kein eigenes Feld, wird in `notizenIntern` als JSON gespeichert

## Checkout Metadata

Session-Metadata enthält `flow:"partner_onboarding"` + alle Partnerdaten. Webhook filtert nur diese Sessions.

## Stripe-Produkte (Seed-Script)

`scripts/src/seedStripeProducts.ts` — einmalig ausführen mit echten Keys:
```
pnpm --filter @workspace/scripts exec tsx src/seedStripeProducts.ts
```
Produkte: SagaTrail Basic (monatlich + jährlich CHF), SagaTrail Standard (jährlich), SagaTrail Premium (jährlich).

**Why:** stripe-replit-sync verwaltet Produkte in stripe.*-Tabellen; Checkout sucht Produkt by Name + Preis by Interval — kein Hardcoded Price-ID nötig.

## Deployment-Schritte (manuell)

1. Seed-Script mit Test-Keys einmalig ausführen → Produkte in Stripe anlegen
2. WordPress-Dateien in WPCode deployen: `partner-page.html`, `partner-portal.html`
3. Bei Publish: Live-Stripe-Keys in Deployment-Secrets setzen

## Kartenpicker Portal

- Leaflet von CDN in `partner-portal.html`
- „Meinen Standort verwenden" Button → `navigator.geolocation.getCurrentPosition()`
- Draggbarer roter Marker, Klick auf Karte setzt Marker
- `PATCH /api/partner/portal/me` mit `{ lat, lng }` — jetzt im Schema und Endpoint unterstützt
- `GET /api/partner/portal/me` gibt `lat`/`lng` zurück → Karte wird mit gespeicherten Koordinaten initialisiert
