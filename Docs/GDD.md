# FrackingAsteroids — Game Design Document

## 1. Overview

| Field           | Value                                          |
|-----------------|-------------------------------------------------|
| **Title**       | FrackingAsteroids                               |
| **Genre**       | Arcade / Resource Management                    |
| **Platform**    | Web (desktop & mobile browsers)                 |
| **Tech Stack**  | Next.js, Three.js, Tailwind CSS, Upstash Redis  |
| **Art Style**   | Voxel-style 3D                                  |

### Elevator Pitch

Blast asteroids, collect their fragments, scrap the resources, and reinvest in upgrading your ship's blaster, collector, and storage systems. A tight arcade loop with strategic depth — every destroyed asteroid is an investment opportunity.

### Target Audience

- Casual gamers who enjoy arcade shooters with progression
- Players who like incremental upgrade systems
- Mobile and desktop browser gamers

## 2. Core Concept

### Theme

Deep-space asteroid mining operation. You're a freelance miner turning space rocks into profit.

### Player Fantasy

Pilot a scrappy mining ship, blasting apart asteroids and hoovering up the valuable fragments to build the ultimate mining rig.

### Core Loop

```
BLAST → COLLECT → SCRAP → UPGRADE → repeat
```

1. **Blast** — Shoot asteroids with your blaster to break them into fragments
2. **Collect** — Fly through or attract fragments with your collector beam
3. **Scrap** — Fragments auto-convert to scrap (currency) in your cargo hold
4. **Upgrade** — Spend scrap to improve blaster, collector, or storage capacity

### Win Condition

Reach maximum upgrade tier across all three systems (blaster, collector, storage).

### Loss Condition

None — the game is an endless progression loop. Ship is never destroyed (no health system in v1). Players set their own goals.

## 3. Game Mechanics

### Ship Systems

#### Blaster (Mining Laser)

The blaster is a short-range mining tool, not a long-range weapon. Projectiles are amber-colored
energy pulses that chip away at asteroids. Short range forces the player to fly close to their
claim, reinforcing the mining fantasy.

| Tier | Fire Rate | Projectile Speed | Damage | Spread |
|------|-----------|-------------------|--------|--------|
| 1    | 1/sec     | 200 u/s (base)    | 1      | None   |
| 2    | 2/sec     | 250 u/s (+25%)    | 1      | None   |
| 3    | 3/sec     | 300 u/s (+50%)    | 2      | None   |
| 4    | 4/sec     | 350 u/s (+75%)    | 2      | Dual (±8°) |
| 5    | 5/sec     | 400 u/s (+100%)   | 3      | Triple (0°, ±10°) |

**Projectile Constants:**
- Base speed: 200 units/sec (matches ship max speed — feels like a tool, not a weapon)
- Lifetime: 1.5 seconds (~80 unit effective range, roughly half the visible screen)
- Visual: 2–3 voxel elongated amber pulse (color `0xFFAA00`)
- Collision: circle-circle radius check against asteroids

#### Collector
| Tier | Range   | Pull Speed | Auto-Collect |
|------|---------|------------|--------------|
| 1    | Small   | Slow       | No           |
| 2    | Medium  | Medium     | No           |
| 3    | Large   | Fast       | No           |
| 4    | XL      | Fast       | Nearby       |
| 5    | XXL     | Instant    | All on screen|

#### Storage
| Tier | Capacity | Scrap Bonus |
|------|----------|-------------|
| 1    | 50       | 0%          |
| 2    | 125      | 10%         |
| 3    | 250      | 20%         |
| 4    | 500      | 35%         |
| 5    | 1000     | 50%         |

### Asteroids

| Type     | Size   | Fragments | Scrap Value | HP  |
|----------|--------|-----------|-------------|-----|
| Common   | Large  | 4–6       | 1 each      | 3   |
| Dense    | Medium | 3–4       | 3 each      | 5   |
| Precious | Small  | 2–3       | 8 each      | 2   |
| Comet    | Varies | 5–8       | 5 each      | 4   |

- Asteroids drift across the screen at varying speeds and angles
- Large asteroids split into smaller ones when destroyed
- Asteroid spawn rate increases gradually over time

### Controls

**Desktop:**
- WASD or Arrow Keys — move ship (twin-stick: movement independent of aim)
- Mouse cursor — aim ship (ship rotates to face cursor)
- Mouse click — fire blaster toward cursor
- Space — pause (reveals Feedback FAB)

**Mobile:**
- Left thumb virtual joystick — move (fixed position, left half of screen)
- Right thumb tap — fire toward tap position (ship aims at tap)
- Pause button in HUD — pause (reveals Feedback FAB)

