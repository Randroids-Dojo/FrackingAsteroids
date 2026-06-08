<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Audit src/game/audio.ts for VibeKit contribution</title>
<meta name="dot-title" content="Audit src/game/audio.ts for VibeKit contribution">
<meta name="dot-status" content="closed">
<meta name="dot-priority" content="4">
<meta name="dot-issue-type" content="task">
<meta name="dot-created-at" content="&quot;2026-05-08T23:28:35.466516-05:00&quot;">
<meta name="dot-closed-at" content="2026-06-08T15:27:26.966481-05:00">
<meta name="dot-close-reason" content="Audited audio.ts: vibekit v0.2.0 has no audio module (nothing to consume); FA keeps its self-contained Web Audio system. Upstream contribution is cross-repo and filed as followup F-002. Build log added to gdd/22.">
</head>
<body>
<article>
<h1>Audit src/game/audio.ts for VibeKit contribution</h1>
<section id="description">
FrackingAsteroids has its own audio module (and is the predecessor that VibeRacer&#39;s audioEngine drew from). Cross-reference with VibeRacer&#39;s src/game/audioEngine.ts and audio modules in VibeCity/Flatline. If a common AudioContext + master + buses + first-gesture-resume pattern emerges, contribute the shared shape to ../VibeKit (likely after VibeRacer&#39;s decouple-audioEngine task lands first).

## Deferred (2026-06-07)

Blocked from this repo and deferred to the vibekit 2.0 migration. This is a cross-repo contribution: it needs a local ../VibeKit checkout with write access and depends on VibeRacer&#39;s decouple-audioEngine task landing first. It cannot be completed from FrackingAsteroids alone. Already at backlog priority; revisit when vibekit 2.0 audio work is scheduled.
</section>
</article>
</body>
</html>
