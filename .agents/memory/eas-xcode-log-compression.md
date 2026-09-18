---
name: EAS Xcode log compression
description: How to read compiler diagnostics from EAS signed Xcode log URLs.
---

Decode a downloaded EAS Xcode build log before searching it for compiler
errors. Its HTTP response can declare `content-type: text/plain` while also
declaring Brotli content encoding, so the saved file is binary.

**Why:** Grepping the raw download produces no diagnostics and can hide the
file and line of the actual Xcode failure.

**How to apply:** Inspect the response headers; when `content-encoding: br` is
present, use Node's `zlib.brotliDecompressSync` on the temporary download, then
search the decoded text. Signed URLs are short-lived, so retrieve and decode
within the same debugging pass.