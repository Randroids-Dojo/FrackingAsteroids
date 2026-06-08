# AGENTS.md

Shared rules for every agentic coding tool working in FrackingAsteroids. Claude Code, Codex, Cursor, and any future agent: this file is mandatory reading before you write anything.

This repo uses the HTML-first variant of the spiral scaffold. The ledgers and contracts under `docs/` are `.html` files. This file (`AGENTS.md`) and `CLAUDE.md` stay as Markdown so Codex's root-down walk and Claude Code's project-memory import keep working.

Project pitch: Blast asteroids, collect their fragments, scrap the resources, and reinvest in upgrading your ship blaster, collector, and storage. A tight arcade loop with strategic depth.

---

## RULE 1: NEVER USE EM-DASHES. EVER.

No em-dashes. Not in chat. Not in code comments. Not in commit messages. Not in PR descriptions. Not in docs. Not in test names. Not anywhere.

Use a period, comma, colon, parentheses, or rewrite the sentence. En-dashes are not substitutes. Plain hyphens are fine for ranges like `pages 10-20` and compound words.

Before every tool call that writes text, scan your output for Unicode codepoints U+2014 (em-dash) and U+2013 (en-dash). Rewrite if either is present.

If porting or quoting text from another source, strip all em-dashes from the ported text before committing.

---

## RULE 2: Read the GDD before making design decisions

The Game Design Document at `docs/gdd/` is the source of truth for what FrackingAsteroids is. Before proposing architecture, adding features, or changing data schemas, read it. If the GDD and your idea disagree, the GDD wins unless explicitly approved.

Before each implementation slice, read:

- `AGENTS.md`
- `README.md`
- `docs/IMPLEMENTATION_PLAN.html`
- `docs/WORKING_AGREEMENT.html`
- `docs/gdd/` (the relevant requirement files)
- `docs/PROGRESS_LOG.html`
- `docs/OPEN_QUESTIONS.html`
- `docs/FOLLOWUPS.html`
- `docs/GDD_COVERAGE.json`
- `docs/DEPENDENCY_LEDGER.html` (and run the Dependency Upgrade Gate from `docs/IMPLEMENTATION_PLAN.html`)
- `docs/PLAYTEST.html` and `docs/FUN_FACTOR_AUDIT.html` when coverage is >=80% done
- the current task backlog (Dots or equivalent)

### Path-scoped Rules

Three additional rule files live under `.claude/rules/`. They are loaded automatically:

- **Claude Code** loads them based on the `paths:` glob in their frontmatter.
- **Codex** loads them via per-directory `AGENTS.md` symlinks (`docs/AGENTS.md`, `docs/gdd/AGENTS.md`) on its root-down walk.

The three rules:

- `.claude/rules/slice-discipline.md` (paths: source-code globs): no drive-by refactors, no speculative abstractions, refactor-in-slice.
- `.claude/rules/ledger-append-only.md` (paths: the four ledger files): never delete past entries.
- `.claude/rules/gdd-build-log.md` (paths: GDD section files): append a build log entry on every shipped feature.

When you add a source directory (`src/`, `app/`, `lib/`, `components/`, `pages/`, `tests/`, etc.) to this project, run this once to make slice-discipline visible to Codex inside that tree:

```
ln -sf ../.claude/rules/slice-discipline.md <src-dir>/AGENTS.md
```

Claude Code already picks up slice-discipline by path glob without the symlink.

---

## RULE 3: Stack constraints

Next.js (App Router, TypeScript strict), Tailwind CSS, Three.js (voxel 3D), Upstash Redis (via Vercel KV), Zod (runtime validation at all data boundaries).

Do not introduce new dependencies in core categories without explicit user approval.

---

## RULE 4: Commit messages and PR descriptions

- Write them as a human would.
- No AI attribution. No `Co-Authored-By: Claude`. No "Generated with Claude Code" footers. No mention of Claude, Anthropic, or AI assistance.
- Keep them short, clean, professional. Focus on the why, not the what.

---

## RULE 5: Autonomous PR loop

Operate continuously until the planned scope is complete. The loop definition lives in `docs/IMPLEMENTATION_PLAN.html`. The process contract lives in `docs/WORKING_AGREEMENT.html`. Follow both on every slice.

