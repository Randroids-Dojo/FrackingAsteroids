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

## 2. Game Mechanics

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
- Base speed: 200 units/sec (exceeds ship cruise speed ~56 u/s — bolts outrun the ship)
- Lifetime: 1.5 seconds (~300 unit max range, but effective mining range is much shorter)
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

### Player HP

The player ship has 100 HP. HP is lost when hit by enemy projectiles. HP is restored to full
when passing through the gas station (drive-through repair). HP is persisted across saves.

### Asteroids

| Type     | Size   | Color Palette        | HP  |
|----------|--------|----------------------|-----|
| Common   | Large  | Brown / blue crystal | 15  |
| Dense    | Medium | Gray-purple / violet | 14  |
| Precious | Small  | Gold / yellow accent | 6   |
| Comet    | Varies | Blue-teal / cyan     | 10  |
| Crystalline | Varies | Deep purple / magenta | 30 |

- Five types with distinct color palettes and sizes
- Crystalline asteroids are immune to the standard blaster and require a Lazer to mine
- Asteroids drift across the field at varying speeds and angles
- Spawned in a ring around the gas station after the tutorial
- Voxel models with seeded shapes for visual variety

#### Lazer (Advanced Mining Tool)

The Lazer is a purchasable mining tool that allows harvesting crystalline asteroids and deals
1.5x damage to all asteroid types. Purchased at the Trade Station for 200 scrap. Players switch
between the Blaster and Lazer via a HUD dropdown.

| Property | Value |
|----------|-------|
| Cost | 200 scrap |
| Damage Multiplier | 1.5x (all asteroids) |
| Projectile Color | Cyan (`0x00CCFF`) |
| Required For | Crystalline asteroids |

A tutorial popup appears when the player tries to shoot a crystalline asteroid with the blaster,
hinting that they need a Lazer. The game freezes during the popup and is dismissed by pressing
anywhere on screen. The popup appears every time the player deflects off crystalline.

### Controls

**Desktop:**
- WASD or Arrow Keys — move ship (twin-stick: movement independent of aim)
- Mouse cursor — aim ship (ship rotates to face cursor)
- Mouse click — fire blaster toward cursor
- Right-click — hold to activate collector
- E or Space — hold to activate collector
- Space — pause (reveals Feedback FAB)

**Mobile:**
- Left thumb virtual joystick — move (fixed position, left half of screen)
- Fire button — visible circular amber button on bottom-right, fires in the direction the ship is facing
- Collect button — visible circular blue button above fire button, hold to activate metal attractor
- Pause button in HUD

**Design Notes:**
- Ship rotation is decoupled from movement direction — the ship always faces the aim target
- When no aim target is active, ship faces movement direction as fallback
- Virtual joystick uses a fixed dead zone of 10px to prevent drift

## 3. World & Setting

### Visual Style

- **Voxel art** — chunky, colorful 3D blocks
- **Perspective camera** — top-down view of the asteroid field
- **Color palette:**
  - Deep space background: dark navy/black with subtle star particles
  - Asteroids: earthy browns, grays, with gold/crystal highlights for precious types
  - Ship: metallic blue-gray with glowing engine trails
  - Fragments: bright, glowing particles matching asteroid type
  - UI/HUD: green and blue neon against dark overlays

### Camera

- Fixed top-down view
- Camera follows ship with smooth lerp

### Gas Station

- Located north of the starting area
- Drive-through repair: restores HP to full when passing close
- Trade menu: sell materials for scrap, buy upgrades

## 4. Technical Design

### Data Models (Zod Schemas)

```typescript
Ship { x, y, rotation, velocityX, velocityY }
Upgrades { blaster: number, collector: number, storage: number }
Cargo { scrap: number, fragments: number, silver: number, gold: number, capacity: number }
GameState { ship, upgrades, cargo, hp, timestamp }
```

### State Management

- Game state lives in the Three.js render loop (60fps)
- React state for UI/HUD via `useGameState` hook
- Persistence via `useGamePersistence` hook → Upstash Redis
- Auto-save on: resource collection, selling, buying, station repair

### API Routes

| Route               | Method | Purpose                    |
|----------------------|--------|----------------------------|
| `/api/game/[id]`    | GET    | Load saved game state      |
| `/api/game/[id]`    | PUT    | Save game state            |
| `/api/health`       | GET    | Health check               |
| `/api/version`      | GET    | Current build version      |
| `/api/feedback`     | POST   | Submit player feedback     |

## 5. User Interface

### HUD (always visible during gameplay)

