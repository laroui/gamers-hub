import { Queue } from "bullmq";
import { getRedis } from "./redis.js";
import type { SyncJobPayload } from "@gamers-hub/types";

export const QUEUE_NAMES = {
  PLATFORM_SYNC: "platform-sync",
} as const;

// ── Sync Queue (used by API to enqueue jobs) ──────────────────
let syncQueue: Queue<SyncJobPayload> | null = null;

export function getSyncQueue(): Queue<SyncJobPayload> {
  if (!syncQueue) {
    syncQueue = new Queue<SyncJobPayload>(QUEUE_NAMES.PLATFORM_SYNC, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        timeout: Number(process.env.SYNC_JOB_TIMEOUT_MS ?? 120000),
      },
    });
  }
  return syncQueue;
}

export async function enqueuePlatformSync(payload: SyncJobPayload): Promise<string> {
  const queue = getSyncQueue();
  const jobId = `${payload.userId}:${payload.platform}:${Date.now()}`;
  const job = await queue.add("sync", payload, {
    jobId,
    // Deduplicate: only one active sync per user+platform at a time
    removeOnComplete: true,
  });
  return job.id ?? jobId;
}
