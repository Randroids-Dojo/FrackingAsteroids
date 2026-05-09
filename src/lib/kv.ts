/**
 * Upstash Redis client for persistent game state.
 *
 * Thin facade over `@randroids-dojo/vibekit/server`'s `getKv`. The
 * VibeKit helper returns `Redis | null`: a null result means the
 * KV env vars are unset (e.g. local dev / preview without a KV
 * binding) and callers should degrade gracefully rather than throw.
 *
 * All reads must use Zod schema validation (.safeParse()).
 * Use key prefixes to namespace data (e.g. 'game:', 'feedback:').
 */
export { getKv } from '@randroids-dojo/vibekit/server'
