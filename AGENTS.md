# FrackingAsteroids — Agent Instructions

## Stack

- **Next.js** (App Router, TypeScript strict mode)
- **Tailwind CSS** (utility-first styling, mobile-first responsive)
- **Three.js** (voxel-style 3D rendering)
- **Upstash Redis** (persistent game state via Vercel KV)
- **Zod** (runtime validation for all data boundaries)

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run format           # Prettier — autofix formatting
npm run format:check     # Prettier — check only
npm run lint             # ESLint — errors on unused imports
npm run lint:fix         # ESLint — autofix unused imports
npm run type-check       # TypeScript strict
npm run test:unit        # Unit tests (fast)
npm run test:coverage    # Unit tests + coverage (lines≥90%, branches≥80%, functions≥90%)
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
dot add -t "title" -p 2         # Create task (priority 0–4)
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

## Unit Tests & Coverage

- **Lines ≥ 90%**, **Branches ≥ 80%**, **Functions ≥ 90%**
- Measured on `src/game/**` and `src/lib/**`

### Rules for agents

- Run `npm run test:unit` after any game logic or lib changes
- Run `npm run test:coverage` before committing
- Never merge with coverage below thresholds

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

## Formatting, Linting & TypeScript

- Prettier: no semicolons, single quotes, 100 char width, trailing commas
- ESLint: zero warnings policy (`--max-warnings 0`)
- TypeScript: strict mode with `noUnusedLocals` and `noUnusedParameters`

## Strict Typing Rules (enforced by ESLint)

- **No `any`** — use `unknown` and narrow
- **No non-null assertions (`!`)** — validate instead
- **Consistent type imports** — use `import type` where applicable
- All types derived from Zod schemas via `z.infer<>`, never duplicate

## Schema Validation Rules

- **Zod-first types** — derive types with `z.infer<>`, never hand-write duplicates
- **Boundary validation** — all external data must use `.safeParse()`
- All API route handlers validate request bodies with Zod before processing

## Upstash Redis

- Client lives in `src/lib/kv.ts` — lazy singleton via `getKv()`
- Build succeeds without env vars (lazy initialization)
- Key prefixes: `game:` for game state, `feedback:` for feedback
- All reads must be validated with Zod `.safeParse()` before use

## CI/CD

Three GitHub Actions workflows run on push/PR to `main`:

1. **CI** — format check, lint, type-check, unit tests with coverage
2. **E2E** — Playwright tests with chromium (dummy KV credentials)
3. **Smoke** — build, start server, run smoke tests

Auto-deploy to Vercel via Git integration on push to `main`.

## Game Design

- Game Design Document lives at `Docs/GDD.md`
- Update GDD **before** implementing new features
- Update milestones **after** completing features

### Rules for Agents

- Read `Docs/GDD.md` before starting work on game features
- Propose GDD changes before implementing

## Pre-Push Checklist

```bash
npm run format
npm run lint:fix
npm run build
```

## Input & Event Handling

- **No duplicate event listeners on shared elements** — before adding mouse/touch handlers to a container, check whether other systems (e.g. virtual joystick, aim handler) already listen on the same element for the same event types. Two systems fighting over `touchmove` on the same element is a bug.
- **Separate mouse and touch concerns** — desktop uses mouse events for aiming; mobile uses touch events for the virtual joystick and tap-to-fire. Don't mix them in a single handler — they have different semantics and will conflict on multi-touch.
- **Handle nullable returns from Three.js** — methods like `raycaster.ray.intersectPlane()` can return `null`. Always handle the null case even when it seems unlikely with the current camera setup.

## Code Quality

- **Docstrings must match the actual data** — if a field stores screen-space pixels, don't document it as "world coordinates." Misleading docs are worse than no docs.
- **No dead code in tests** — no empty `afterEach` blocks, no unused variables. Tests are code too; keep them clean.
- **Self-review before committing** — re-read every changed file for: conflicting event handlers on shared elements, misleading comments/docs, unhandled nullable returns, and dead code. These are the most common issues.

## No Broken Windows

Fix broken tools, tests, or builds immediately. Never leave the codebase in a worse state than you found it.

## Boy Scout Rule

Leave files cleaner than you found them. Small improvements add up.

## Commits

- **One logical unit per commit** — atomic, reviewable changes
- **No force pushes** unless explicitly instructed
- **No AI attribution** in commit messages