For every slice:

1. Read the rule, plan, product, progress, question, followup, coverage, dependency-ledger, and backlog documents listed in Rule 2.
2. Run the Dependency Upgrade Gate (see `docs/IMPLEMENTATION_PLAN.html`). If a watched dep is out of date, the upgrade IS the next slice unless red CI takes over.
3. Pick the highest-priority unblocked task from the implementation plan, dep ledger, GDD coverage gaps, followups, and active backlog.
4. Create one branch for one PR-sized slice. Never push directly to `main`.
5. Implement the slice fully using existing project patterns.
6. Add or update tests appropriate to the risk and surface area.
7. Update `docs/PROGRESS_LOG.html`, `docs/GDD_COVERAGE.json`, `docs/OPEN_QUESTIONS.html`, `docs/FOLLOWUPS.html`, `docs/DEPENDENCY_LEDGER.html`, and the GDD section when the work changes them.
8. Run the local verification suite. At minimum: dash checks, `git diff --check`, type-check, relevant unit tests, broader checks when warranted.
9. Re-run the Dependency Upgrade Gate before opening the PR. If a watched release landed while the slice was in flight, defer the bump to its own PR (do not bundle).
10. Open a PR.
11. Inspect all PR review comments, including inline and threaded comments from CodeRabbit or other review bots.
12. Fix actionable review comments, reply in-thread when the platform supports it, resolve threads when resolved.
13. After every push to the PR branch, wait for any configured bot reviewer to finish its review pass. The wait is settled only when all required checks are green AND at least 60 seconds have passed since the latest PR branch push or latest bot review activity, whichever is later. Re-inspect reviews and review threads after the settled wait.
14. Wait for CI and the preview deploy to pass.
15. Merge only when green, review feedback is handled, bot review has settled, and the preview deploy is healthy.
16. Pull `main`, verify main CI and production deploy, smoke test production.
17. Close the completed backlog item with the PR number and verification.
18. Immediately start the next slice.

Do not stop at planning. Do not stop after opening a PR. Do not stop after merge. If blocked, log the blocker, update the backlog item, move to the next unblocked slice.

Never mark work complete with failing tests, unresolved actionable review comments, a bot review still in flight after the latest push, red CI, or a broken deploy.

---

## RULE 6: Destructive and shared-system actions

Always confirm with the user before:

- `git push --force`, `git reset --hard`, `rm -rf`, dropping data stores, deleting files or branches.
- Direct pushes to `main` or any protected branch.
- Modifying CI/CD configuration.
- Uploading content to third-party services.

Prior approval for one destructive action is not approval for all of them. Ask each time.

---

## RULE 7: When in doubt, ask. And prefer simple consistent flows.

- When a UX decision could go branchy (different behavior per route, per state, per user), default to one consistent rule across all cases.
- Always explain why you are prompting the user for input.
- If requirements are ambiguous and a reasonable default would be risky, ask. Otherwise choose the simplest consistent path, document the assumption in `docs/OPEN_QUESTIONS.html` with a `Recommended default:`, ship under that default, and keep moving.

---

## RULE 8: Secrets and environment variables

- Never commit `.env`, `.env.local`, or any file containing credentials.
- Never print secret values in logs, chat, or commit messages.
- Document expected env vars in `README.md`. Set them in the deployment dashboard, not in the repo.

---

## RULE 9: Testing expectations

- New pure logic must have unit tests.
- New API routes must have at least one route-handler test plus one smoke test.
- Do not mark a task complete with failing tests.

## RULE 10: Motion and overlay QA

When adding auto-scrolling, credits, animated overlays, portals, or modal UI:

- Verify the visible pixels move, not just that a control says the animation is active.
- Add coverage that measures a changing DOM rect, transform, canvas pixel, or other observable movement over time.
- Do not pause auto-motion on focus by default. Focus can happen on mount and silently disable the feature.
- For modal overlays, set z-index above every fixed interactive app surface and confirm background controls cannot sit above the dialog.
- Preserve normal keyboard activation on focused buttons and form controls.
- Expose toggle state with `aria-pressed` or equivalent accessible state.

