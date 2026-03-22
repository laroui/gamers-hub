import type { Job } from "bullmq";
import type { SyncJobPayload, SyncJobProgress } from "@gamers-hub/types";

// ── Stub: used when a platform adapter is not yet implemented ──
// This is also the REFERENCE IMPLEMENTATION for how B4 adapters
// should report progress and structure their work.

export async function runSync(job: Job<SyncJobPayload>): Promise<void> {
  const { platform } = job.data;

  const reportProgress = async (progress: SyncJobProgress) => {
    await job.updateProgress(progress);
  };

  await reportProgress({
    stage: "fetching_library",
    processed: 0,
    total: 0,
    message: `Connecting to ${platform}...`,
  });

  // Simulate work — real adapters replace this with API calls
  await sleep(500);

  await reportProgress({
    stage: "saving",
    processed: 0,
    total: 0,
    message: `${platform} adapter not yet implemented — stub complete`,
  });

  await sleep(200);

  await reportProgress({
    stage: "done",
    processed: 0,
    total: 0,
    message: "Stub sync complete",
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
