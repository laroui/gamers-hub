import { getAllGamesMissingMetadata, upsertGame } from "./db/queries.js";
import { enrichGame } from "./services/cover.js";

async function run() {
  console.log("🚀 Starting Bulk Metadata Enrichment (Covers + Screenshots + Descriptions)...");
  
  // Actually we want all games that are missing screenshots or description now
  const games = await getAllGamesMissingMetadata(); // Use existing query for simplicity
  console.log(`🔍 Found ${games.length} games to check.`);

  for (const game of games) {
    console.log(`\n📦 Processing: ${game.title} (ID: ${game.id})`);
    try {
      const enrichment = await enrichGame({
        id: game.id,
        title: game.title,
        coverUrl: game.coverUrl,
        igdbId: game.igdbId ?? null,
        steamAppId: game.steamAppId ?? null,
      });

      if (enrichment) {
        console.log(`   ✨ Found: ${enrichment.coverUrl ? "Cover " : ""}${enrichment.screenshotUrls?.length ? `[${enrichment.screenshotUrls.length} Screenshots] ` : ""}${enrichment.description ? "Description" : ""}`);
        await upsertGame({
          ...game,
          ...enrichment,
        });
        console.log(`   ✅ Updated.`);
      } else {
        console.log(`   ⏭️  No enrichment found.`);
      }
    } catch (err) {
      console.error(`   ❌ Failed:`, err);
    }
  }

  console.log("\n🏁 Done!");
  process.exit(0);
}

run();
