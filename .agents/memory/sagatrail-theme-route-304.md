---
name: Theme route 304 handling
description: Why themed-route responses must not rely on Express ETag revalidation
---

Dynamic themed-route lists must return their JSON body even when the request contains an old `If-None-Match` header. A bodyless 304 is not a usable success response for the mobile API client: it becomes `null` instead of a route array and the screen appears empty.

**Why:** React Native does not reliably reconstruct the cached JSON body from an API 304, while Express may emit 304 automatically for `res.json()` responses.

**How to apply:** Keep themed-route fetches uncached on the client and bypass automatic ETag conditional handling on the server for this endpoint. Regression-test both a normal request and a request carrying `If-None-Match`.