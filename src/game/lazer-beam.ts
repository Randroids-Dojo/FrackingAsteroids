import * as THREE from 'three'

const BEAM_COLOR = 0x00ccff
const BEAM_CORE_COLOR = 0x88eeff
const BEAM_WIDTH = 0.6
const BEAM_CORE_WIDTH = 0.2

/**
 * Creates a persistent lazer beam mesh (two overlaid planes: glow + core).
 * The beam is oriented along +Y and scaled to match the beam length each frame.
 */
export function createLazerBeam(): THREE.Group {
  const group = new THREE.Group()

  // Outer glow
  const glowGeo = new THREE.PlaneGeometry(BEAM_WIDTH, 1)
  const glowMat = new THREE.MeshBasicMaterial({
    color: BEAM_COLOR,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  group.add(glow)

  // Inner core (brighter, narrower)
  const coreGeo = new THREE.PlaneGeometry(BEAM_CORE_WIDTH, 1)
  const coreMat = new THREE.MeshBasicMaterial({
    color: BEAM_CORE_COLOR,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  })
  const core = new THREE.Mesh(coreGeo, coreMat)
  core.position.z = 0.01
  group.add(core)

  group.visible = false
  return group
}

/**
 * Update beam position, rotation, and length.
 * The beam stretches from (startX, startY) toward (endX, endY).
 */
export function updateLazerBeam(
  beam: THREE.Group,
  visible: boolean,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void {
  beam.visible = visible
  if (!visible) return

  const dx = endX - startX
  const dy = endY - startY
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length < 0.1) {
    beam.visible = false
    return
  }

  // Position at midpoint of beam
  beam.position.set((startX + endX) / 2, (startY + endY) / 2, 0.5)

  // Rotate to point from start to end
  beam.rotation.z = Math.atan2(dy, dx) - Math.PI / 2

  // Scale Y to beam length
  beam.scale.set(1, length, 1)
}

export function disposeLazerBeam(beam: THREE.Group): void {
  beam.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose()
      }
    }
  })
}
