import { getKv } from './kv'
import { GameStateSchema } from './schemas'
import type { GameState } from './schemas'

const KEY_PREFIX = 'game:'

export async function saveGame(id: string, state: GameState): Promise<boolean> {
  try {
    const kv = getKv()
    await kv.set(`${KEY_PREFIX}${id}`, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export async function loadGame(id: string): Promise<GameState | null> {
  try {
    const kv = getKv()
    const raw = await kv.get(`${KEY_PREFIX}${id}`)
    if (!raw) return null
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    const result = GameStateSchema.safeParse(data)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
