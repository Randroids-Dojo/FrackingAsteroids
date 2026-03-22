import { kv } from "./kv";
import { GameStateSchema } from "./schemas";
import type { GameState } from "./schemas";

const KEY_PREFIX = "game:";

export async function saveGame(id: string, state: GameState): Promise<boolean> {
  if (!kv) return false;
  try {
    await kv.set(`${KEY_PREFIX}${id}`, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export async function loadGame(id: string): Promise<GameState | null> {
  if (!kv) return null;
  try {
    const raw = await kv.get(`${KEY_PREFIX}${id}`);
    if (!raw) return null;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result = GameStateSchema.safeParse(data);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
