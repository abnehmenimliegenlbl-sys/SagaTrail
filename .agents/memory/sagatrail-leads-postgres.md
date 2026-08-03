---
name: SagaTrail Leads in Postgres
description: partner_leads Tabelle als einheitliche Lead-Quelle (ersetzt WP MySQL); Kampagnen-Endpoints, Import-Flow und OSM-Suche
---

# SagaTrail Leads in Postgres

## Regel
`partner_leads` Tabelle (Postgres) ist die einzige Quelle für Kampagnen — WP MySQL wird nicht mehr direkt abgefragt.

**Why:** Leads lagen in WP MySQL (sagatrail_partner_leads + organisationen) und Postgres (partner_email_log, partner_email_blocklist, partner_anfragen) getrennt. Unmöglich, Kampagnenhistory mit Leads zu verknüpfen ohne WP-Abhängigkeit.

## Tabellen-Schema
- `quelle`: 'leads' (WP sagatrail_partner_leads) | 'orgs' (WP organisationen) | 'osm' (direkte OSM-Suche)
- Unique-Indizes: `(quelle, osm_id) WHERE osm_id IS NOT NULL` und `(email) WHERE quelle='orgs'`
- `partner_email_log` bleibt unverändert — Dedup-Logik basiert auf email+subject, funktioniert unabhängig von Lead-Quelle

## Endpoints
- `GET /admin/leads/meta` — distinct typ, kanton aus partner_leads WHERE quelle='leads'
- `GET /admin/leads/list` — fetchLeadsFromDb() aus lib/leadMailer.ts
- `POST /admin/leads/send` — fetchLeadsFromDb/fetchOrgsFromDb (kein WP-AJAX mehr)
- `GET /admin/orgs/meta` — distinct kategorie, kanton, sprache WHERE quelle='orgs'
- `GET /admin/orgs/list` — fetchOrgsFromDb()
- `POST /admin/leads/import-wp` — einmaliger Import WP→Postgres via fetchLeadsFromWp/fetchOrgsFromWp + upsertLeadsToDb
- `POST /admin/partner-leads/pg-save-one` / `pg-save-all` — OSM-Suche-Preview direkt in Postgres speichern

## Relevante Dateien
- `lib/db/src/schema/partnerLeads.ts` — Drizzle-Schema
- `artifacts/api-server/src/lib/leadMailer.ts` — fetchLeadsFromDb, fetchOrgsFromDb, upsertLeadsToDb
- `artifacts/api-server/src/index.ts` — Migration (CREATE TABLE IF NOT EXISTS partner_leads)
- `artifacts/api-server/src/routes/admin.ts` — alle Lead-Endpoints

## How to apply
Beim Hinzufügen neuer Lead-Quellen: immer `upsertLeadsToDb` nutzen mit passendem `quelle`-Wert. WP-AJAX-Funktionen (`fetchLeadsFromWp` etc.) nur noch für den Import-Endpoint verwenden.
