---
name: Treffpunkt vs. Gruppenwanderung
description: Product boundary between SagaTrail's public meetup flow and private synchronized group hikes.
---

Keep the two systems separate:

- **Treffpunkt** is the public flow for strangers arranging a hike. It owns joining/leaving, organizer controls, cancellations, delays, arrival status, push notifications, moderation, and pre-hike safety information.
- **Gruppenwanderung** is the private family/friends mode. It owns shared story playback, hike leadership, chapter and decision synchronization, and explicitly consented foreground location sharing.
- People who met through a Treffpunkt may later start or join a Gruppenwanderung, but this is an explicit transition between systems. A Treffpunkt must not silently activate group location sharing or private story synchronization.

**Why:** Public participation and private live coordination have different trust, consent, privacy, and safety requirements. Combining them risks exposing locations or enabling private synchronization without clear consent.

**How to apply:** Put attendance and organizer features in Meetup APIs/UI. Put live hike synchronization and voluntary location sharing in Group Session APIs/UI. Any bridge between them must be explicit to the user and preserve separate consent.