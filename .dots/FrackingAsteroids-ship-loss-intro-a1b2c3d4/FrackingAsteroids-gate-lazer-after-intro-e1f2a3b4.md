---
title: "Gate the Lazer behind purchase after the intro/skip"
status: closed
priority: 1
issue-type: bug
created-at: 2026-05-29T00:00:00Z
---

After skipping (or completing) the intro the player could still use the Lazer
even though they never bought it. `resetShipToStation()` reset the *active*
mining tool back to the blaster, but the tool toggle (mobile button + `Q` key)
was never gated by ownership, so the player could immediately switch back to the
Lazer for free. The intro grants the Lazer temporarily; once it ends the Lazer
should be removed until purchased from the shop.

Fix: plumb Lazer ownership (`hasLazer`) into the game scene and gate the tool
toggle on it. The mobile toggle button is hidden until the Lazer is owned, and
`Q`/`toggleMiningTool` is a no-op when switching to an unowned Lazer. Buying the
Lazer enables the toggle.
