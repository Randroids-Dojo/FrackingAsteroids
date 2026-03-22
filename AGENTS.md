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
dot ls                   # List active tasks
dot ready                # Show tasks ready to work on
dot add -t "title" -p 2  # Create task (priority 0–4)
dot on <id>              # Start working on a task
dot off <id> -r "reason" # Complete a task
```

### Priority Levels

| Level | Meaning  |
|-------|----------|
| 0     | Critical |
| 1     | High     |
| 2     | Medium   |
| 3     | Low      |
| 4     | Backlog  |

### Rules

- Always create or verify dots before coding
- Use `dot on <id>` before starting work
- Use `dot off <id> -r "reason"` when done
- Commit the entire `.dots/` directory with your changes

## Testing Requirements

### Coverage Thresholds

- **Lines ≥ 90%**, **Branches ≥ 80%**, **Functions ≥ 90%**
- Measured on `src/game/**` and `src/lib/**`

### When to Run Tests

- `npm run test:unit` — after any game logic or lib changes
- `npm run test:coverage` — before committing
- `npm run test:e2e` — after UI or game logic changes

### E2E Testing

- E2E tests expose the game instance on `window.__game` for test manipulation
- Mobile viewport tests run alongside desktop (Pixel 5 device profile)

## Strict Typing Rules

- **No `any`** — use `unknown` and narrow
- **No non-null assertions (`!`)** — validate instead
- **Consistent type imports** — use `import type` where applicable
- **Zod-first types** — derive types with `z.infer<>`, never duplicate
- **Boundary validation** — all external data must use `.safeParse()`

## Game Design

- Game Design Document lives at `Docs/GDD.md`
- Update GDD **before** implementing new features
- Update milestones **after** completing features

## Mobile-First Design

- All UI must be responsive and touch-friendly
- Test on mobile viewport (Pixel 5 in Playwright)
- Touch controls for ship movement and firing
- HUD elements must scale appropriately on small screens
- Panels should be full-screen overlays on mobile

## Update Notifications

- Version endpoint at `/api/version`
- `UpdateBanner` component polls for new versions
- Shows non-intrusive banner when update available

## Feedback

- `FeedbackFab` appears when the game is paused
- Pausing reveals the feedback button (floating action button)
- Feedback submitted via `/api/feedback` endpoint

## Pre-Push Checklist

```bash
npm run format
npm run lint:fix
npm run build
```

## Core Principles

- **No broken windows** — fix broken tools/tests immediately
- **Boy Scout Rule** — leave files cleaner than you found them
- **One logical unit per commit** — atomic, reviewable changes
- **No force pushes** unless explicitly instructed
- **No AI attribution** in commit messages
