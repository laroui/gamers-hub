import "dotenv/config";
import { Worker } from "bullmq";
import { getRedis } from "./redis.js";
import { QUEUE_NAMES, enqueuePlatformSync } from "./queues.js";
import { syncPlatform } from "./services/sync.js";
import { getAllConnectedPlatforms } from "./db/queries.js";
import type { SyncJobPayload, PlatformId } from "@gamers-hub/types";
import pino from "pino";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

// ── Platform sync worker ──────────────────────────────────────
const syncWorker = new Worker<SyncJobPayload>(
  QUEUE_NAMES.PLATFORM_SYNC,
  syncPlatform,
  {
    connection: getRedis(),
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 3),
    limiter: { max: 10, duration: 1000 },
  },
);

syncWorker.on("completed", (job) => {
  log.info({ jobId: job.id, platform: job.data.platform }, "Sync job completed");
});

syncWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, platform: job?.data.platform, err }, "Sync job failed");
});

syncWorker.on("progress", (job, progress) => {
  log.debug({ jobId: job.id, progress }, "Sync job progress");
});

log.info(`Worker started — listening on queue: ${QUEUE_NAMES.PLATFORM_SYNC}`);

// ── Scheduled auto-sync (every 6 hours) ──────────────────────

async function scheduleAutoSync(): Promise<void> {
  try {
    const connections = await getAllConnectedPlatforms();
    const staleThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);

    for (const conn of connections) {
      const isStale = !conn.lastSyncedAt || conn.lastSyncedAt < staleThreshold;
      if (isStale) {
        await enqueuePlatformSync({
          userId: conn.userId,
          platform: conn.platform as PlatformId,
          triggeredBy: "scheduled",
        });
      }
    }
  } catch (err) {
    log.error({ err }, "Auto-sync scheduling error");
  }
}

scheduleAutoSync();
setInterval(scheduleAutoSync, 6 * 60 * 60 * 1000);

// ── Graceful shutdown ─────────────────────────────────────────

const shutdown = async (signal: string) => {
  log.info(`Received ${signal}, closing worker`);
  await syncWorker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
