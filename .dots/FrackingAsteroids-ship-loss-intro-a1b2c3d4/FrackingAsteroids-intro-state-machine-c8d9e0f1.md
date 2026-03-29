---
title: "Intro sequence state machine"
status: open
priority: 1
issue-type: task
created-at: 2026-03-29T00:00:00Z
---

Build a state machine to orchestrate the full intro sequence:

1. INTRO_START — spawn max ship, set up dense asteroid field
2. INTRO_MINING — player blasts asteroids, collects cargo (guided or free-roam)
3. INTRO_COMBAT — enemy fleet spawns, player fights
4. INTRO_SPEED — open area for high-speed flying
5. INTRO_AMBUSH — ambush triggers, ship destroyed
6. INTRO_RESPAWN — fade transition, respawn with basic ship
7. TUTORIAL_START — hand off to existing tutorial state machine

This should integrate with or extend the existing tutorial state machine.
