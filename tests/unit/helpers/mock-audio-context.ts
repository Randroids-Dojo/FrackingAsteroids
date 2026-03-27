/**
 * Minimal Web Audio API mock for unit tests.
 * Provides just enough surface for audio modules to execute their code paths.
 */

function createAudioParam(initial = 0): AudioParam {
  return {
    value: initial,
    defaultValue: initial,
    minValue: -3.4028235e38,
    maxValue: 3.4028235e38,
    automationRate: 'a-rate' as AutomationRate,
    setValueAtTime(_v: number, _t: number) {
      return this
    },
    linearRampToValueAtTime(_v: number, _t: number) {
      return this
    },
    exponentialRampToValueAtTime(_v: number, _t: number) {
      return this
    },
    setTargetAtTime(_v: number, _t: number, _c: number) {
      return this
    },
    setValueCurveAtTime(_v: Float32Array, _t: number, _d: number) {
      return this
    },
    cancelScheduledValues(_t: number) {
      return this
    },
    cancelAndHoldAtTime(_t: number) {
      return this
    },
  } as AudioParam
}

function createMockNode(): AudioNode {
  return {
    connect() {
      return createMockNode()
    },
    disconnect() {},
    context: null as unknown as BaseAudioContext,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 2,
    channelCountMode: 'max' as ChannelCountMode,
    channelInterpretation: 'speakers' as ChannelInterpretation,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return true
    },
  } as unknown as AudioNode
}

class MockOscillatorNode extends EventTarget {
  type = 'sine'
  frequency = createAudioParam(440)
  detune = createAudioParam(0)
  connect() {
    return createMockNode()
  }
  disconnect() {}
  start() {}
  stop() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockGainNode extends EventTarget {
  gain = createAudioParam(1)
  connect() {
    return createMockNode()
  }
  disconnect() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockBiquadFilterNode extends EventTarget {
  type = 'lowpass'
  frequency = createAudioParam(350)
  Q = createAudioParam(1)
  gain = createAudioParam(0)
  detune = createAudioParam(0)
  connect() {
    return createMockNode()
  }
  disconnect() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockAudioBufferSourceNode extends EventTarget {
  buffer: AudioBuffer | null = null
  loop = false
  playbackRate = createAudioParam(1)
  detune = createAudioParam(0)
  connect() {
    return createMockNode()
  }
  disconnect() {}
  start() {}
  stop() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockAudioBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  duration: number
  private data: Float32Array

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this.duration = length / sampleRate
    this.data = new Float32Array(length)
  }

  getChannelData(_channel: number): Float32Array {
    return this.data
  }

  copyFromChannel() {}
  copyToChannel() {}
}

class MockAudioContext extends EventTarget {
  currentTime = 0
  sampleRate = 44100
  state: AudioContextState = 'running'
  destination = createMockNode()
  listener = {} as AudioListener

  createGain(): GainNode {
    return new MockGainNode() as unknown as GainNode
  }

  createOscillator(): OscillatorNode {
    return new MockOscillatorNode() as unknown as OscillatorNode
  }

  createBiquadFilter(): BiquadFilterNode {
    return new MockBiquadFilterNode() as unknown as BiquadFilterNode
  }

  createBufferSource(): AudioBufferSourceNode {
    return new MockAudioBufferSourceNode() as unknown as AudioBufferSourceNode
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer
  }

  resume(): Promise<void> {
    this.state = 'running'
    return Promise.resolve()
  }

  close(): Promise<void> {
    this.state = 'closed'
    return Promise.resolve()
  }

  suspend(): Promise<void> {
    this.state = 'suspended'
    return Promise.resolve()
  }
}

/** Install the mock AudioContext on globalThis. Call in before() hook. */
export function installMockAudioContext(): void {
  const g = globalThis as Record<string, unknown>
  g.AudioContext = MockAudioContext
  g.OscillatorNode = MockOscillatorNode
  g.GainNode = MockGainNode
  g.BiquadFilterNode = MockBiquadFilterNode
  g.AudioBufferSourceNode = MockAudioBufferSourceNode
}

/** Remove the mock AudioContext from globalThis. Call in after() hook. */
export function uninstallMockAudioContext(): void {
  const g = globalThis as Record<string, unknown>
  delete g.AudioContext
  delete g.OscillatorNode
  delete g.GainNode
  delete g.BiquadFilterNode
  delete g.AudioBufferSourceNode
}