---

## RULE 11: One backing store per project

Every Vercel project gets its own dedicated storage resources. Never share an Upstash KV, Postgres, Blob, or any other backing store across projects, even when key-prefix or schema namespacing would prevent collisions.

Why:

- Shared rate limits. One project's runaway loop pressures the other's ceiling.
- Shared billing. Cost attribution becomes impossible.
- Shared rotation. A token leak in one project forces every co-tenant to redeploy.
- Shared blast radius on outages. A misconfigured PUT in one project can fill the other's storage budget.

How:

- Provision storage via the Vercel marketplace UI before wiring code that needs it. The CLI does not expose marketplace provisioning; this is one of the few setup steps that lives in the dashboard.
- After provisioning, attach the resource to exactly one Vercel project. Never use `vercel env add` to copy another project's connection string into this project.
- The first env vars on a fresh project should come from the project's own provisioned store, not from another project's `.env.local`.
- Local dev pulls from the project's own Vercel env via `vercel env pull` (which respects the project link in `.vercel/project.json`).

If you find yourself about to run `vercel env add KV_REST_API_URL` with a value that came from another project's env, stop. Provision a dedicated store first.

---

## Quick pre-commit checklist

1. No em-dashes. Run `grep -rnP '[\x{2014}\x{2013}]' .` (checks for U+2014 em-dash and U+2013 en-dash). Must return nothing.
2. No AI attribution in the commit message.
3. Tests pass locally.
4. GDD is still accurate, or updated.
5. No secrets in the diff.

---

# Project Operations

