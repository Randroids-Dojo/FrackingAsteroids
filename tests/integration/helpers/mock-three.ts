/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Lightweight Three.js mock for integration tests.
 *
 * Satisfies the constructor and property-access patterns used by game modules
 * (enemy-ship, metal-chunk, scrap-box, asteroid-debris, explosion) without
 * requiring a real WebGL context or browser environment.
 *
 * Install before importing any game module:
 *   import { installMockThree, uninstallMockThree } from './mock-three'
 */

class MockVector3 {
  x = 0
  y = 0
  z = 0
  set(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z
    return this
  }
  setScalar(s: number) {
    this.x = s
    this.y = s
    this.z = s
    return this
  }
  copy(v: MockVector3) {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    return this
  }
}

class MockObject3D {
  position = new MockVector3()
  rotation = new MockVector3()
  scale = new MockVector3().setScalar(1)
  visible = true
  children: MockObject3D[] = []
  userData: Record<string, unknown> = {}
  parent: MockObject3D | null = null

  add(child: MockObject3D) {
    child.parent = this
    this.children.push(child)
  }
  remove(child: MockObject3D) {
    const idx = this.children.indexOf(child)
    if (idx >= 0) {
      this.children.splice(idx, 1)
      child.parent = null
    }
  }
  traverse(fn: (obj: MockObject3D) => void) {
    fn(this)
    for (const child of this.children) {
      child.traverse(fn)
    }
  }
  getWorldPosition(target: MockVector3) {
    target.copy(this.position)
    return target
  }
}

class MockGeometry {
  dispose() {}
}

class MockMaterial {
  color = 0
  flatShading = true
  emissive = 0
  emissiveIntensity = 0
  metalness = 0
  roughness = 1
  transparent = false
  opacity = 1
  dispose() {}
}

class MockMesh extends MockObject3D {
  geometry: MockGeometry
  material: MockMaterial | MockMaterial[]
  constructor(geometry?: MockGeometry, material?: MockMaterial) {
    super()
    this.geometry = geometry ?? new MockGeometry()
    this.material = material ?? new MockMaterial()
  }
}

class MockGroup extends MockObject3D {}

class MockPoints extends MockObject3D {
  geometry = new MockGeometry()
  material = new MockMaterial()
}

class MockBufferAttribute {
  constructor(
    public array: Float32Array,
    public itemSize: number,
  ) {}
}

class MockBufferGeometry extends MockGeometry {
  setAttribute(_name: string, _attr: MockBufferAttribute) {
    return this
  }
}

class MockPointsMaterial extends MockMaterial {
  size = 1
  sizeAttenuation = true
}

class MockVector2 {
  x = 0
  y = 0
  set(x: number, y: number) {
    this.x = x
    this.y = y
    return this
  }
}

class MockRay {
  intersectPlane(_plane: unknown, target: MockVector3) {
    target.set(0, 0, 0)
    return target
  }
}

class MockRaycaster {
  ray = new MockRay()
  setFromCamera(_coords: MockVector2, _camera: unknown) {}
}

class MockPlane {
  constructor(
    public normal?: MockVector3,
    public constant?: number,
  ) {}
}

class MockPerspectiveCamera extends MockObject3D {
  aspect = 1
  fov = 50
  near = 1
  far = 1000
  constructor(fov?: number, aspect?: number, near?: number, far?: number) {
    super()
    if (fov !== undefined) this.fov = fov
    if (aspect !== undefined) this.aspect = aspect
    if (near !== undefined) this.near = near
    if (far !== undefined) this.far = far
  }
  lookAt(_x: number, _y: number, _z: number) {}
  updateProjectionMatrix() {}
}

class MockAmbientLight extends MockObject3D {
  constructor(
    public lightColor?: number,
    public intensity?: number,
  ) {
    super()
  }
}

class MockDirectionalLight extends MockObject3D {
  constructor(
    public lightColor?: number,
    public intensity?: number,
  ) {
    super()
  }
}

const MockTHREE = {
  Group: MockGroup,
  Mesh: MockMesh,
  BoxGeometry: MockGeometry,
  MeshStandardMaterial: MockMaterial,
  PointsMaterial: MockPointsMaterial,
  BufferGeometry: MockBufferGeometry,
  BufferAttribute: MockBufferAttribute,
  Points: MockPoints,
  Vector3: MockVector3,
  Vector2: MockVector2,
  Raycaster: MockRaycaster,
  Plane: MockPlane,
  PerspectiveCamera: MockPerspectiveCamera,
  AmbientLight: MockAmbientLight,
  DirectionalLight: MockDirectionalLight,
  Material: MockMaterial,
  WebGLRenderer: class {
    domElement = { clientWidth: 800, clientHeight: 600 }
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
    render() {}
    dispose() {}
  },
  Scene: MockGroup,
}

// Module cache key for 'three'
let originalModule: unknown = undefined

export function installMockThree(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('module')
  const origResolve = mod._resolveFilename
  originalModule = origResolve

  mod._resolveFilename = function (
    request: string,
    parent: unknown,
    isMain: boolean,
    options: unknown,
  ) {
    if (request === 'three') {
      return 'three'
    }
    return origResolve.call(this, request, parent, isMain, options)
  }

   
  require.cache[require.resolve('three')] = {
    id: 'three',
    filename: 'three',
    loaded: true,
    exports: MockTHREE,
    parent: null,
    children: [],
    paths: [],
    path: '',
    isPreloading: false,
  } as unknown as NodeModule
}

export function uninstallMockThree(): void {
  if (originalModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('module')
    mod._resolveFilename = originalModule
    originalModule = undefined
  }
  delete require.cache[require.resolve('three')]
}

export { MockVector3, MockObject3D, MockMesh, MockGroup, MockMaterial, MockGeometry }
