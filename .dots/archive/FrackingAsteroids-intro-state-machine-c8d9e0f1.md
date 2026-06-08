<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Intro sequence state machine</title>
<meta name="dot-title" content="Intro sequence state machine">
<meta name="dot-status" content="closed">
<meta name="dot-priority" content="1">
<meta name="dot-issue-type" content="task">
<meta name="dot-created-at" content="2026-03-29T00:00:00Z">
<meta name="dot-closed-at" content="2026-06-07T21:44:34.786905-05:00">
<meta name="dot-close-reason" content="Shipped as the prologue state machine: TutorialStep enum (prologue-start/mining/arbiter/dialogue/strip/fade) in src/hooks/useTutorial.ts and prologueTick in src/game/game-tick.ts, handing off to the existing tutorial.">
</head>
<body>
<article>
<h1>Intro sequence state machine</h1>
<section id="description">
Build a state machine to orchestrate the full intro sequence:

1. prologue-start: spawn max ship, set up dense asteroid field
2. prologue-mining: player blasts asteroids, collects cargo, and destroys the enemy fleet
3. prologue-arbiter: Arbiter warps in and approaches the ship
4. prologue-dialogue: Arbiter dialogue freezes the ship
5. prologue-strip: Arbiter removes modules from the ship
6. prologue-fade: systems offline, rebooting, and respawn with basic ship
7. move: hand off to the existing tutorial state machine

This should integrate with or extend the existing tutorial state machine.
</section>
</article>
</body>
</html>
