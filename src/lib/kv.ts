import { Redis } from '@upstash/redis'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

/**
 * Upstash Redis client for persistent game state.
 * Lazily initialized so the build succeeds without env vars.
 *
 * All reads must use Zod schema validation (.safeParse()).
 * Use key prefixes to namespace data (e.g. 'game:', 'feedback:').
 */
let _kv: Redis | null = null

export function getKv(): Redis {
  if (!_kv) {
    _kv = new Redis({
      url: requireEnv('KV_REST_API_URL'),
      token: requireEnv('KV_REST_API_TOKEN'),
    })
  }
  return _kv
}
