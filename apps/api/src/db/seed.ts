import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ── Seed data ────────────────────────────────────────────────
const SEED_GAMES = [
  { title: "Elden Ring", igdbId: 119133, genres: ["RPG", "Action"], releaseYear: 2022, metacritic: 96 },
  { title: "God of War: Ragnarök", igdbId: 119388, genres: ["Action", "Adventure"], releaseYear: 2022, metacritic: 94 },
  { title: "Cyberpunk 2077", igdbId: 1877, genres: ["RPG", "Action"], releaseYear: 2020, metacritic: 86 },
  { title: "Halo Infinite", igdbId: 105649, genres: ["FPS", "Action"], releaseYear: 2021, metacritic: 87 },
  { title: "The Witcher 3: Wild Hunt", igdbId: 1942, genres: ["RPG", "Adventure"], releaseYear: 2015, metacritic: 92 },
  { title: "Hollow Knight", igdbId: 20657, genres: ["Action", "Adventure"], releaseYear: 2017, metacritic: 90 },
  { title: "Stardew Valley", igdbId: 17000, genres: ["RPG", "Simulation"], releaseYear: 2016, metacritic: 89 },
  { title: "Forza Horizon 5", igdbId: 121842, genres: ["Sports", "Racing"], releaseYear: 2021, metacritic: 92 },
  { title: "Celeste", igdbId: 79816, genres: ["Platform", "Adventure"], releaseYear: 2018, metacritic: 94 },
  { title: "Minecraft", igdbId: 2025, genres: ["Sandbox", "Survival"], releaseYear: 2011, metacritic: 93 },
  { title: "Age of Empires IV", igdbId: 119128, genres: ["Strategy", "RTS"], releaseYear: 2021, metacritic: 81 },
  { title: "Horizon Forbidden West", igdbId: 103636, genres: ["Action", "RPG"], releaseYear: 2022, metacritic: 88 },
  { title: "Disco Elysium", igdbId: 103298, genres: ["RPG", "Adventure"], releaseYear: 2019, metacritic: 97 },
  { title: "Baldur's Gate 3", igdbId: 115280, genres: ["RPG", "Strategy"], releaseYear: 2023, metacritic: 96 },
  { title: "Dave the Diver", igdbId: 197146, genres: ["Action", "Adventure"], releaseYear: 2023, metacritic: 90 },
  { title: "Counter-Strike 2", igdbId: 252668, genres: ["FPS", "Action"], releaseYear: 2023, metacritic: 75 },
  { title: "The Legend of Zelda: TotK", igdbId: 119388, genres: ["Action", "Adventure"], releaseYear: 2023, metacritic: 96 },
  { title: "Hades", igdbId: 91399, genres: ["Action", "RPG"], releaseYear: 2020, metacritic: 93 },
  { title: "Red Dead Redemption 2", igdbId: 25076, genres: ["Action", "Adventure"], releaseYear: 2018, metacritic: 97 },
  { title: "Death Stranding", igdbId: 101540, genres: ["Action", "Adventure"], releaseYear: 2019, metacritic: 82 },
];

const PLATFORMS = ["steam", "psn", "xbox", "epic", "gog", "nintendo"] as const;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Users ──────────────────────────────────────────────────
  console.log("  → Creating users");
  const passwordHash = await bcrypt.hash("password123", 10);

  const [user1] = await db
    .insert(schema.users)
    .values([
      { email: "nacim@gamershub.dev", username: "nacim", passwordHash, avatarUrl: null },
      { email: "demo@gamershub.dev", username: "demo_player", passwordHash, avatarUrl: null },
    ])
    .returning()
    .onConflictDoNothing();

  if (!user1) {
    console.log("  ℹ️  Users already exist, skipping seed");
    await pool.end();
    return;
  }

  // ── Platform Connections ───────────────────────────────────
  console.log("  → Creating platform connections");
  await db.insert(schema.platformConnections).values([
    {
      userId: user1.id,
      platform: "steam",
      platformUid: "76561198000000001",
      displayName: "nacim_steam",
      lastSyncedAt: daysAgo(1),
      syncStatus: "success",
    },
    {
      userId: user1.id,
      platform: "psn",
      platformUid: "nacim_psn",
      displayName: "nacim_psn",
      lastSyncedAt: daysAgo(2),
      syncStatus: "success",
    },
    {
      userId: user1.id,
      platform: "xbox",
      platformUid: "nacim_xbox",
      displayName: "nacim_xbox",
      lastSyncedAt: daysAgo(1),
      syncStatus: "success",
    },
  ]);

  // ── Games ──────────────────────────────────────────────────
  console.log("  → Creating game catalog");
  const insertedGames = await db
    .insert(schema.games)
    .values(
      SEED_GAMES.map((g) => ({
        ...g,
        coverUrl: null, // will be populated by IGDB fetch in B5
        backgroundUrl: null,
        platforms: PLATFORMS.slice(0, randInt(2, 4)),
      })),
    )
    .returning();

  // ── User Games ─────────────────────────────────────────────
  console.log("  → Adding games to library");
  const statuses = ["library", "playing", "completed", "wishlist"] as const;
  const userGameValues = insertedGames.map((game, i) => ({
    userId: user1.id,
    gameId: game.id,
    platform: randElement(PLATFORMS),
    platformGameId: `seed_${game.id}`,
    status: i < 8 ? "playing" : i < 14 ? "completed" : randElement(statuses),
    minutesPlayed: randInt(60, 18000),
    lastPlayedAt: daysAgo(randInt(0, 60)),
    completionPct: randInt(5, 100),
    achievementsEarned: randInt(0, 40),
    achievementsTotal: 50,
    userRating: randInt(6, 10),
  }));

  const insertedUserGames = await db
    .insert(schema.userGames)
    .values(userGameValues)
    .returning();

  // ── Play Sessions (90 days of history) ────────────────────
  console.log("  → Generating 90 days of play sessions");
  const sessionValues = [];
  for (let day = 0; day < 90; day++) {
    if (Math.random() < 0.6) {
      // ~60% of days have a session
      const sessionsToday = randInt(1, 3);
      for (let s = 0; s < sessionsToday; s++) {
        const userGame = randElement(insertedUserGames);
        const startDate = daysAgo(day);
        startDate.setHours(randInt(18, 23), randInt(0, 59));
        const minutes = randInt(30, 240);
        const endDate = new Date(startDate.getTime() + minutes * 60000);

        sessionValues.push({
          userId: user1.id,
          userGameId: userGame.id,
          startedAt: startDate,
          endedAt: endDate,
          minutes,
          platform: userGame.platform,
          device: randElement(["PC", "Console", "Handheld", null]),
        });
      }
    }
  }

  await db.insert(schema.playSessions).values(sessionValues);

  console.log(`✅ Seed complete:`);
  console.log(`   - 2 users created`);
  console.log(`   - 3 platform connections`);
  console.log(`   - ${insertedGames.length} games in catalog`);
  console.log(`   - ${insertedUserGames.length} library entries`);
  console.log(`   - ${sessionValues.length} play sessions`);
  console.log(`\n   Login: nacim@gamershub.dev / password123`);

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
