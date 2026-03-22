import { Redis } from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    client.on("error", (err: Error) => console.error("Worker Redis error:", err.message));
  }
  return client;
}
