---
name: Modern watchOS product type
description: Xcode product type required for a single-target SwiftUI watchOS app.
---

A modern single-target SwiftUI watchOS app uses the normal application product
type with the watchOS SDK, not the legacy WatchKit `watchapp2` product type.

**Why:** Combining Swift sources and the legacy WatchKit product type makes
Xcode schedule both `CopyAndPreserveArchs` and `CreateUniversalBinary` for the
same Watch executable, causing a duplicate-output archive failure.

**How to apply:** Keep the Watch target product type as
`com.apple.product-type.application`, set `SDKROOT = watchos`, and embed its
product in the iPhone app's Watch copy phase.