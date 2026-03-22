// env is loaded via --env-file=../../.env flag in package.json scripts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ── Seed data ────────────────────────────────────────────────
interface SeedGame {
  title: string;
  igdbId: number;
  steamAppId: number | null;
  genres: string[];
  releaseYear: number;
  metacritic: number;
}

const SEED_GAMES: SeedGame[] = [
  { title: "Elden Ring", igdbId: 119133, steamAppId: 1245620, genres: ["RPG", "Action"], releaseYear: 2022, metacritic: 96 },
  { title: "God of War: Ragnarök", igdbId: 119388, steamAppId: null, genres: ["Action", "Adventure"], releaseYear: 2022, metacritic: 94 },
  { title: "Cyberpunk 2077", igdbId: 1877, steamAppId: 1091500, genres: ["RPG", "Action"], releaseYear: 2020, metacritic: 86 },
  { title: "Halo Infinite", igdbId: 105649, steamAppId: 1240440, genres: ["FPS", "Action"], releaseYear: 2021, metacritic: 87 },
  { title: "The Witcher 3: Wild Hunt", igdbId: 1942, steamAppId: 292030, genres: ["RPG", "Adventure"], releaseYear: 2015, metacritic: 92 },
  { title: "Hollow Knight", igdbId: 20657, steamAppId: 367520, genres: ["Action", "Adventure"], releaseYear: 2017, metacritic: 90 },
  { title: "Stardew Valley", igdbId: 17000, steamAppId: 413150, genres: ["RPG", "Simulation"], releaseYear: 2016, metacritic: 89 },
  { title: "Forza Horizon 5", igdbId: 121842, steamAppId: 1551360, genres: ["Sports", "Racing"], releaseYear: 2021, metacritic: 92 },
  { title: "Celeste", igdbId: 79816, steamAppId: 504230, genres: ["Platform", "Adventure"], releaseYear: 2018, metacritic: 94 },
  { title: "Minecraft", igdbId: 2025, steamAppId: null, genres: ["Sandbox", "Survival"], releaseYear: 2011, metacritic: 93 },
  { title: "Age of Empires IV", igdbId: 119128, steamAppId: 1466860, genres: ["Strategy", "RTS"], releaseYear: 2021, metacritic: 81 },
  { title: "Horizon Forbidden West", igdbId: 103636, steamAppId: null, genres: ["Action", "RPG"], releaseYear: 2022, metacritic: 88 },
  { title: "Disco Elysium", igdbId: 103298, steamAppId: 632470, genres: ["RPG", "Adventure"], releaseYear: 2019, metacritic: 97 },
  { title: "Baldur's Gate 3", igdbId: 115280, steamAppId: 1086940, genres: ["RPG", "Strategy"], releaseYear: 2023, metacritic: 96 },
  { title: "Dave the Diver", igdbId: 197146, steamAppId: 1868140, genres: ["Action", "Adventure"], releaseYear: 2023, metacritic: 90 },
  { title: "Counter-Strike 2", igdbId: 252668, steamAppId: 730, genres: ["FPS", "Action"], releaseYear: 2023, metacritic: 75 },
  { title: "The Legend of Zelda: TotK", igdbId: 126234, steamAppId: null, genres: ["Action", "Adventure"], releaseYear: 2023, metacritic: 96 },
  { title: "Hades", igdbId: 91399, steamAppId: 1145360, genres: ["Action", "RPG"], releaseYear: 2020, metacritic: 93 },
  { title: "Red Dead Redemption 2", igdbId: 25076, steamAppId: 1174180, genres: ["Action", "Adventure"], releaseYear: 2018, metacritic: 97 },
  { title: "Death Stranding", igdbId: 101540, steamAppId: 1190460, genres: ["Action", "Adventure"], releaseYear: 2019, metacritic: 82 },
];

