import { db } from './db/client.js';
import { userGames, achievements, playSessions } from './db/schema.js';
import { like } from 'drizzle-orm';

async function run() {
  console.log("🧹 Starting cleanup of dummy data...");

  // 1. Delete achievements linked to seed games
  const subquery = db
    .select({ id: userGames.id })
    .from(userGames)
    .where(like(userGames.platformGameId, 'seed_%'));

  // Note: Since we have cascading deletes in schema, deleting from userGames might be enough,
  // but let's be thorough if cascade isn't perfect.
  
  const deletedGames = await db
    .delete(userGames)
    .where(like(userGames.platformGameId, 'seed_%'))
    .returning({ id: userGames.id });

  console.log(`✅ Deleted ${deletedGames.length} dummy user_game records.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
