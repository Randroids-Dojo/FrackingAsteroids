import * as THREE from 'three'
import { createShipModel } from './ship-model'
import { createLargeAsteroidModel } from './asteroid-model'
import { createInputState, createInputHandler } from './input'
import { updateShip } from './ship-controller'

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

  // --- Asteroid ---
  const asteroidModel = createLargeAsteroidModel()
  asteroidModel.position.set(30, 30, 0)
  scene.add(asteroidModel)

  // --- Game State ---
  const ship = { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 }

  // --- Input ---
  const inputState = createInputState()
  const inputHandler = createInputHandler(inputState)
  inputHandler.attach()

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
      updateShip(ship, inputState, dt)

      // Sync Three.js model to game state
      shipModel.position.set(ship.x, ship.y, 0)
      shipModel.rotation.z = ship.rotation

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
    window.removeEventListener('resize', onResize)

    // Dispose all Three.js geometries and materials
    scene.traverse((obj) => {
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
    })

    renderer.dispose()
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement)
    }
  }

  return { dispose }
}
