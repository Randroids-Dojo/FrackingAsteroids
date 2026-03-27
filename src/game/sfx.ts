/**
 * Sound effects using Web Audio API — all procedurally synthesized.
 */

let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (audioCtx) return audioCtx
  try {
    audioCtx = new AudioContext()
  } catch {
    return null
  }
  return audioCtx
}

/** Share the audio context with the main audio module. */
export function setSfxContext(ctx: AudioContext): void {
  audioCtx = ctx
}

// ---------------------------------------------------------------------------
// Laser Fire — short chirpy zap
// ---------------------------------------------------------------------------

export function playLaserFire(): void {
  const ctx = getContext()
  if (!ctx) return

  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(880, now)
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.08)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(600, now)
  filter.Q.setValueAtTime(2, now)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + 0.1)
}

// ---------------------------------------------------------------------------
// Explosion — low boom with noise burst
// ---------------------------------------------------------------------------

export function playExplosion(): void {
  const ctx = getContext()
  if (!ctx) return

  const now = ctx.currentTime

  // Noise burst
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08))
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'lowpass'
  noiseFilter.frequency.setValueAtTime(800, now)
  noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.3)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.12, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)

  // Low thump
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(80, now)
  osc.frequency.exponentialRampToValueAtTime(20, now + 0.2)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.15, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.3)
}

// ---------------------------------------------------------------------------
// Player Hit — sharp impact with distortion
// ---------------------------------------------------------------------------

export function playPlayerHit(): void {
  const ctx = getContext()
  if (!ctx) return

  const now = ctx.currentTime

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.15)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.12, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1200, now)
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.15)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.2)

  // Additional high-frequency crack
  const crack = ctx.createOscillator()
  crack.type = 'square'
  crack.frequency.setValueAtTime(2000, now)
  crack.frequency.exponentialRampToValueAtTime(500, now + 0.05)

  const crackGain = ctx.createGain()
  crackGain.gain.setValueAtTime(0.05, now)
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  crack.connect(crackGain)
  crackGain.connect(ctx.destination)
  crack.start(now)
  crack.stop(now + 0.06)
}

// ---------------------------------------------------------------------------
// Engine Thrust — filtered noise loop, controlled externally
// ---------------------------------------------------------------------------

interface EngineSound {
  source: AudioBufferSourceNode
  gain: GainNode
  filter: BiquadFilterNode
}

let engineSound: EngineSound | null = null

export function startEngineSound(): void {
  if (engineSound) return
  const ctx = getContext()
  if (!ctx) return

  // Create a looping noise buffer
  const duration = 1
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(60, ctx.currentTime)
  filter.Q.setValueAtTime(1, ctx.currentTime)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, ctx.currentTime)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()

  engineSound = { source, gain, filter }
}

/** Update engine sound based on ship speed (0 to 1 normalized). */
export function updateEngineSound(speedNormalized: number): void {
  if (!engineSound || !audioCtx) return

  const vol = speedNormalized * 0.04
  const freq = 60 + speedNormalized * 200

  engineSound.gain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05)
  engineSound.filter.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05)
}

export function stopEngineSound(): void {
  if (!engineSound) return
  try {
    engineSound.source.stop()
  } catch {
    // already stopped
  }
  engineSound = null
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function disposeSfx(): void {
  stopEngineSound()
  // Don't close ctx — shared with main audio module
  audioCtx = null
}