The sections below are FrackingAsteroids-specific operational knowledge. They sit under the rules above, not over them.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run format           # Prettier: autofix formatting
npm run format:check     # Prettier: check only
npm run lint             # ESLint: errors on unused imports
npm run lint:fix         # ESLint: autofix unused imports
npm run type-check       # TypeScript strict
npm run test:unit        # Unit tests (fast)
npm run test:coverage    # Unit tests + coverage (lines >= 90%, branches >= 80%, functions >= 90%)
npm run test:integration # Integration tests (headless gameplay flows)
npm run test:smoke       # Smoke tests
npm run test:e2e         # E2E tests with Playwright
npm run test:e2e:headed  # E2E tests with GUI
```

## Task Tracking with .dots

We use [dots](https://github.com/joelreymont/dots) for persistent task tracking.

### Essential Commands

```bash
dot ls                          # List active tasks
dot ready                       # Show tasks ready to work on
dot add -t "title" -p 2         # Create task (priority 0 to 4)
dot on <id>                     # Start working on a task
dot off <id> -r "What was done" # Complete a task
dot "Short description"         # Quick-add a task
dot add "Description" -p 1 -d "Details"
dot add "Subtask" -P dots-1     # Add subtask under parent
dot add "After X" -a dots-2     # Add task after another
dot show dots-1                 # Show task details
dot tree                        # Show task tree
dot find "query"                # Search tasks
```

### Priority Levels

| Level | Meaning  |
|-------|----------|
| 0     | Critical |
| 1     | High     |
| 2     | Medium   |
| 3     | Low      |
| 4     | Backlog  |

### Rules for Agents

- Always create or verify dots before coding
- Use `dot on <id>` before starting work
- Use `dot off <id> -r "reason"` when done
- Commit the entire `.dots/` directory with your changes

## Unit Tests and Coverage

- **Lines >= 90%**, **Branches >= 80%**, **Functions >= 90%**
- Measured on `src/game/**` and `src/lib/**`

### Rules for agents

- Run `npm run test:unit` after any game logic or lib changes
- Run `npm run test:coverage` before committing
- Never merge with coverage below thresholds. If coverage is already below when you start, fix it before pushing your own changes

## Integration Tests

Headless gameplay-flow tests that exercise multiple game systems together without
Three.js, DOM, or a browser.

```
tests/integration/
  helpers/mock-three.ts    Lightweight Three.js mock (install before imports)
  game-simulation.ts       Headless game loop using existing pure functions
  game-test-harness.ts     Convenience wrapper with actions and assertions
  flows/
    mining-flow.test.ts    Projectile firing, asteroid damage, metal collection
    lazer-tool.test.ts     Crystalline deflection, lazer damage, tool switching
    pause-resume.test.ts   Stale fire state, pause/freeze/unpause behavior
```

### Architecture

1. **`mock-three.ts`**: Stubs `THREE.Group`, `Mesh`, `BoxGeometry`, etc. so game
   modules that touch `.mesh.position.set()` can be imported without WebGL.
   Call `installMockThree()` in `before()` and `uninstallMockThree()` in `after()`.
2. **`GameSimulation`**: Replicates the `scene.ts` game loop orchestration
   (ship physics, blaster, collisions, enemies, metal, station proximity) using
   the same pure functions. Supports `step(dt)` / `stepN(n)`, input injection
   (`fireAt`, `holdFireAt`, `setInput`, `startCollecting`), world injection
   (`spawnAsteroid`, `spawnEnemy`, `spawnMetal`, `teleportShip`), and event capture.
3. **`GameTestHarness`**: Wraps `GameSimulation` with high-level actions
   (`fireAndWait`, `destroyAsteroid`, `collectAllMetal`, `moveToward`, `stepUntil`)
   and assertion helpers (`assertHp`, `assertAsteroidDestroyed`, `assertEventCount`).

### Rules for agents

- Run `npm run test:integration` after changes to game logic or scene orchestration
- New gameplay features should have at least one integration test flow
- Keep `GameSimulation.step()` in sync with `scene.ts` game loop changes
- Use `GameTestHarness` for readable tests; avoid raw `step()` loops in flow tests

## Smoke Tests

```bash
npm run build && npm start &
npx wait-on http://localhost:3000
npm run test:smoke
```

- Smoke tests verify the app builds and the health/version endpoints respond

## E2E Tests (Playwright)

```bash
npm run test:e2e
npm run test:e2e:headed
npx playwright test --ui
```

### Rules for agents

- Run `npm run test:e2e` after UI or game logic changes
- E2E tests expose the game instance on `window.__game` for test manipulation
- Mobile viewport tests run alongside desktop (Pixel 5 device profile)

## Formatting, Linting and TypeScript

- Prettier: no semicolons, single quotes, 100 char width, trailing commas
- ESLint: zero warnings policy (`--max-warnings 0`)
- TypeScript: strict mode with `noUnusedLocals` and `noUnusedParameters`

## Strict Typing Rules (enforced by ESLint)

- **No `any`**: use `unknown` and narrow
- **No non-null assertions (`!`)**: validate instead
- **Consistent type imports**: use `import type` where applicable
- All types derived from Zod schemas via `z.infer<>`, never duplicate

## Schema Validation Rules

- **Zod-first types**: derive types with `z.infer<>`, never hand-write duplicates
- **Boundary validation**: all external data must use `.safeParse()`
- All API route handlers validate request bodies with Zod before processing

## Upstash Redis

- Client lives in `src/lib/kv.ts`: lazy singleton via `getKv()`
- Build succeeds without env vars (lazy initialization)
- Key prefixes: `game:` for game state, `feedback:` for feedback
- All reads must be validated with Zod `.safeParse()` before use

## CI/CD

Three GitHub Actions workflows run on push/PR to `main`:

1. **CI**: format check, lint, type-check, unit tests with coverage
2. **E2E**: Playwright tests with chromium (dummy KV credentials)
3. **Smoke**: build, start server, run smoke tests

Auto-deploy to Vercel via Git integration on push to `main`.

## 3D / Voxel Art Guidelines

- Ship model uses `VOXEL_SIZE` from `src/game/ship-constants.ts` (currently 0.5)
- Asteroids and other large objects should use their own larger voxel size constant, **not** the ship's `VOXEL_SIZE`, to appear properly scaled at the camera's height (~150 units)
- A voxel size of **2.0** makes ~10-voxel-wide objects clearly visible on screen
- The camera looks down the Z-axis (`position.z = 150`, FOV 50 degrees), so the visible area is roughly 140x100 units. Size models accordingly
- Voxel models are built with `THREE.Group` containing `THREE.Mesh` children (BoxGeometry + MeshStandardMaterial with `flatShading: true`)
- Use dedicated color palettes per object type (see `ASTEROID_COLORS` in `asteroid-model.ts`)

## Pre-Push Checklist

```bash
npm run format
npm run lint:fix
npm run test:unit
npm run test:integration
npm run build
```

## Input and Event Handling

- **No duplicate event listeners on shared elements**: before adding mouse/touch handlers to a container, check whether other systems (e.g. virtual joystick, aim handler) already listen on the same element for the same event types. Two systems fighting over `touchmove` on the same element is a bug.
- **Separate mouse and touch concerns**: desktop uses mouse events for aiming; mobile uses touch events for the virtual joystick and tap-to-fire. Don't mix them in a single handler. They have different semantics and will conflict on multi-touch.
- **Always `preventDefault()` on handled touch events**: the browser synthesizes mouse events (`mousemove`, `mousedown`) from unhandled touches. If a touch handler processes an event but doesn't call `e.preventDefault()`, the synthetic mouse event will leak into mouse-only systems (e.g. aim handler), causing unintended side effects like the ship rotating toward a tap. Every `touchstart`/`touchmove` handler that consumes the event must call `e.preventDefault()`.
- **Swallow all touches in every screen region**: every area of the screen must have a touch handler that calls `e.preventDefault()`, even if the touch does nothing gameplay-wise. If you replace a broad touch handler (e.g. "right-half tap to fire") with a smaller element (e.g. a fire button), the uncovered area still receives touches that the browser will convert into synthetic mouse events. Always add a catch-all `touchstart` handler with `preventDefault()` for any region not covered by a specific touch control.
- **Ship rotation is joystick-only on mobile**: the left-side virtual joystick is the sole control for ship facing direction on mobile. Right-side taps fire in the ship's current facing direction. No touch event on the right side should influence `aimState` or ship rotation. If adding new touch interactions, verify they don't feed into the aim/rotation pipeline.
- **No speed gates on input-driven rotation**: when the player is actively providing directional input (joystick or keyboard), the ship must rotate to face that direction immediately, regardless of current velocity. Never require a minimum speed before allowing rotation. It makes controls feel broken.
- **Handle nullable returns from Three.js**: methods like `raycaster.ray.intersectPlane()` can return `null`. Always handle the null case even when it seems unlikely with the current camera setup.

## Code Quality

- **Docstrings must match the actual data**: if a field stores screen-space pixels, don't document it as "world coordinates." Misleading docs are worse than no docs.
- **No dead code in tests**: no empty `afterEach` blocks, no unused variables. Tests are code too; keep them clean.
- **Self-review before committing**: re-read every changed file for: conflicting event handlers on shared elements, misleading comments/docs, unhandled nullable returns, and dead code. These are the most common issues.

## No Broken Windows

Fix broken tools, tests, or builds immediately, even if someone else broke them. If CI is red when you start, fix it first. If coverage is below thresholds, raise it. Never leave the codebase in a worse state than you found it.

## Boy Scout Rule

Leave files cleaner than you found them. Small improvements add up.

## Commits

- **One logical unit per commit**: atomic, reviewable changes
- **No force pushes** unless explicitly instructed
- **No AI attribution** in commit messages

## Dependency Upgrade Gate

The agent runs the gate at every loop boundary that touches `main`:

- After landing on fresh `main` (post-merge or fresh pull), before picking the next slice.
- Before opening a new PR, in case a watched release landed while the slice was in flight.

Read `docs/DEPENDENCY_LEDGER.html`. For every watched dep (currently: `@randroids-dojo/vibekit`), run its **Detect-new** command and compare against the ledger's **Currently pinned** value. If newer, the upgrade IS the next slice unless red CI or a P0 incident takes over. Follow the per-dep procedure in `docs/DEPENDENCY_LEDGER.html` (branch, read upstream CHANGELOG, bump pin, type-check, test, build, smoke, PR with title `chore(deps): bump <dep> from <from> to <to>`). If the upgrade requires a migration that cannot land in one PR, abort the bump, file a followup, and continue with the prior pin. The bump PR updates the ledger's **Currently pinned** line in the same diff.
