---
name: SagaTrail OpenAPI codegen
description: OpenAPI-first contract changes for mobile meetup features
---

Neue API-Endpunkte zuerst in `lib/api-spec/openapi.yaml` beschreiben und danach `pnpm --filter @workspace/api-spec run codegen` ausführen; Mobile-Hooks und Server-Zod-Typen dürfen nicht hand-editiert werden.

**Why:** Der Treffpunkt-Lifecycle war im Backend bereits vorhanden, aber ohne Codegen fehlten die generierten Mobile-Hooks und der Client blieb hinter dem Serververtrag zurück.

**How to apply:** Bei jeder neuen oder geänderten mobilen API-Funktion OpenAPI, Codegen und anschliessend API-/Mobile-Typecheck in derselben Änderung ausführen.