- **Scrap counter** — top-left, shows current scrap amount
- **Cargo bar** — top-left below scrap, shows fragments/capacity
- **Upgrade indicators** — top-right, shows current tier for each system
- **Recharge meter** — small horizontal bar below ship, shows blaster cooldown progress
- **Health bar** — shown when HP is below max
- **Pause button** — top-right corner (mobile: larger touch target)

### Start Screen

- Full-screen menu shown on app launch
- Title "FRACKING ASTEROIDS" with tagline
- **New Game** button — opens save slot picker (3 slots)
- **Load Game** button — opens save slot picker (3 slots)
- Each save slot shows last-save timestamp
- Save slot summaries stored in localStorage for instant display

### Pause Overlay

- Darkened game canvas
- "PAUSED" text centered
- Resume button
- **Feedback FAB** appears (floating action button, bottom-right)

## 6. Art & Audio Direction

### Art Style: Voxel

- All game objects built from voxel-style geometry
- Ship: ~8x8x4 voxel block ship with engine glow
- Asteroids: irregular voxel clusters, procedurally varied per type
- Fragments: small 1-2 voxel glowing cubes
- Projectiles: bright amber elongated voxel pulses (mining laser bolts)
- Background: particle-based star field

### Visual Effects

**Screen Shake:**
- Triggered when player is hit by enemy projectiles
- Trauma-based system: damage adds trauma (0–1), quadratic falloff for intensity
- Camera offset oscillates at 25 Hz, decays at rate of 4.0/sec

**Engine Trail:**
- Glowing orange/red particles emitted from ship rear
- Emission rate and brightness scale with ship speed
- Particles fade and shrink over 0.4 seconds

**Background Effects:**
- Twinkling deep-space stars: 200 colored points with per-star brightness oscillation
- Nebula swirls: 5 large semi-transparent glowing clouds with additive blending
- Black hole: Dark core with 4 spinning accretion rings (orange/red gradient)
- All background layers parallax at different rates for depth

### Color Palette

- Space: `#0a0a1a` to `#111133` gradient
- Asteroids: brown (common), gray-purple (dense), gold (precious), blue-teal (comet), deep purple (crystalline)
- Mining laser: `#FFAA00` (amber bolt), `#FFDD44` (bright core)
- HUD: `#00FF88` (green), `#00AAFF` (blue), `#FF4444` (red), `#FFAA00` (amber)
- Engine trail: `#FF6600`, `#FF4400`, `#FF8800`, `#FFAA00` (orange spectrum)
- Nebulae: `#220044` (purple), `#001133` (blue), `#110022` (magenta)
- Black hole rings: `#FF4400`, `#FF8800`, `#FFAA00`, `#FF6600`

### Audio

All audio is procedurally synthesized using the Web Audio API — no external audio files.

**Background Music:**
- Four-layer procedural soundtrack generated live
- Layer 0: Deep bass drone (always playing)
- Layer 1: Pad chords (fades in at low intensity)
- Layer 2: Arpeggiated melody (fades in during moderate activity)
- Layer 3: Percussion pulse (fades in during combat)
- Intensity lerps smoothly between peaceful (0.15) and combat (0.8)

**Sound Effects:**
- Laser fire: Short chirpy zap (bandpass-filtered square wave)
- Explosion: Low boom with noise burst (when asteroids/enemies are hit)
- Player hit: Sharp impact with distortion crack
- Engine thrust: Filtered noise loop, volume/frequency scale with ship speed
- Collector hum: Low sawtooth drone when magnet is active
- Collection pling: Metallic ping on pickup

## 7. Milestones

- [x] **M1: Skeleton** — Project setup, build pipeline, deploy to Vercel
- [x] **M2: Flight** — Ship rendering and movement (desktop + mobile)
- [x] **M3: Mining** — Blaster firing, asteroid collision, debris and metal spawning
- [x] **M4: Economy** — Metal collection, scrap conversion, trade menu at station
- [x] **M5: Upgrades** — Upgrade purchasing at station, tier progression
- [x] **M6: Tutorial** — Guided onboarding with tutorial state machine
- [x] **M7: Asteroid Field** — Multiple asteroid types/sizes spawned after tutorial
- [x] **M8: Persistence** — Auto-save on game events, KV backend storage
- [x] **M9: Polish** — Background music, SFX, particles, screen shake, background effects
- [x] **M10: Lazer & Crystalline** — Crystalline asteroid type, Lazer mining tool, HUD tool switcher, trade station purchase
