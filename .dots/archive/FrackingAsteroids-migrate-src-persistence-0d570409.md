<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Migrate src/persistence.ts to @randroids-dojo/vibekit/storage</title>
<meta name="dot-title" content="Migrate src/persistence.ts to @randroids-dojo/vibekit/storage">
<meta name="dot-status" content="closed">
<meta name="dot-priority" content="4">
<meta name="dot-issue-type" content="task">
<meta name="dot-created-at" content="&quot;2026-05-08T23:28:35.470150-05:00&quot;">
<meta name="dot-closed-at" content="2026-06-08T15:22:06.903350-05:00">
<meta name="dot-close-reason" content="Migrated persistence.ts internals to vibekit server readKv/writeKv; kept saveGame/loadGame facade, game: prefix, GameStateSchema, route contract, and legacy JSON-string read compat. 558 unit + 28 integration green, coverage 95.28/90.73/96.85.">
</head>
<body>
<article>
<h1>Migrate src/persistence.ts to @randroids-dojo/vibekit/storage</h1>
<section id="description">
FrackingAsteroids has src/persistence.ts. Audit the API; if it is the same defensive read/write/listen pattern the other projects use, replace internals with @randroids-dojo/vibekit/storage calls (readStorage/writeStorage/listenStorage with a zod schema per persisted shape). Keep persistence.ts as a feature-named facade so call sites do not change.

## Deferred (2026-06-07)

Deferred to the planned vibekit 2.0 migration. Note for that work: the real file is src/lib/persistence.ts and it is server-side Redis (getKv, KEY_PREFIX game:), not client localStorage. vibekit v0.1.0&#39;s storage.ts is a client localStorage helper, so the shapes do not match one-to-one; revisit whether a server-storage facade belongs in vibekit 2.0 before migrating. Dropped to backlog priority until then.
</section>
</article>
</body>
</html>
