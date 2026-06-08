---
title: "Fix: loaded games show the intro (prologue) ship"
status: closed
priority: 1
issue-type: bug
created-at: "2026-06-01T00:00:00Z"
closed-at: "2026-06-07T22:00:15.414503-05:00"
close-reason: Archived from FluxPanel
---

createGameScene always initializes in the scripted-prologue state: the maxed-out
"intro" ship (createShipModel('prologue')), the prologue asteroid field, maxed
blaster, and the lazer at the origin. The only paths that swap to the normal ship
+ station field are the prologue-fade completion and handleSkipTutorial, both of
which only run during a *new game's* tutorial.

For a loaded game the tutorial is inactive (useTutorial(false)), so
resetShipToStation() is never called and the prologue/intro ship persists. Repro:
new slot, skip intro, finish tutorial (ship is correct in that session), then
reload/return to the save → the maxed intro ship reappears.

Fix: thread an explicit skipPrologue flag (derived from !isNewGame) from page.tsx
through GameCanvas into createGameScene, and call resetShipToStation() at the end
of scene init when set, so loaded games start at the station with the normal ship.