const PLATFORMS = ["steam", "psn", "xbox", "epic", "gog", "nintendo"] as const;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  console.log("Seeding database...");

  // ── Users ──────────────────────────────────────────────────
  console.log("  -> Creating users");
  const passwordHash = await bcrypt.hash("password123", 10);

  const insertedUsers = await db
    .insert(schema.users)
    .values([
      { email: "nacim@gamershub.dev", username: "nacim", passwordHash, avatarUrl: null },
      { email: "demo@gamershub.dev", username: "demo_player", passwordHash, avatarUrl: null },
    ])
    .returning()
    .onConflictDoNothing();

  // If users already exist, fetch them
  let user1: typeof schema.users.$inferSelect;
  if (insertedUsers.length === 0) {
    console.log("  Users already exist, fetching existing records");
    const { eq } = await import("drizzle-orm");
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "nacim@gamershub.dev"))
      .limit(1);
    if (!existing[0]) {
      console.error("Could not find or create seed user");
      await pool.end();
      return;
    }
    user1 = existing[0];
  } else {
    user1 = insertedUsers[0]!;
  }

  // ── Platform Connections ───────────────────────────────────
  console.log("  -> Creating platform connections");
  await db
    .insert(schema.platformConnections)
    .values([
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
    ])
    .onConflictDoNothing();

  // ── Games ──────────────────────────────────────────────────
  console.log("  -> Creating game catalog");
  const insertedGames = await db
    .insert(schema.games)
    .values(
      SEED_GAMES.map((g) => ({
        ...g,
        steamAppId: g.steamAppId ?? null,
        coverUrl: null,
        backgroundUrl: null,
        platforms: Array.from(PLATFORMS.slice(0, randInt(2, 4))),
      })),
    )
    .returning()
    .onConflictDoNothing();

  // If games already exist, fetch them
  let allGames = insertedGames;
  if (allGames.length === 0) {
    console.log("  Games already exist, fetching from DB");
    allGames = await db.select().from(schema.games).limit(20);
  }

  if (allGames.length === 0) {
    console.log("  No games found, skipping library and sessions");
    await pool.end();
    return;
  }

  // ── User Games ─────────────────────────────────────────────
  console.log("  -> Adding games to library");
  const statuses = ["library", "playing", "completed", "wishlist"] as const;
  const userGameValues = allGames.map((game, i) => ({
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
    .returning()
    .onConflictDoNothing();

  let allUserGames = insertedUserGames;
  if (allUserGames.length === 0) {
    const { eq } = await import("drizzle-orm");
    allUserGames = await db
      .select()
      .from(schema.userGames)
      .where(eq(schema.userGames.userId, user1.id))
      .limit(20);
  }

  // ── Play Sessions (90 days of history) ────────────────────
  console.log("  -> Generating 90 days of play sessions");
  const sessionValues = [];
  for (let day = 0; day < 90; day++) {
    if (Math.random() < 0.6) {
      // ~60% of days have a session
      const sessionsToday = randInt(1, 3);
      for (let s = 0; s < sessionsToday; s++) {
        const userGame = randElement(allUserGames);
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
          device: randElement(["PC", "Console", "Handheld", null] as const),
        });
      }
    }
  }

  if (sessionValues.length > 0) {
    await db.insert(schema.playSessions).values(sessionValues).onConflictDoNothing();
  }

  // ── Summary ────────────────────────────────────────────────
  const { eq, count } = await import("drizzle-orm");
  const [sessionCount] = await db
    .select({ total: count() })
    .from(schema.playSessions)
    .where(eq(schema.playSessions.userId, user1.id));

  const [ugCount] = await db
    .select({ total: count() })
    .from(schema.userGames)
    .where(eq(schema.userGames.userId, user1.id));

  const [gameTotal] = await db.select({ total: count() }).from(schema.games);
  const [userTotal] = await db.select({ total: count() }).from(schema.users);

  console.log("Seed complete:");
  console.log(`   - ${userTotal?.total ?? 0} users`);
  console.log(`   - 3 platform connections`);
  console.log(`   - ${gameTotal?.total ?? 0} games in catalog`);
  console.log(`   - ${ugCount?.total ?? 0} library entries for nacim`);
  console.log(`   - ${sessionCount?.total ?? 0} play sessions for nacim`);
  console.log("\n   Login: nacim@gamershub.dev / password123");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
