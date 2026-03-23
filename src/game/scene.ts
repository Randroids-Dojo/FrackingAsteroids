import * as THREE from 'three'
import { createShipModel } from './ship-model'
import { createLargeAsteroidModel } from './asteroid-model'
import { createProjectileModel } from './projectile-model'
import { createInputState, createInputHandler, createAimState, createAimHandler } from './input'
import { updateShip, aimToRotation } from './ship-controller'
import { createVirtualJoystick } from './virtual-joystick'
import { createFireButton } from './fire-button'
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
  disposeMetalChunk,
  METAL_SPAWN_CHANCE,
} from './metal-chunk'
import type { MetalChunk } from './metal-chunk'
import type { Asteroid, Projectile } from './types'

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

export interface GameScene {
  dispose: () => void
}

/**
 * Initialize the Three.js scene, renderer, camera, ship, starfield,
 * and game loop inside the given container element.
 */
export function createGameScene(container: HTMLElement, getPaused: () => boolean): GameScene {
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

  // --- Asteroid ---
  const asteroidModel = createLargeAsteroidModel()
  asteroidModel.position.set(30, 30, 0)
  scene.add(asteroidModel)

  // --- Asteroid Health Meter ---
  const asteroidHealthMeter = createHealthMeter()
  asteroidModel.add(asteroidHealthMeter)

  // --- Game State ---
  const ship = { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 }
  const blasterState = createBlasterState()
  let projectiles: Projectile[] = []
  const projectileElapsed = new Map<string, number>()
  const projectileModels = new Map<string, THREE.Group>()
  const blasterTier = 1

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

  function onMouseDown(e: MouseEvent): void {
    if (getPaused()) return
    const rect = renderer.domElement.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    fireTarget = screenToWorld(sx, sy)
  }

  renderer.domElement.addEventListener('mousedown', onMouseDown)

  // --- Mobile Fire Button ---
  const fireButton = createFireButton(container, () => {
    if (getPaused()) return
    const angle = ship.rotation + Math.PI / 2
    fireTarget = { x: ship.x + Math.cos(angle) * 100, y: ship.y + Math.sin(angle) * 100 }
  })
  fireButton.attach()

  // Swallow right-half touches that miss the fire button so the browser
  // doesn't synthesize mouse events that rotate the ship or break the joystick.
  function onTouchStartSwallow(e: TouchEvent): void {
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

      // --- Ship-Asteroid Collision ---
      for (const a of asteroids) {
        if (a.hp > 0) {
          resolveShipAsteroidCollision(ship, a)
        }
      }

      // --- Blaster ---
      updateBlasterCooldown(blasterState, dt)
      updateRechargeMeter(rechargeMeter, blasterState, blasterTier)

      // Fire if player clicked/tapped
      if (fireTarget) {
        const newProjectiles = fireBlaster(
          blasterState,
          ship,
          fireTarget.x,
          fireTarget.y,
          blasterTier,
        )
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
            const chunks = breakChunks(
              asteroidModel,
              hit.x,
              hit.y,
              2 + Math.floor(Math.random() * 2),
            )
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
            }
          }
        }

        projectiles = surviving
      }

      // --- Update Asteroid Health Meter ---
      const a0 = asteroids[0]
      updateHealthMeter(asteroidHealthMeter, a0.hp, a0.maxHp)

      // Hide asteroid model if destroyed
      asteroidModel.visible = a0.hp > 0

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
      for (const metal of metalChunks) {
        updateMetalChunk(metal, dt)
        bounceMetalOffShip(metal, ship)
        for (const a of asteroids) {
          bounceMetalOffAsteroid(metal, a)
        }
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
    fireButton.detach()
    renderer.domElement.removeEventListener('mousedown', onMouseDown)
    container.removeEventListener('touchstart', onTouchStartSwallow)
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

    // Dispose all Three.js geometries and materials
    scene.traverse(disposeMesh)

    renderer.dispose()
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }

  return { dispose }
}
