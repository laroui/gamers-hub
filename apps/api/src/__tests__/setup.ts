import { beforeAll, afterAll } from "vitest";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, closeDb } from "../db/client.js";
import * as schema from "../db/schema.js";

// ── Exported test fixtures ────────────────────────────────────

export let testUserId: string;
export let testUserId2: string;
export const testGameIds: string[] = [];
export const testUserGameIds: string[] = [];

// ── Setup ─────────────────────────────────────────────────────

beforeAll(async () => {
  // Truncate all tables in dependency order
  await db.execute(sql`
    TRUNCATE TABLE
      achievements,
      play_sessions,
      user_games,
      platform_connections,
      token_blacklist,
      users,
      games
    RESTART IDENTITY CASCADE
  `);

  // Use bcrypt rounds=4 for speed in tests
  const passwordHash = await bcrypt.hash("testpassword", 4);

  // ── Insert 2 test users ─────────────────────────────────────
  const [u1, u2] = await db
    .insert(schema.users)
    .values([
      {
        email: "testuser1@test.com",
        username: "testuser1",
        passwordHash,
        avatarUrl: null,
      },
      {
        email: "testuser2@test.com",
        username: "testuser2",
        passwordHash,
        avatarUrl: null,
      },
    ])
    .returning();

  testUserId = u1!.id;
  testUserId2 = u2!.id;

  // ── Insert 5 test games ─────────────────────────────────────
  const insertedGames = await db
    .insert(schema.games)
    .values([
      {
        title: "Test Game Alpha",
        igdbId: 9900001,
        steamAppId: 8800001,
        genres: ["RPG", "Action"],
        platforms: ["steam", "psn"],
        releaseYear: 2022,
        metacritic: 90,
        coverUrl: "https://example.com/alpha.jpg",
        backgroundUrl: null,
        description: "Alpha test game",
      },
      {
        title: "Test Game Beta",
        igdbId: 9900002,
        steamAppId: 8800002,
        genres: ["FPS", "Action"],
        platforms: ["steam", "xbox"],
        releaseYear: 2021,
        metacritic: 85,
        coverUrl: "https://example.com/beta.jpg",
        backgroundUrl: null,
        description: "Beta test game",
      },
      {
        title: "Test Game Gamma",
        igdbId: 9900003,
        steamAppId: null,
        genres: ["Strategy", "RTS"],
        platforms: ["psn"],
        releaseYear: 2020,
        metacritic: 80,
        coverUrl: null,
        backgroundUrl: null,
        description: null,
      },
      {
        title: "Test Game Delta",
        igdbId: 9900004,
        steamAppId: null,
        genres: ["RPG", "Adventure"],
        platforms: ["nintendo"],
        releaseYear: 2023,
        metacritic: 95,
        coverUrl: "https://example.com/delta.jpg",
        backgroundUrl: null,
        description: "Delta test game",
      },
      {
        title: "Test Game Epsilon",
        igdbId: 9900005,
        steamAppId: 8800005,
        genres: ["Sandbox", "Survival"],
        platforms: ["steam", "xbox", "psn"],
        releaseYear: 2019,
        metacritic: 75,
        coverUrl: null,
        backgroundUrl: null,
        description: null,
      },
    ])
    .returning();

  for (const g of insertedGames) {
    testGameIds.push(g.id);
  }

  // ── Insert 5 user_games for user 1 ──────────────────────────
  const now = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };

  const insertedUserGames = await db
    .insert(schema.userGames)
    .values([
      {
        userId: testUserId,
        gameId: testGameIds[0]!,
        platform: "steam",
        platformGameId: "ug_test_1",
        status: "playing",
        minutesPlayed: 3600,
        lastPlayedAt: daysAgo(1),
        completionPct: 45,
        achievementsEarned: 15,
        achievementsTotal: 40,
        userRating: 9,
        userNotes: "Great game",
      },
      {
        userId: testUserId,
        gameId: testGameIds[1]!,
        platform: "steam",
        platformGameId: "ug_test_2",
        status: "completed",
        minutesPlayed: 1800,
        lastPlayedAt: daysAgo(10),
        completionPct: 100,
        achievementsEarned: 30,
        achievementsTotal: 30,
        userRating: 8,
        userNotes: null,
      },
      {
        userId: testUserId,
        gameId: testGameIds[2]!,
        platform: "psn",
        platformGameId: "ug_test_3",
        status: "library",
        minutesPlayed: 120,
        lastPlayedAt: daysAgo(30),
        completionPct: 5,
        achievementsEarned: 2,
        achievementsTotal: 20,
        userRating: null,
        userNotes: null,
      },
      {
        userId: testUserId,
        gameId: testGameIds[3]!,
        platform: "nintendo",
        platformGameId: "ug_test_4",
        status: "wishlist",
        minutesPlayed: 0,
        lastPlayedAt: null,
        completionPct: 0,
        achievementsEarned: 0,
        achievementsTotal: 0,
        userRating: null,
        userNotes: null,
      },
      {
        userId: testUserId,
        gameId: testGameIds[4]!,
        platform: "xbox",
        platformGameId: "ug_test_5",
        status: "dropped",
        minutesPlayed: 60,
        lastPlayedAt: daysAgo(60),
        completionPct: 10,
        achievementsEarned: 1,
        achievementsTotal: 25,
        userRating: 5,
        userNotes: "Not my style",
      },
    ])
    .returning();

  for (const ug of insertedUserGames) {
    testUserGameIds.push(ug.id);
  }

  // ── Insert 60 days of sessions for user 1 ──────────────────
  const sessionValues = [];
  for (let day = 0; day < 60; day++) {
    // Create sessions for ~70% of days to ensure decent streak data
    if (day % 3 !== 2) {
      const sessionCount = day % 5 === 0 ? 2 : 1;
      for (let s = 0; s < sessionCount; s++) {
        const ugIndex = (day + s) % 5;
        const ugId = testUserGameIds[ugIndex]!;
        // Get the platform from the corresponding user game
        const ug = insertedUserGames[ugIndex]!;
        const startDate = daysAgo(day);
        startDate.setHours(18 + s, (day * 7) % 60, 0, 0);
        const minutes = 30 + (day % 6) * 30; // 30 to 180 minutes
        const endDate = new Date(startDate.getTime() + minutes * 60000);

        sessionValues.push({
          userId: testUserId,
          userGameId: ugId,
          startedAt: startDate,
          endedAt: endDate,
          minutes,
          platform: ug.platform,
          device: s % 2 === 0 ? "PC" : "Console",
        });
      }
    }
  }

  if (sessionValues.length > 0) {
    await db.insert(schema.playSessions).values(sessionValues);
  }
});

// ── Teardown ──────────────────────────────────────────────────

afterAll(async () => {
  await closeDb();
});
