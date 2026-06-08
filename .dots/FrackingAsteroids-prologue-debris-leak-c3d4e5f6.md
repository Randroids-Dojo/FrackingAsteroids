---
title: "Fix: prologue metal/scrap/debris leaks into the main game"
status: done
priority: 1
issue-type: bug
created-at: 2026-06-01T00:00:00Z
closed-at: 2026-06-01T00:00:00Z
resolution: "resetShipToStation() cleared asteroids/enemies/explosions/shipwreck but left tickState.metalChunks, tickState.scrapBoxes, and the local debrisChunks behind, so uncollected metal and rubble from the scripted intro persisted into the real world. Now clears (scene.remove + dispose) all three, mirroring dispose()."
---

When transitioning out of the prologue (fade-to-black completion or skip, both
via resetShipToStation), any uncollected metal chunks, enemy scrap boxes, and
lingering asteroid debris chunks from the intro stayed in the scene at their
prologue positions and showed up in the main game. resetShipToStation only
cleared asteroids, enemies, projectiles, explosions, and shipwreck debris.

Fix: also remove + dispose tickState.metalChunks, tickState.scrapBoxes, and
debrisChunks in resetShipToStation, matching the dispose() teardown.
