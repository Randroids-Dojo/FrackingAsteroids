import { getKv } from './kv'
import { GameStateSchema } from './schemas'
import type { GameState } from './schemas'
import { readKv, writeKv } from '@randroids-dojo/vibekit/server'
import { z } from 'zod'

const KEY_PREFIX = 'game:'
const PersistedGameStateSchema: z.ZodType<GameState, z.ZodTypeDef, unknown> = z.preprocess(
  (raw) => {
    if (typeof raw !== 'string') return raw
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  },
  GameStateSchema,
)
const PersistedGameStateReadSchema = PersistedGameStateSchema as z.ZodSchema<GameState>

export async function saveGame(id: string, state: GameState): Promise<boolean> {
  const kv = getKv()
  if (!kv) return false
  return await writeKv(kv, `${KEY_PREFIX}${id}`, state)
}

export async function loadGame(id: string): Promise<GameState | null> {
  const kv = getKv()
  if (!kv) return null
  return await readKv(kv, `${KEY_PREFIX}${id}`, PersistedGameStateReadSchema)
}
