import * as THREE from 'three'
import { createShipModel } from './ship-model'
import { createLargeAsteroidModel, createAsteroidModel } from './asteroid-model'
import { spawnAsteroidField } from './asteroid-spawner'
import {
  createGasStationModel,
  initGasStationNeon,
  updateGasStationNeon,
} from './gas-station-model'
import { createProjectileModel } from './projectile-model'
import { createInputState, createInputHandler, createAimState, createAimHandler } from './input'
import { updateShip, aimToRotation } from './ship-controller'
import { createVirtualJoystick } from './virtual-joystick'
import { createFireButton, createCollectButton } from './fire-button'
import {
  createBlasterState,
  updateBlasterCooldown,
  fireBlaster,
  updateProjectiles,
} from './blaster'
import { createRechargeMeter, updateRechargeMeter } from './recharge-meter'
import { resolveShipAsteroidCollision, checkProjectileAsteroidCollisions } from './collision'
import { createExplosion, updateExplosion, disposeExplosion } from './explosion'
import type { Explosion } from './explosion'
import { createHealthMeter, updateHealthMeter } from './asteroid-health-meter'
import {
  breakChunks,
  updateDebrisChunk,
  disposeDebrisChunk,
  HITS_PER_BREAK,
} from './asteroid-debris'
import type { DebrisChunk } from './asteroid-debris'
import {
  createMetalChunk,
  updateMetalChunk,
  bounceMetalOffShip,
  bounceMetalOffAsteroid,
  attractMetalToShip,
  disposeMetalChunk,
  METAL_SPAWN_CHANCE,
} from './metal-chunk'
import type { MetalChunk } from './metal-chunk'
import type { Asteroid, Projectile } from './types'
import { createCollectorVfx, updateCollectorVfx, disposeCollectorVfx } from './collector-vfx'
import {
  resumeAudio,
  startCollectorHum,
  stopCollectorHum,
  playCollectPling,
  disposeAudio,
} from './audio'
import {
  createEnemyShip,
  updateEnemyShip,
  checkProjectileEnemyCollisions,
  checkEnemyProjectilePlayerCollisions,
  updateEnemyProjectile,
  disposeEnemyProjectile,
  disposeEnemyShip,
  createShipwreckDebris,
  updateShipwreckDebris,
  disposeShipwreckDebris,
  ENEMY_PROJECTILE_DAMAGE,
  ENEMY_SPAWN_DISTANCE,
} from './enemy-ship'
import type { EnemyShip, EnemyProjectile, ShipwreckDebris } from './enemy-ship'
import {
  createScrapBox,
  updateScrapBox,
  attractScrapBoxToShip,
  disposeScrapBox,
  SCRAP_BOX_VALUE,
} from './scrap-box'
import type { ScrapBox } from './scrap-box'
import type { TutorialStep } from '@/hooks/useTutorial'

function disposeMesh(obj: THREE.Object3D): void {
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose()
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => m.dispose())
    } else {
      obj.material.dispose()
    }
  }
  if (obj instanceof THREE.Points) {
    obj.geometry.dispose()
    if (obj.material instanceof THREE.Material) {
      obj.material.dispose()
    }
  }
}

const CAMERA_HEIGHT = 150
const CAMERA_LERP = 0.08
const STAR_COUNT = 400

/** Distance at which enemy triggers the tutorial freeze. */
const ENEMY_NEARBY_DISTANCE = 60

/** Player max health. */
export const PLAYER_MAX_HP = 100

export type MetalVariant = 'silver' | 'gold'

/** Damage per ambush enemy projectile — high but takes ~5 hits to kill. */
const AMBUSH_PROJECTILE_DAMAGE = 20

/** Number of ambush enemies that spawn. */
const AMBUSH_ENEMY_COUNT = 3

/** Distance north of player where ambush enemies spawn. */
const AMBUSH_SPAWN_OFFSET_Y = 70

/** Horizontal spread between ambush enemies. */
const AMBUSH_SPAWN_SPREAD_X = 25

/** Ambush enemies fire every 0.3–0.5 seconds. */
const AMBUSH_SHOOT_MIN = 0.3
const AMBUSH_SHOOT_MAX = 0.5

export interface GameSceneOptions {
  onCollect?: (variant: MetalVariant) => void
  onShipMoved?: () => void
  onAsteroidHit?: () => void
  onMetalSpawned?: () => void
  onMetalCollected?: () => void
  onPlayerDamage?: (hp: number) => void
  onScrapCollect?: (amount: number) => void
  onEnemyNearby?: () => void
  onEnemyDestroyed?: () => void
  onScrapCollected?: () => void
  onNearStation?: () => void
  onStationRange?: (inRange: boolean) => void
  onStationDriveThrough?: () => void
  onPlayerKilled?: () => void
}

export interface GameScene {
  dispose: () => void
  setFireRateBonus: (multiplier: number) => void
  resetShipToStation: () => void
}