**Design Notes:**
- Ship rotation is decoupled from movement direction — the ship always faces the aim target (mouse cursor on desktop, last tap on mobile)
- When no aim target is active (e.g. mouse hasn't entered canvas), ship faces movement direction as fallback
- Virtual joystick uses a fixed dead zone of 10px to prevent drift

## 4. World & Setting

### Visual Style

- **Voxel art** — chunky, colorful 3D blocks
- **Orthographic or slight perspective camera** — top-down view of the asteroid field
- **Color palette:**
  - Deep space background: dark navy/black with subtle star particles
  - Asteroids: earthy browns, grays, with gold/crystal highlights for precious types
  - Ship: metallic blue-gray with glowing engine trails
  - Fragments: bright, glowing particles matching asteroid type
  - UI/HUD: green and blue neon against dark overlays

### Camera

- Fixed top-down (or slight isometric tilt) view
- Camera follows ship with smooth lerp
- Slight zoom out as speed increases

## 5. Technical Design

### Data Models (Zod Schemas)

```typescript
// Ship state
Ship { x, y, rotation, velocityX, velocityY }

// Upgrade levels (1–5 each)
Upgrades { blaster: number, collector: number, storage: number }

// Player resources
Cargo { scrap: number, fragments: number, capacity: number }

// Full game state (persisted to KV)
GameState { ship, upgrades, cargo, score, wave, timestamp }
```

### State Management

- Game state lives in the Three.js render loop (60fps)
- React state for UI/HUD via `useGameState` hook
- Persistence via `useGamePersistence` hook → Upstash Redis
- Auto-save every 30 seconds + on pause

### API Routes

| Route               | Method | Purpose                    |
|----------------------|--------|----------------------------|
| `/api/game/[id]`    | GET    | Load saved game state      |
| `/api/game/[id]`    | PUT    | Save game state            |
| `/api/health`       | GET    | Health check               |
| `/api/version`      | GET    | Current build version      |
| `/api/feedback`     | POST   | Submit player feedback     |

## 6. User Interface

### HUD (always visible during gameplay)

- **Scrap counter** — top-left, shows current scrap amount
- **Cargo bar** — top-left below scrap, shows fragments/capacity
- **Upgrade indicators** — top-right, shows current tier for each system
- **Wave counter** — top-center
- **Pause button** — top-right corner (mobile: larger touch target)

### Upgrade Panel

- Opens from HUD when player taps upgrade indicators
- Shows three upgrade paths with costs and current/next tier stats
- "Buy" button grayed out if insufficient scrap
- Visual preview of upgrade effect

### Start Screen

- Full-screen menu shown on app launch (before gameplay)
- Title "FRACKING ASTEROIDS" with tagline
- **New Game** button — opens save slot picker (3 slots)
  - If selected slot has saved data, confirm overwrite before starting
  - Creates fresh default game state in chosen slot
- **Load Game** button — opens save slot picker (3 slots)
  - Only populated slots are selectable
  - Disabled entirely if no saves exist
- Each save slot shows: wave number, score, and last-save timestamp
- Save slot summaries stored in localStorage for instant display
- Decorative starfield background with space theme

### Pause Overlay

- Darkened game canvas
- "PAUSED" text centered
- Resume button
- **Feedback FAB** appears (floating action button, bottom-right)

### Update Banner

- Slim banner at top of screen
- "New version available — tap to refresh"
- Non-intrusive, auto-dismissible

## 7. Art & Audio Direction

### Art Style: Voxel

- All game objects built from voxel-style geometry
- Ship: ~8x8x4 voxel block ship with engine glow
- Asteroids: irregular voxel clusters, procedurally varied
- Fragments: small 1-2 voxel glowing cubes
- Projectiles: bright amber elongated voxel pulses (mining laser bolts)
- Background: particle-based star field

### Color Palette

- Space: `#0a0a1a` to `#111133` gradient
- Asteroids: `#8B6914`, `#6B6B6B`, `#FFD700`
- HUD: `#00FF88` (green), `#00AAFF` (blue), `#FF4444` (red), `#FFAA00` (amber)

### Audio (Future)

- Placeholder for sound effects (blaster, collection, upgrade)
- No audio in v1 — visual feedback only

## 8. Milestones

- [ ] **M1: Skeleton** — Project setup, build pipeline, deploy to Vercel
- [ ] **M2: Flight** — Ship rendering and movement (desktop + mobile)
- [ ] **M3: Combat** — Blaster firing, asteroid spawning, collision detection
- [ ] **M4: Economy** — Fragment collection, scrap conversion, cargo system
- [ ] **M5: Upgrades** — Upgrade panel, tier progression, stat scaling
- [ ] **M6: Persistence** — KV save/load, auto-save, game state recovery
- [ ] **M7: Polish** — Voxel art pass, particles, screen shake, mobile refinement
- [ ] **M8: Feedback** — Pause overlay, Feedback FAB, update banner
