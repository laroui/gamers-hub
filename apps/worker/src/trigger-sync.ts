import { Queue } from "bullmq";
import { env } from "./config/env.js";

const queue = new Queue("platform-sync", {
  connection: env.REDIS_URL,
});

async function run() {
  const userId = "eb42547f-7ec5-4431-a257-1637cce7c1bd"; // Nacim's user ID
  console.log(`🚀 Triggering Steam Sync for user: ${userId}...`);
  
  await queue.add("sync", {
    userId,
    platform: "steam",
    triggeredBy: "manual",
    forceDeep: true,
  });

  console.log("✅ Job added to queue. The worker will process it shortly.");
  process.exit(0);
}

run();
