import IORedis from "ioredis";

let client: IORedis | null = null;

export function getRedis(): IORedis {
  if (!client) {
    client = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    client.on("error", (err) => console.error("Worker Redis error:", err.message));
  }
  return client;
}