/**
 * Initialize the Three.js scene, renderer, camera, ship, starfield,
 * and game loop inside the given container element.
 */
export function createGameScene(
  container: HTMLElement,
  getPaused: () => boolean,
  getTutorialStep: () => TutorialStep,
  options?: GameSceneOptions,
): GameScene {
  const onCollect = options?.onCollect
  const onShipMoved = options?.onShipMoved
  const onAsteroidHit = options?.onAsteroidHit
  const onMetalSpawned = options?.onMetalSpawned
  const onMetalCollected = options?.onMetalCollected
  const onPlayerDamage = options?.onPlayerDamage
  const onScrapCollect = options?.onScrapCollect
  const onEnemyNearby = options?.onEnemyNearby
  const onEnemyDestroyed = options?.onEnemyDestroyed
  const onScrapCollected = options?.onScrapCollected
  const onNearStation = options?.onNearStation
  const onStationRange = options?.onStationRange
  const onStationDriveThrough = options?.onStationDriveThrough
  const onPlayerKilled = options?.onPlayerKilled

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x0a0a1a)
  container.appendChild(renderer.domElement)

  // --- Scene ---
  const scene = new THREE.Scene()

  // --- Camera (top-down with slight perspective) ---
  const aspect = container.clientWidth / container.clientHeight
  const camera = new THREE.PerspectiveCamera(50, aspect, 1, 1000)
  camera.position.set(0, 0, CAMERA_HEIGHT)
  camera.lookAt(0, 0, 0)

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const directional = new THREE.DirectionalLight(0xffffff, 0.8)
  directional.position.set(20, 40, 60)
  scene.add(directional)

  // --- Starfield ---
  const starGeo = new THREE.BufferGeometry()
  const starPositions = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 800
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 800
    starPositions[i * 3 + 2] = -20 + Math.random() * -30
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true })
  const stars = new THREE.Points(starGeo, starMat)
  scene.add(stars)

  // --- Ship ---
  const shipModel = createShipModel()
  scene.add(shipModel)

  // --- Recharge Meter (positioned at ship, but not parented to avoid rotation) ---
  const rechargeMeter = createRechargeMeter()
  scene.add(rechargeMeter)

  // --- Asteroids ---
  // Tutorial asteroid (single, hardcoded)
  const tutorialAsteroidModel = createLargeAsteroidModel()
  tutorialAsteroidModel.position.set(30, 30, 0)
  scene.add(tutorialAsteroidModel)

  const tutorialHealthMeter = createHealthMeter()
  tutorialAsteroidModel.add(tutorialHealthMeter)

  // Map of asteroid id → { model, healthMeter } for all asteroids in the world
  const asteroidModels = new Map<string, { model: THREE.Group; healthMeter: THREE.Group }>()
  asteroidModels.set('asteroid-0', {
    model: tutorialAsteroidModel,
    healthMeter: tutorialHealthMeter,
  })

  // --- Space Gas Station (several screens north of asteroid) ---
  const GAS_STATION_X = 30
  const GAS_STATION_Y = 350
  const STATION_NEAR_DISTANCE = 80
  const STATION_ENTER_DISTANCE = 60
  const STATION_REPAIR_DISTANCE = 15
  const gasStation = createGasStationModel()
  gasStation.group.position.set(GAS_STATION_X, GAS_STATION_Y, 0)
  initGasStationNeon(gasStation.neonMeshes)
  scene.add(gasStation.group)

  // --- Directional Arrow (hidden until go-to-station tutorial step) ---
  const arrowGroup = new THREE.Group()
  arrowGroup.visible = false
  arrowGroup.scale.setScalar(0.35)
  scene.add(arrowGroup)
  // Chevron shape: 2 angled bars forming a ">" pointing right (rotated later)
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0x39ff14,
    emissive: 0x39ff14,
    emissiveIntensity: 1.2,
    flatShading: true,
  })
  // Top bar of chevron
  const barGeo = new THREE.BoxGeometry(12, 2.5, 2)
  const topBar = new THREE.Mesh(barGeo, arrowMat)
  topBar.position.set(3, 2.5, 0)
  topBar.rotation.z = -0.5 // angle downward
  arrowGroup.add(topBar)
  // Bottom bar of chevron
  const botBar = new THREE.Mesh(barGeo.clone(), arrowMat)
  botBar.position.set(3, -2.5, 0)
  botBar.rotation.z = 0.5 // angle upward
  arrowGroup.add(botBar)
  // Second chevron (trailing, slightly transparent)
  const arrowMat2 = new THREE.MeshStandardMaterial({
    color: 0x39ff14,
    emissive: 0x39ff14,
    emissiveIntensity: 0.7,
    flatShading: true,
    transparent: true,
    opacity: 0.6,
  })
  const topBar2 = new THREE.Mesh(barGeo.clone(), arrowMat2)
  topBar2.position.set(-5, 2.5, 0)
  topBar2.rotation.z = -0.5
  arrowGroup.add(topBar2)
  const botBar2 = new THREE.Mesh(barGeo.clone(), arrowMat2)
  botBar2.position.set(-5, -2.5, 0)
  botBar2.rotation.z = 0.5
  arrowGroup.add(botBar2)
  let nearStationFired = false
  let wasInStationRange = false
  let repairedThisVisit = false

  // --- Game State ---
  const ship = { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 }
  const blasterState = createBlasterState()
  let projectiles: Projectile[] = []
  const projectileElapsed = new Map<string, number>()
  const projectileModels = new Map<string, THREE.Group>()
  const blasterTier = 1
  let fireRateBonus = 1.0

  // Asteroid game state
  const asteroids: Asteroid[] = [
    {
      id: 'asteroid-0',
      x: 30,
      y: 30,
      velocityX: 0,
      velocityY: 0,
      type: 'common',
      hp: 15,
      maxHp: 15,
      size: 1,
    },
  ]

  // Active explosions
  const explosions: Explosion[] = []

  // Active debris chunks flying off asteroids
  const debrisChunks: DebrisChunk[] = []

  // Persistent metal chunks floating in space
  const metalChunks: MetalChunk[] = []

  // --- Enemy Ship State ---
  let enemy: EnemyShip | null = null
  const enemyProjectiles: EnemyProjectile[] = []
  const shipwreckDebrisList: ShipwreckDebris[] = []
  const scrapBoxes: ScrapBox[] = []
  let playerHp = PLAYER_MAX_HP
  let firstMetalCollectedTime: number | null = null
  let enemySpawned = false
  let enemyNearbyFired = false

  // --- Ambush State ---
  const ambushEnemies: EnemyShip[] = []
  let ambushSpawned = false
  let playerKilledFired = false

  function fireEnemyNearby() {
    if (enemyNearbyFired) return
    enemyNearbyFired = true
    onEnemyNearby?.()
  }

  // --- Collector VFX ---
  const collectorVfx = createCollectorVfx()
  scene.add(collectorVfx.group)

  // Track cumulative hits on each asteroid for chunk break-off timing
  const asteroidHitCounts = new Map<string, number>()
  asteroidHitCounts.set('asteroid-0', 0)

  // --- Input ---
  const inputState = createInputState()
  const inputHandler = createInputHandler(inputState)
  inputHandler.attach()

  // --- Aim (mouse/touch tracking) ---
  const aimState = createAimState()
  const aimHandler = createAimHandler(aimState, container)
  aimHandler.attach()

  // --- Virtual Joystick (mobile touch movement) ---
  const joystick = createVirtualJoystick(inputState, container)
  joystick.attach()

  // --- Screen-to-world coordinate conversion ---
  const raycaster = new THREE.Raycaster()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const ndcVec = new THREE.Vector2()
  const worldIntersect = new THREE.Vector3()

  function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const w = renderer.domElement.clientWidth
    const h = renderer.domElement.clientHeight
    // Convert screen pixels to NDC (-1 to 1)
    ndcVec.x = (screenX / w) * 2 - 1
    ndcVec.y = -(screenY / h) * 2 + 1
    raycaster.setFromCamera(ndcVec, camera)
    const hit = raycaster.ray.intersectPlane(groundPlane, worldIntersect)
    if (!hit) return { x: camera.position.x, y: camera.position.y }
    return { x: worldIntersect.x, y: worldIntersect.y }
  }

  // --- Fire handlers ---
  let fireTarget: { x: number; y: number } | null = null
  let mouseHoldingFire = false

  // Detect touch support to decide between mobile buttons and mouse controls
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  function onMouseDown(e: MouseEvent): void {
    resumeAudio()
    if (getPaused()) return
    if (e.button === 0) {
      // Left-click: fire weapon (and track hold for auto-fire)
      mouseHoldingFire = true
      const rect = renderer.domElement.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      fireTarget = screenToWorld(sx, sy)
    } else if (e.button === 2) {
      // Right-click: activate collector/magnet
      mouseCollecting = true
      collecting = true
    }
  }

  function onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      mouseHoldingFire = false
    } else if (e.button === 2) {
      mouseCollecting = false
      if (!collectKeyDown && (fireButton === null || !fireButton.isPressed())) collecting = false
    }
  }

  function onContextMenu(e: Event): void {
    e.preventDefault()
  }

  renderer.domElement.addEventListener('mousedown', onMouseDown)
  renderer.domElement.addEventListener('mouseup', onMouseUp)
  renderer.domElement.addEventListener('contextmenu', onContextMenu)

  // --- Mobile Fire & Collect Buttons (touch devices only) ---
  let fireButton: ReturnType<typeof createFireButton> | null = null
  let collectButton: ReturnType<typeof createCollectButton> | null = null

  if (hasTouch) {
    fireButton = createFireButton(container, () => {
      if (getPaused()) return
      const angle = ship.rotation + Math.PI / 2
      fireTarget = { x: ship.x + Math.cos(angle) * 100, y: ship.y + Math.sin(angle) * 100 }
    })
    fireButton.attach()

    collectButton = createCollectButton(
      container,
      () => {
        collecting = true
      },
      () => {
        if (!collectKeyDown && !mouseCollecting) collecting = false
      },
    )
    collectButton.attach()
  }

  // --- Collect (mouse right-click + keyboard + mobile button) ---
  let collecting = false
  let collectKeyDown = false
  let mouseCollecting = false

  function onCollectKeyDown(e: KeyboardEvent): void {
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (!collectKeyDown) {
        collectKeyDown = true
        collecting = true
        resumeAudio()
      }
    }
  }
  function onCollectKeyUp(e: KeyboardEvent): void {
    if (e.code === 'KeyE' || e.code === 'Space') {
      collectKeyDown = false
      if (!mouseCollecting && (collectButton === null || !collectButton.isPressed()))
        collecting = false
    }
  }
  window.addEventListener('keydown', onCollectKeyDown)
  window.addEventListener('keyup', onCollectKeyUp)

  // Swallow right-half touches that miss the fire button so the browser
  // doesn't synthesize mouse events that rotate the ship or break the joystick.
  function onTouchStartSwallow(e: TouchEvent): void {
    resumeAudio()
    const rect = container.getBoundingClientRect()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.clientX - rect.left >= rect.width / 2) {
        e.preventDefault()
        return
      }
    }
  }
  container.addEventListener('touchstart', onTouchStartSwallow, { passive: false })

  // --- Resize ---
  function onResize(): void {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  // Helper to remove a projectile model from the scene
  function removeProjectileModel(id: string): void {
    const model = projectileModels.get(id)
    if (model) {
      scene.remove(model)
      model.traverse(disposeMesh)
      projectileModels.delete(id)
    }
  }

  // --- Game Loop ---
  let prevTime = performance.now()
  let animId = 0

  function loop(): void {
    animId = requestAnimationFrame(loop)
    const now = performance.now()
    const dt = Math.min((now - prevTime) / 1000, 0.05) // cap at 50ms
    prevTime = now

    if (!getPaused()) {
      // Compute aim rotation (mouse/touch → world → angle)
      const rotation = aimToRotation(ship, aimState, screenToWorld)

      updateShip(ship, inputState, dt, rotation)

      // Tutorial: detect ship movement
      if (Math.sqrt(ship.x * ship.x + ship.y * ship.y) > 2) {
        onShipMoved?.()
      }

      // --- Update Asteroid Drift ---
      for (const a of asteroids) {
        if (a.velocityX !== 0 || a.velocityY !== 0) {
          a.x += a.velocityX * dt
          a.y += a.velocityY * dt
          const entry = asteroidModels.get(a.id)
          if (entry) {
            entry.model.position.set(a.x, a.y, 0)
          }
        }
      }

      // --- Ship-Asteroid Collision ---
      for (const a of asteroids) {
        if (a.hp > 0) {
          resolveShipAsteroidCollision(ship, a)
        }
      }

      // --- Blaster ---
      updateBlasterCooldown(blasterState, dt)
      updateRechargeMeter(rechargeMeter, blasterState, blasterTier)

      // Hold-to-fire: re-set fireTarget each frame while button is held
      if (mouseHoldingFire && aimState.active) {
        fireTarget = screenToWorld(aimState.screenX, aimState.screenY)
      }
      if (fireButton && fireButton.isPressed()) {
        const angle = ship.rotation + Math.PI / 2
        fireTarget = { x: ship.x + Math.cos(angle) * 100, y: ship.y + Math.sin(angle) * 100 }
      }

      // Fire if player clicked/tapped
      if (fireTarget) {
        const newProjectiles = fireBlaster(
          blasterState,
          ship,
          fireTarget.x,
          fireTarget.y,
          blasterTier,
        )
        // Apply fire rate bonus (reduces cooldown)
        if (newProjectiles.length > 0 && fireRateBonus > 1) {
          blasterState.cooldownRemaining /= fireRateBonus
        }
        for (const p of newProjectiles) {
          projectiles.push(p)
          const model = createProjectileModel()
          model.position.set(p.x, p.y, 0)
          const angle = Math.atan2(p.velocityY, p.velocityX)
          model.rotation.z = angle - Math.PI / 2
          scene.add(model)
          projectileModels.set(p.id, model)
        }
        fireTarget = null
      }

      // Update projectile positions and collect IDs before update
      const prevCount = projectiles.length
      const prevIds = prevCount > 0 ? projectiles.map((p) => p.id) : []
      projectiles = updateProjectiles(projectiles, dt, projectileElapsed)

      // Remove expired projectile models (only if something was removed)
      if (projectiles.length < prevCount) {
        const currentIds = new Set(projectiles.map((p) => p.id))
        for (const id of prevIds) {
          if (!currentIds.has(id)) {
            removeProjectileModel(id)
          }
        }
      }

      // --- Projectile-Asteroid Collision ---
      const liveAsteroids = asteroids.filter((a) => a.hp > 0)
      if (projectiles.length > 0 && liveAsteroids.length > 0) {
        const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, liveAsteroids)

        // Tutorial: detect asteroid hit
        if (hits.length > 0) {
          onAsteroidHit?.()
        }

        // Remove hit projectile models, spawn explosions and debris
        for (const hit of hits) {
          removeProjectileModel(hit.projectileId)
          projectileElapsed.delete(hit.projectileId)

          // Spawn explosion at hit position
          const explosion = createExplosion(hit.x, hit.y)
          scene.add(explosion.group)
          explosions.push(explosion)

          // Break off asteroid chunks every few hits
          const prevHits = asteroidHitCounts.get(hit.asteroidId) ?? 0
          const newHits = prevHits + 1
          asteroidHitCounts.set(hit.asteroidId, newHits)

          if (newHits % HITS_PER_BREAK === 0) {
            const hitModel = asteroidModels.get(hit.asteroidId)?.model
            if (!hitModel) continue
            const chunks = breakChunks(hitModel, hit.x, hit.y, 2 + Math.floor(Math.random() * 2))
            for (const chunk of chunks) {
              scene.add(chunk.mesh)
              debrisChunks.push(chunk)
            }

            // Occasionally spawn a metal nugget alongside the debris
            if (Math.random() < METAL_SPAWN_CHANCE) {
              const hitAsteroid = asteroids.find((a) => a.id === hit.asteroidId)
              const ax = hitAsteroid ? hitAsteroid.x : hit.x
              const ay = hitAsteroid ? hitAsteroid.y : hit.y
              const dx = hit.x - ax
              const dy = hit.y - ay
              const d = Math.sqrt(dx * dx + dy * dy)
              const nx = d > 0.01 ? dx / d : Math.random() - 0.5
              const ny = d > 0.01 ? dy / d : Math.random() - 0.5
              const metal = createMetalChunk(hit.x, hit.y, nx, ny)
              scene.add(metal.mesh)
              metalChunks.push(metal)

              // Tutorial: detect metal spawn
              onMetalSpawned?.()
            }
          }
        }

        projectiles = surviving
      }

      // --- Update Asteroid Health Meters & Visibility ---
      for (const a of asteroids) {
        const entry = asteroidModels.get(a.id)
        if (entry) {
          updateHealthMeter(entry.healthMeter, a.hp, a.maxHp)
          entry.model.visible = a.hp > 0
        }
      }

      // --- Enemy Spawn ---
      if (!enemySpawned && firstMetalCollectedTime !== null) {
        enemySpawned = true
        const spawnAngle = Math.random() * Math.PI * 2
        const ex = ship.x + Math.cos(spawnAngle) * ENEMY_SPAWN_DISTANCE
        const ey = ship.y + Math.sin(spawnAngle) * ENEMY_SPAWN_DISTANCE
        enemy = createEnemyShip(ex, ey)
        scene.add(enemy.mesh)

        // Add a health meter to the enemy
        const enemyHealthMeter = createHealthMeter()
        enemy.mesh.add(enemyHealthMeter)
        enemy.mesh.userData.healthMeter = enemyHealthMeter
      }

      // --- Update Enemy Ship ---
      if (enemy && enemy.alive) {
        // Notify tutorial when enemy gets close enough to be visible
        if (!enemyNearbyFired) {
          const edx = enemy.x - ship.x
          const edy = enemy.y - ship.y
          const eDist = Math.sqrt(edx * edx + edy * edy)
          if (eDist <= ENEMY_NEARBY_DISTANCE) {
            fireEnemyNearby()
          }
        }

        const newEnemyProjs = updateEnemyShip(enemy, ship, dt)
        for (const proj of newEnemyProjs) {
          scene.add(proj.mesh)
          enemyProjectiles.push(proj)
        }

        // Update enemy health meter
        const ehm = enemy.mesh.userData.healthMeter as THREE.Group | undefined
        if (ehm) {
          updateHealthMeter(ehm, enemy.hp, enemy.maxHp)
        }

        // Check player projectiles hitting enemy
        if (projectiles.length > 0) {
          const { surviving: afterEnemy, hitProjectileIds } = checkProjectileEnemyCollisions(
            projectiles,
            enemy,
          )
          for (const hitId of hitProjectileIds) {
            removeProjectileModel(hitId)
            projectileElapsed.delete(hitId)

            // Spawn explosion at enemy position
            const explosion = createExplosion(enemy.x, enemy.y)
            scene.add(explosion.group)
            explosions.push(explosion)
          }
          projectiles = afterEnemy

          // Enemy destroyed
          if (!enemy.alive) {
            // Spawn shipwreck debris explosion
            const wreck = createShipwreckDebris(enemy.x, enemy.y)
            scene.add(wreck.group)
            shipwreckDebrisList.push(wreck)

            // Also spawn a regular big explosion
            const bigExplosion = createExplosion(enemy.x, enemy.y)
            scene.add(bigExplosion.group)
            explosions.push(bigExplosion)

            // Drop a scrap box
            const box = createScrapBox(enemy.x, enemy.y)
            scene.add(box.mesh)
            scrapBoxes.push(box)

            // Remove enemy mesh
            scene.remove(enemy.mesh)
            disposeEnemyShip(enemy)
            enemy = null
            onEnemyDestroyed?.()
          }
        }
      }

      // --- Update Enemy Projectiles ---
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const alive = updateEnemyProjectile(enemyProjectiles[i], dt)
        if (!alive) {
          scene.remove(enemyProjectiles[i].mesh)
          disposeEnemyProjectile(enemyProjectiles[i])
          enemyProjectiles.splice(i, 1)
        }
      }

      // --- Enemy Projectile → Player Collision ---
      if (enemyProjectiles.length > 0) {
        const hitIdSet = new Set(checkEnemyProjectilePlayerCollisions(enemyProjectiles, ship))
        if (hitIdSet.size > 0) {
          for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            const proj = enemyProjectiles[i]
            if (!hitIdSet.has(proj.id)) continue

            // Spawn small explosion at hit position
            const hitExplosion = createExplosion(proj.x, proj.y)
            scene.add(hitExplosion.group)
            explosions.push(hitExplosion)

            scene.remove(proj.mesh)
            disposeEnemyProjectile(proj)
            enemyProjectiles.splice(i, 1)

            // Apply damage to player (ambush projectiles deal much more)
            const damage = proj.mesh.userData.ambush
              ? AMBUSH_PROJECTILE_DAMAGE
              : ENEMY_PROJECTILE_DAMAGE
            playerHp = Math.max(0, playerHp - damage)

            fireEnemyNearby()
          }
          onPlayerDamage?.(playerHp)
        }
      }

      // --- Update Shipwreck Debris ---
      for (let i = shipwreckDebrisList.length - 1; i >= 0; i--) {
        const alive = updateShipwreckDebris(shipwreckDebrisList[i], dt)
        if (!alive) {
          scene.remove(shipwreckDebrisList[i].group)
          disposeShipwreckDebris(shipwreckDebrisList[i])
          shipwreckDebrisList.splice(i, 1)
        }
      }

      // --- Update Scrap Boxes ---
      for (let i = scrapBoxes.length - 1; i >= 0; i--) {
        const box = scrapBoxes[i]
        updateScrapBox(box, dt)

        if (collecting) {
          const collected = attractScrapBoxToShip(box, ship, dt)
          if (collected) {
            scene.remove(box.mesh)
            disposeScrapBox(box)
            scrapBoxes.splice(i, 1)
            playCollectPling()
            onScrapCollect?.(SCRAP_BOX_VALUE)
            onScrapCollected?.()
            continue
          }
        }
      }

      // --- Update Explosions ---
      for (let i = explosions.length - 1; i >= 0; i--) {
        const alive = updateExplosion(explosions[i], dt)
        if (!alive) {
          scene.remove(explosions[i].group)
          disposeExplosion(explosions[i])
          explosions.splice(i, 1)
        }
      }

      // --- Update Debris Chunks ---
      for (let i = debrisChunks.length - 1; i >= 0; i--) {
        const alive = updateDebrisChunk(debrisChunks[i], dt)
        if (!alive) {
          scene.remove(debrisChunks[i].mesh)
          disposeDebrisChunk(debrisChunks[i])
          debrisChunks.splice(i, 1)
        }
      }

      // --- Update Metal Chunks ---
      for (let i = metalChunks.length - 1; i >= 0; i--) {
        const metal = metalChunks[i]
        updateMetalChunk(metal, dt)

        // Attract toward ship when collector is active
        if (collecting) {
          const collected = attractMetalToShip(metal, ship, dt)
          if (collected) {
            const variant = metal.variant
            scene.remove(metal.mesh)
            disposeMetalChunk(metal)
            metalChunks.splice(i, 1)
            playCollectPling()
            if (firstMetalCollectedTime === null) {
              firstMetalCollectedTime = now
            }
            onCollect?.(variant)

            // Tutorial: detect metal collection
            onMetalCollected?.()
            continue
          }
        }

        bounceMetalOffShip(metal, ship)
        for (const a of asteroids) {
          bounceMetalOffAsteroid(metal, a)
        }
      }

      // --- Collector VFX & Audio ---
      updateCollectorVfx(collectorVfx, dt, collecting, ship.x, ship.y)
      if (collecting) {
        startCollectorHum()
      } else {
        stopCollectorHum()
      }

      // --- Update Gas Station Neon ---
      updateGasStationNeon(gasStation.neonMeshes, now / 1000)

      // --- Station Proximity ---
      const dx = GAS_STATION_X - ship.x
      const dy = GAS_STATION_Y - ship.y
      const sDist = Math.sqrt(dx * dx + dy * dy)

      // Fire near-station when within range (one-shot for tutorial arrow)
      if (!nearStationFired && sDist <= STATION_NEAR_DISTANCE) {
        nearStationFired = true
        onNearStation?.()
      }

      // Continuous enter/leave detection for shop FAB
      const inStationRange = sDist <= STATION_ENTER_DISTANCE
      if (inStationRange !== wasInStationRange) {
        wasInStationRange = inStationRange
        onStationRange?.(inStationRange)
        if (!inStationRange) repairedThisVisit = false
      }

      // Drive-through repair: heal to full HP when passing close to the station center
      if (inStationRange && !repairedThisVisit && sDist <= STATION_REPAIR_DISTANCE) {
        repairedThisVisit = true
        playerHp = PLAYER_MAX_HP
        onPlayerDamage?.(playerHp)
        onStationDriveThrough?.()
      }

      // --- Tutorial: Station Arrow ---
      const tutStep = getTutorialStep()
      const showArrow = tutStep === 'go-to-station' || tutStep === 'approach-station'
      arrowGroup.visible = showArrow && !inStationRange
      if (showArrow) {
        // Position arrow ahead of ship, pointing toward station
        const angle = Math.atan2(dy, dx)
        const arrowDist = 8 // distance from ship to arrow
        arrowGroup.position.set(
          ship.x + Math.cos(angle) * arrowDist,
          ship.y + Math.sin(angle) * arrowDist,
          5,
        )
        arrowGroup.rotation.z = angle
        // Flash the arrow
        const flash = 0.6 + 0.4 * Math.sin((now / 1000) * 4.0)
        arrowMat.emissiveIntensity = flash * 1.5
        arrowMat2.emissiveIntensity = flash * 0.7
        // Bob the arrow up and down
        arrowGroup.position.z = 5 + Math.sin((now / 1000) * 2.5) * 2
      }

      // --- Tutorial: Ambush ---
      // Wait until the player has left station range before spawning enemies
      if (tutStep === 'ambush' && !ambushSpawned && !inStationRange) {
        ambushSpawned = true
        // Spawn 3 enemy ships in a line north of the player
        for (let i = 0; i < AMBUSH_ENEMY_COUNT; i++) {
          const offsetX = (i - 1) * AMBUSH_SPAWN_SPREAD_X // -25, 0, +25
          const ax = ship.x + offsetX
          const ay = ship.y + AMBUSH_SPAWN_OFFSET_Y
          const ae = createEnemyShip(ax, ay)
          // Override shoot timer for rapid fire
          ae.shootTimer = AMBUSH_SHOOT_MIN
          ae.hp = 100 // near invincible
          ae.maxHp = 100
          scene.add(ae.mesh)
          ambushEnemies.push(ae)
        }
      }

      // Update ambush enemies
      if (ambushEnemies.length > 0) {
        for (const ae of ambushEnemies) {
          if (!ae.alive) continue
          const newProjs = updateEnemyShip(ae, ship, dt)
          // Override shoot timer for rapid fire after each shot
          if (ae.shootTimer > AMBUSH_SHOOT_MAX) {
            ae.shootTimer = AMBUSH_SHOOT_MIN + Math.random() * (AMBUSH_SHOOT_MAX - AMBUSH_SHOOT_MIN)
          }
          for (const proj of newProjs) {
            scene.add(proj.mesh)
            enemyProjectiles.push(proj)
            // Tag ambush projectiles for higher damage
            proj.mesh.userData.ambush = true
          }
          ae.mesh.position.set(ae.x, ae.y, 0)
          ae.mesh.rotation.z = ae.rotation
        }
      }

      // Detect player death during ambush
      if (tutStep === 'ambush' && playerHp <= 0 && !playerKilledFired) {
        playerKilledFired = true
        onPlayerKilled?.()
      }

      // Sync surviving projectile positions
      for (const p of projectiles) {
        const model = projectileModels.get(p.id)
        if (model) {
          model.position.set(p.x, p.y, 0)
        }
      }

      // Sync Three.js model to game state
      shipModel.position.set(ship.x, ship.y, 0)
      shipModel.rotation.z = ship.rotation
      rechargeMeter.position.set(ship.x, ship.y, 0)

      // Camera follows ship (frame-rate independent lerp)
      const lerpFactor = 1 - Math.pow(1 - CAMERA_LERP, dt * 60)
      camera.position.x += (ship.x - camera.position.x) * lerpFactor
      camera.position.y += (ship.y - camera.position.y) * lerpFactor

      // Stars follow camera (parallax)
      stars.position.x = camera.position.x * 0.5
      stars.position.y = camera.position.y * 0.5
    }

    renderer.render(scene, camera)
  }
  loop()

  // --- Cleanup ---
  function dispose(): void {
    cancelAnimationFrame(animId)
    inputHandler.detach()
    aimHandler.detach()
    joystick.detach()
    if (fireButton) fireButton.detach()
    if (collectButton) collectButton.detach()
    renderer.domElement.removeEventListener('mousedown', onMouseDown)
    renderer.domElement.removeEventListener('mouseup', onMouseUp)
    renderer.domElement.removeEventListener('contextmenu', onContextMenu)
    container.removeEventListener('touchstart', onTouchStartSwallow)
    window.removeEventListener('keydown', onCollectKeyDown)
    window.removeEventListener('keyup', onCollectKeyUp)
    window.removeEventListener('resize', onResize)

    // Clean up projectile tracking state
    projectileModels.clear()
    projectileElapsed.clear()
    projectiles = []

    // Clean up explosions
    for (const e of explosions) {
      disposeExplosion(e)
    }
    explosions.length = 0

    // Clean up debris
    for (const d of debrisChunks) {
      disposeDebrisChunk(d)
    }
    debrisChunks.length = 0

    // Clean up metal chunks
    for (const m of metalChunks) {
      disposeMetalChunk(m)
    }
    metalChunks.length = 0

    // Clean up enemy
    if (enemy) {
      disposeEnemyShip(enemy)
    }
    for (const ae of ambushEnemies) {
      disposeEnemyShip(ae)
    }
    ambushEnemies.length = 0
    for (const ep of enemyProjectiles) {
      disposeEnemyProjectile(ep)
    }
    enemyProjectiles.length = 0
    for (const wd of shipwreckDebrisList) {
      disposeShipwreckDebris(wd)
    }
    shipwreckDebrisList.length = 0
    for (const sb of scrapBoxes) {
      disposeScrapBox(sb)
    }
    scrapBoxes.length = 0

    // Clean up asteroid models
    asteroidModels.clear()

    // Clean up collector VFX & audio
    disposeCollectorVfx(collectorVfx)
    disposeAudio()

    // Dispose all Three.js geometries and materials
    scene.traverse(disposeMesh)

    renderer.dispose()
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }

  function setFireRateBonus(multiplier: number) {
    fireRateBonus = multiplier
  }

  /** Reset ship to just north of station with full HP and clear ambush entities. */
  function resetShipToStation() {
    // Move ship to just north of the station (outside station range)
    ship.x = GAS_STATION_X
    ship.y = GAS_STATION_Y + STATION_ENTER_DISTANCE - 10
    ship.velocityX = 0
    ship.velocityY = 0

    // Restore full HP
    playerHp = PLAYER_MAX_HP
    onPlayerDamage?.(playerHp)

    // Remove ambush enemies
    for (const ae of ambushEnemies) {
      scene.remove(ae.mesh)
      disposeEnemyShip(ae)
    }
    ambushEnemies.length = 0

    // Remove all enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      scene.remove(enemyProjectiles[i].mesh)
      disposeEnemyProjectile(enemyProjectiles[i])
    }
    enemyProjectiles.length = 0

    // Clear all explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      scene.remove(explosions[i].group)
      disposeExplosion(explosions[i])
    }
    explosions.length = 0

    // Clear shipwreck debris
    for (let i = shipwreckDebrisList.length - 1; i >= 0; i--) {
      scene.remove(shipwreckDebrisList[i].group)
      disposeShipwreckDebris(shipwreckDebrisList[i])
    }
    shipwreckDebrisList.length = 0

    // --- Spawn asteroid field around the station ---
    // Remove old asteroid models from scene
    for (const [, entry] of asteroidModels) {
      scene.remove(entry.model)
      entry.model.traverse(disposeMesh)
    }
    asteroidModels.clear()
    asteroidHitCounts.clear()

    // Clear old asteroid data and generate new field
    asteroids.length = 0
    const newAsteroids = spawnAsteroidField(GAS_STATION_X, GAS_STATION_Y)
    for (const a of newAsteroids) {
      asteroids.push(a)

      // Create a visually unique model for each asteroid
      const model = createAsteroidModel(a.type, a.size, hashString(a.id))
      model.position.set(a.x, a.y, 0)
      scene.add(model)

      const hm = createHealthMeter()
      model.add(hm)
      asteroidModels.set(a.id, { model, healthMeter: hm })
      asteroidHitCounts.set(a.id, 0)
    }

    // Sync ship model to new position immediately so it's not visible at the old spot
    shipModel.position.set(ship.x, ship.y, 0)
    rechargeMeter.position.set(ship.x, ship.y, 0)

    // Snap camera to station immediately
    camera.position.x = ship.x
    camera.position.y = ship.y
  }

  /** Simple string hash for deterministic asteroid shape seeds. */
  function hashString(str: string): number {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33 + str.charCodeAt(i)) % 2147483647
    }
    return hash
  }

  return { dispose, setFireRateBonus, resetShipToStation }
}
