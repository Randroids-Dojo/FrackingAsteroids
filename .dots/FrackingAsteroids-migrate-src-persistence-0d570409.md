---
title: Migrate src/persistence.ts to @randroids-dojo/vibekit/storage
status: open
priority: 4
issue-type: task
created-at: "2026-05-08T23:28:35.470150-05:00"
---

FrackingAsteroids has src/persistence.ts. Audit the API; if it is the same defensive read/write/listen pattern the other projects use, replace internals with @randroids-dojo/vibekit/storage calls (readStorage/writeStorage/listenStorage with a zod schema per persisted shape). Keep persistence.ts as a feature-named facade so call sites do not change.

## Deferred (2026-06-07)

Deferred to the planned vibekit 2.0 migration. Note for that work: the real file is src/lib/persistence.ts and it is server-side Redis (getKv, KEY_PREFIX game:), not client localStorage. vibekit v0.1.0's storage.ts is a client localStorage helper, so the shapes do not match one-to-one; revisit whether a server-storage facade belongs in vibekit 2.0 before migrating. Dropped to backlog priority until then.
