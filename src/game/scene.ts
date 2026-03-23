import * as THREE from 'three'
import { createShipModel } from './ship-model'
import { createLargeAsteroidModel } from './asteroid-model'
import { createProjectileModel } from './projectile-model'
import { createInputState, createInputHandler, createAimState, createAimHandler } from './input'
import { updateShip, aimToRotation } from './ship-controller'
import { createVirtualJoystick } from './virtual-joystick'
import {
  createBlasterState,
  updateBlasterCooldown,
  fireBlaster,
  updateProjectiles,
} from './blaster'
import { createRechargeMeter, updateRechargeMeter } from './recharge-meter'
import type { Projectile } from './types'

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

  // --- Game State ---
  const ship = { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 }
  const blasterState = createBlasterState()
  let projectiles: Projectile[] = []
  const projectileElapsed = new Map<string, number>()
  const projectileModels = new Map<string, THREE.Group>()
  const blasterTier = 1

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

  function onTouchStartFire(e: TouchEvent): void {
    if (getPaused()) return
    const rect = container.getBoundingClientRect()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      // Right half only — left half is joystick
      if (touch.clientX - rect.left >= rect.width / 2) {
        // Fire in the direction the ship is currently facing
        const angle = ship.rotation + Math.PI / 2
        fireTarget = { x: ship.x + Math.cos(angle) * 100, y: ship.y + Math.sin(angle) * 100 }
        e.preventDefault()
        return
      }
    }
  }

  renderer.domElement.addEventListener('mousedown', onMouseDown)
  container.addEventListener('touchstart', onTouchStartFire)

  // --- Resize ---
  function onResize(): void {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

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
            const model = projectileModels.get(id)
            if (model) {
              scene.remove(model)
              model.traverse(disposeMesh)
              projectileModels.delete(id)
            }
          }
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
    renderer.domElement.removeEventListener('mousedown', onMouseDown)
    container.removeEventListener('touchstart', onTouchStartFire)
    window.removeEventListener('resize', onResize)

    // Clean up projectile tracking state
    projectileModels.clear()
    projectileElapsed.clear()
    projectiles = []

    // Dispose all Three.js geometries and materials
    scene.traverse(disposeMesh)

    renderer.dispose()
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }

  return { dispose }
}
