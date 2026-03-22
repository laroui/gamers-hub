import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getRedis } from "./redis.js";
import { QUEUE_NAMES } from "./queues.js";
import type { SyncJobPayload } from "@gamers-hub/types";
import pino from "pino";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

// ── Platform sync worker ──────────────────────────────────────
const syncWorker = new Worker<SyncJobPayload>(
  QUEUE_NAMES.PLATFORM_SYNC,
  async (job: Job<SyncJobPayload>) => {
    const { userId, platform, triggeredBy } = job.data;
    log.info({ userId, platform, triggeredBy }, "Processing sync job");

    // Dynamic import so each adapter is only loaded when needed
    const { runSync } = await import(`./jobs/sync-${platform}.js`).catch(() =>
      import("./jobs/sync-stub.js"),
    );

    await runSync(job);
  },
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

// Graceful shutdown
const shutdown = async (signal: string) => {
  log.info(`Received ${signal}, closing worker`);
  await syncWorker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
