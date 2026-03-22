import { Redis } from "ioredis";
import { env } from "../config/env.js";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as unknown as T;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const data = typeof value === "string" ? value : JSON.stringify(value);
  if (ttlSeconds) {
    await getRedis().set(key, data, "EX", ttlSeconds);
  } else {
    await getRedis().set(key, data);
  }
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}
