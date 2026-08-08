---
name: Anthropic image url-source fails for Wikimedia
description: Vision requests with source type "url" fail for Wikimedia/Commons images; download server-side and send base64.
---

Anthropic `messages.create` with `{ type: "image", source: { type: "url", url } }` returns 400 "Unable to download the file" for Wikimedia/Commons thumb URLs (likely blocked/rate-limited on Anthropic's side).

**Why:** Anthropic fetches the URL itself; Wikimedia rejects that fetch even when the URL is publicly valid.

**How to apply:** For vision checks on web images, fetch the image server-side (with a User-Agent, timeout, size cap) and send it as `source: { type: "base64", media_type, data }`. Keep vision checks fail-open so an AI outage doesn't strip all images.
