import { Redis } from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const isTLS = redisUrl.startsWith("rediss://");
    client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTLS ? { rejectUnauthorized: false } : undefined,
    });
    client.on("error", (err: Error) => console.error("Worker Redis error:", err.message));
  }
  return client;
}
