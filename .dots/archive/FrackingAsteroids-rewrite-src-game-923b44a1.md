<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Rewrite src/game/virtual-joystick.ts to consume @randroids-dojo/vibekit</title>
<meta name="dot-title" content="Rewrite src/game/virtual-joystick.ts to consume @randroids-dojo/vibekit">
<meta name="dot-status" content="closed">
<meta name="dot-priority" content="4">
<meta name="dot-issue-type" content="task">
<meta name="dot-created-at" content="&quot;2026-05-08T23:28:24.988066-05:00&quot;">
<meta name="dot-closed-at" content="2026-06-08T15:07:17.223186-05:00">
<meta name="dot-close-reason" content="Refactored virtual-joystick.ts to delegate headless state to vibekit createJoystick/begin/move/end/readJoystick; FA keeps DOM overlay, touch regions, dead zone, and InputState/fire-angle outputs. 558 unit + 28 integration green.">
</head>
<body>
<article>
<h1>Rewrite src/game/virtual-joystick.ts to consume @randroids-dojo/vibekit</h1>
<section id="description">
FrackingAsteroids&#39;s virtual-joystick.ts is the older DOM-attached style (creates HTMLElements, directly mutates an InputState). VibeKit&#39;s version is headless: it manages JoystickState only and the consumer wires the DOM. Refactor: keep an FrackingAsteroids-specific src/game/virtual-joystick-dom.ts (or similar) that handles the overlay + pointer event wiring and dispatches into VibeKit&#39;s createJoystick / beginJoystick / moveJoystick / endJoystick. Then read the deflection vector each frame and set the corresponding InputState fields. Adds ../VibeKit as a file: dep.

## Deferred (2026-06-07)

Deferred to the planned vibekit 2.0 migration. FA now consumes vibekit v0.1.0 (github pin) for the kv slice only; this joystick refactor will land as part of the broader 2.0 adoption rather than piecemeal. vibekit v0.1.0 already exports a headless virtual-joystick module, so the approach stays viable when 2.0 work begins. Dropped to backlog priority until then.
</section>
</article>
</body>
</html>
