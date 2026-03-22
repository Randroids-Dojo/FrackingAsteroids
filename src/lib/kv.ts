import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn("KV_REST_API_URL or KV_REST_API_TOKEN not set — KV disabled");
    return null;
  }

  return new Redis({ url, token });
}

export const kv = createRedisClient();
