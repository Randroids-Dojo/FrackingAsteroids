---
title: "Fix: prologue metal/scrap/debris leaks into the main game"
status: closed
priority: 1
issue-type: bug
created-at: "2026-06-01T00:00:00Z"
closed-at: "2026-06-07T21:52:09.467175-05:00"
close-reason: Archived from FluxPanel
---

When transitioning out of the prologue (fade-to-black completion or skip, both
via resetShipToStation), any uncollected metal chunks, enemy scrap boxes, and
lingering asteroid debris chunks from the intro stayed in the scene at their
prologue positions and showed up in the main game. resetShipToStation only
cleared asteroids, enemies, projectiles, explosions, and shipwreck debris.

Fix: also remove + dispose tickState.metalChunks, tickState.scrapBoxes, and
debrisChunks in resetShipToStation, matching the dispose() teardown.
