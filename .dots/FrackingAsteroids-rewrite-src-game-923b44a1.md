---
title: Rewrite src/game/virtual-joystick.ts to consume @randroids-dojo/vibekit
status: open
priority: 4
issue-type: task
created-at: "2026-05-08T23:28:24.988066-05:00"
---

FrackingAsteroids's virtual-joystick.ts is the older DOM-attached style (creates HTMLElements, directly mutates an InputState). VibeKit's version is headless: it manages JoystickState only and the consumer wires the DOM. Refactor: keep an FrackingAsteroids-specific src/game/virtual-joystick-dom.ts (or similar) that handles the overlay + pointer event wiring and dispatches into VibeKit's createJoystick / beginJoystick / moveJoystick / endJoystick. Then read the deflection vector each frame and set the corresponding InputState fields. Adds ../VibeKit as a file: dep.

## Deferred (2026-06-07)

Deferred to the planned vibekit 2.0 migration. FA now consumes vibekit v0.1.0 (github pin) for the kv slice only; this joystick refactor will land as part of the broader 2.0 adoption rather than piecemeal. vibekit v0.1.0 already exports a headless virtual-joystick module, so the approach stays viable when 2.0 work begins. Dropped to backlog priority until then.
