---
name: SagaTrail R2 Object Storage Migration
description: Narrations-Audio-Cache von Replit GCS (Sidecar-Auth) auf Cloudflare R2 migriert; Credentials, Bucket-Struktur und SDK-Aufbau.
---

## Hintergrund
Replit Object Storage (GCS) gab in Production "no allowed resources" (401 vom Sidecar 127.0.0.1:1106).
Folge: jede Narration wurde neu synthetisiert → Tageslimit nach 2 Kapiteln erschöpft.

## Migration
- Bucket: `sagatrail` bei Cloudflare R2 (Western Europe / WEUR)
- Account ID: `ae2d32c2f9bc47f08cca887f689853b5`
- SDK: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` in `artifacts/api-server`
- Neue Datei: `artifacts/api-server/src/lib/s3.ts` (S3Client, S3Object, S3Bucket, objectStorageClient-Shim)
- `objectAcl.ts`: importiert `S3Object` statt GCS `File`; Metadata-Key `"acl-policy"` (kein Doppelpunkt)
- `objectStorage.ts`: komplett neu, nutzt S3Object; PRIVATE_PREFIX="private", PUBLIC_PREFIX="public"
- `narrationCache.ts`: nutzt `R2_BUCKET_NAME` + Prefix "private" statt `PRIVATE_OBJECT_DIR`

## Env-Variablen (shared)
- `R2_ACCOUNT_ID` = ae2d32c2f9bc47f08cca887f689853b5
- `R2_BUCKET_NAME` = sagatrail
- `R2_ACCESS_KEY_ID` = Secret
- `R2_SECRET_ACCESS_KEY` = Secret
- `NARRATION_DAILY_CHAR_BUDGET` = 25000

## Bucket-Struktur
- `private/narration/<hash>.mp3` — synthetisierte Kapitel-Narrations
- `private/uploads/<uuid>` — User-Uploads (Waypoint-Fotos, Partner-Fotos)
- `public/` — öffentliche Assets

**Why:** R2 hat keine Egress-Kosten (GCS/S3 berechnen Datentransfer); Bucket in Western Europe.
**How to apply:** Bei neuen S3-Operationen immer `S3Object` aus `./s3` importieren, nie direkt AWS SDK.
