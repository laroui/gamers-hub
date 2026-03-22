import { db } from './db/client.js';
import { userGames } from './db/schema.js';
import { eq, sql, gt } from 'drizzle-orm';

async function run() {
  console.log("🚀 Starting Bulk Completion Rate Fix...");

  // Select all games that have achievement counts but might have wrong/zero completion_pct
  const rows = await db
    .select({
      id: userGames.id,
      earned: userGames.achievementsEarned,
      total: userGames.achievementsTotal,
    })
    .from(userGames)
    .where(gt(userGames.achievementsTotal, 0));

  console.log(`🔍 Found ${rows.length} games with achievement data to verify.`);

  let updatedCount = 0;
  for (const row of rows) {
    const earned = row.earned || 0;
    const total = row.total || 0;
    
    if (total > 0) {
      const actualPct = (earned / total) * 100;
      
      await db
        .update(userGames)
        .set({ completionPct: actualPct })
        .where(eq(userGames.id, row.id));
      
      updatedCount++;
    }
  }

  console.log(`✅ Hotfix complete! Updated ${updatedCount} games with accurate completion percentages.`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Hotfix failed:", err);
  process.exit(1);
});
