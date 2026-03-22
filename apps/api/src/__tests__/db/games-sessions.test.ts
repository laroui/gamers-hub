import { describe, it, expect } from "vitest";
import { testUserId, testUserId2, testGameIds, testUserGameIds } from "../setup.js";
import {
  findGameByIgdbId,
  findGameBySteamId,
  searchGames,
  upsertGame,
  getGameById,
} from "../../db/queries/games.js";
import {
  getPlaySessions,
  insertPlaySession,
  bulkInsertSessions,
} from "../../db/queries/sessions.js";
import {
  getUserConnections,
  getConnection,
  upsertConnection,
  updateSyncStatus,
  deleteConnection,
} from "../../db/queries/platforms.js";

// ── Games queries ─────────────────────────────────────────────

describe("findGameByIgdbId", () => {
  it("finds game by igdb id", async () => {
    const game = await findGameByIgdbId(9900001);
    expect(game).not.toBeNull();
    expect(game!.title).toBe("Test Game Alpha");
  });

  it("returns null for non-existent igdb id", async () => {
    const game = await findGameByIgdbId(0);
    expect(game).toBeNull();
  });
});

describe("findGameBySteamId", () => {
  it("finds game by steam app id", async () => {
    const game = await findGameBySteamId(8800001);
    expect(game).not.toBeNull();
    expect(game!.title).toBe("Test Game Alpha");
  });

  it("returns null for non-existent steam app id", async () => {
    const game = await findGameBySteamId(0);
    expect(game).toBeNull();
  });
});

describe("searchGames", () => {
  it("finds games by partial title match", async () => {
    const results = await searchGames("Test Game");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for no match", async () => {
    const results = await searchGames("zzznonexistentgamexxx");
    expect(results).toHaveLength(0);
  });

  it("respects limit parameter", async () => {
    const results = await searchGames("Test", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("each result has expected Game fields", async () => {
    const results = await searchGames("Alpha");
    expect(results.length).toBeGreaterThan(0);
    const game = results[0]!;
    expect(game).toHaveProperty("id");
    expect(game).toHaveProperty("title");
    expect(game).toHaveProperty("genres");
    expect(game).toHaveProperty("platforms");
  });
});

describe("upsertGame", () => {
  it("inserts new game", async () => {
    const game = await upsertGame({
      igdbId: 9999999,
      title: "Upsert Test Game",
      genres: ["Action"],
      platforms: ["steam"],
    });
    expect(game.id).toBeDefined();
    expect(game.title).toBe("Upsert Test Game");
  });

  it("updates existing game on igdb_id conflict", async () => {
    // First insert
    await upsertGame({
      igdbId: 9999998,
      title: "Conflict Game v1",
      coverUrl: "https://example.com/cover.jpg",
    });

    // Upsert with null coverUrl — should keep existing cover (COALESCE)
    const updated = await upsertGame({
      igdbId: 9999998,
      title: "Conflict Game v2",
      coverUrl: null,
    });

    expect(updated.title).toBe("Conflict Game v2");
    expect(updated.coverUrl).toBe("https://example.com/cover.jpg");
  });

  it("overwrites coverUrl with better value", async () => {
    await upsertGame({
      igdbId: 9999997,
      title: "Cover Game",
      coverUrl: null,
    });

    const updated = await upsertGame({
      igdbId: 9999997,
      title: "Cover Game",
      coverUrl: "https://example.com/newcover.jpg",
    });

    expect(updated.coverUrl).toBe("https://example.com/newcover.jpg");
  });
});

describe("getGameById", () => {
  it("finds game by uuid", async () => {
    const game = await getGameById(testGameIds[0]!);
    expect(game).not.toBeNull();
    expect(game!.id).toBe(testGameIds[0]);
  });

  it("returns null for non-existent id", async () => {
    const game = await getGameById("00000000-0000-0000-0000-000000000000");
    expect(game).toBeNull();
  });
});

// ── Sessions queries ──────────────────────────────────────────

describe("getPlaySessions", () => {
  it("returns sessions for user", async () => {
    const result = await getPlaySessions(testUserId);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("each session has required fields", async () => {
    const result = await getPlaySessions(testUserId, { limit: 5 });
    for (const session of result.data) {
      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("userGameId");
      expect(session).toHaveProperty("gameTitle");
      expect(session).toHaveProperty("startedAt");
      expect(session).toHaveProperty("minutes");
      expect(session).toHaveProperty("platform");
    }
  });

  it("returns empty for user with no sessions", async () => {
    const result = await getPlaySessions(testUserId2);
    expect(result.data).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("filters by userGameId", async () => {
    const result = await getPlaySessions(testUserId, {
      userGameId: testUserGameIds[0]!,
    });
    expect(result.data.every((s) => s.userGameId === testUserGameIds[0])).toBe(true);
  });

  it("respects limit", async () => {
    const result = await getPlaySessions(testUserId, { limit: 3 });
    expect(result.data.length).toBeLessThanOrEqual(3);
  });

  it("paginates with cursor", async () => {
    const first = await getPlaySessions(testUserId, { limit: 3 });
    if (first.nextCursor) {
      const second = await getPlaySessions(testUserId, {
        limit: 3,
        cursor: first.nextCursor,
      });
      // No overlapping IDs
      const firstIds = new Set(first.data.map((s) => s.id));
      for (const s of second.data) {
        expect(firstIds.has(s.id)).toBe(false);
      }
    }
  });

  it("sorted by startedAt descending", async () => {
    const result = await getPlaySessions(testUserId, { limit: 10 });
    for (let i = 1; i < result.data.length; i++) {
      const prev = new Date(result.data[i - 1]!.startedAt).getTime();
      const curr = new Date(result.data[i]!.startedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});

describe("insertPlaySession", () => {
  it("inserts session and updates user_game minutes", async () => {
    const { db } = await import("../../db/client.js");
    const { userGames } = await import("../../db/schema.js");
    const { eq } = await import("drizzle-orm");

    const ugId = testUserGameIds[0]!;

    // Get current minutes
    const [before] = await db
      .select({ minutes: userGames.minutesPlayed })
      .from(userGames)
      .where(eq(userGames.id, ugId));
    const beforeMinutes = before!.minutes;

    const addedMinutes = 45;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(20, 0, 0, 0);

    const id = await insertPlaySession({
      userId: testUserId,
      userGameId: ugId,
      startedAt: startDate,
      endedAt: new Date(startDate.getTime() + addedMinutes * 60000),
      minutes: addedMinutes,
      platform: "steam",
      device: "PC",
    });

    expect(typeof id).toBe("string");

    // Check minutes updated
    const [after] = await db
      .select({ minutes: userGames.minutesPlayed })
      .from(userGames)
      .where(eq(userGames.id, ugId));

    expect(after!.minutes).toBe(beforeMinutes + addedMinutes);
  });
});

describe("bulkInsertSessions", () => {
  it("inserts multiple sessions and returns count", async () => {
    const startBase = new Date();
    startBase.setDate(startBase.getDate() - 200); // way in the past to avoid conflicts

    const sessions = [0, 1, 2].map((i) => {
      const start = new Date(startBase.getTime() + i * 86400000);
      return {
        userId: testUserId,
        userGameId: testUserGameIds[1]!,
        startedAt: start,
        endedAt: new Date(start.getTime() + 60 * 60000),
        minutes: 60,
        platform: "steam",
        device: "PC",
      };
    });

    const count = await bulkInsertSessions(sessions);
    expect(count).toBe(3);
  });

  it("returns 0 for empty array", async () => {
    const count = await bulkInsertSessions([]);
    expect(count).toBe(0);
  });
});

// ── Platform queries ──────────────────────────────────────────

describe("getUserConnections", () => {
  it("returns empty array for user with no connections", async () => {
    const connections = await getUserConnections(testUserId2);
    expect(connections).toHaveLength(0);
  });
});

describe("upsertConnection + getConnection", () => {
  it("inserts and retrieves a connection", async () => {
    await upsertConnection({
      userId: testUserId,
      platform: "steam",
      platformUid: "steam_test_123",
      displayName: "TestSteamUser",
      syncStatus: "success",
    });

    const conn = await getConnection(testUserId, "steam");
    expect(conn).not.toBeNull();
    expect(conn!.platform).toBe("steam");
    expect(conn!.platformUid).toBe("steam_test_123");
  });

  it("updates on conflict", async () => {
    await upsertConnection({
      userId: testUserId,
      platform: "steam",
      platformUid: "steam_test_456",
      displayName: "UpdatedSteamUser",
      syncStatus: "idle",
    });

    const conn = await getConnection(testUserId, "steam");
    expect(conn!.platformUid).toBe("steam_test_456");
    expect(conn!.displayName).toBe("UpdatedSteamUser");
  });

  it("returns null for non-existent connection", async () => {
    const conn = await getConnection(testUserId, "battlenet");
    expect(conn).toBeNull();
  });
});

describe("updateSyncStatus", () => {
  it("updates sync status", async () => {
    await upsertConnection({
      userId: testUserId,
      platform: "psn",
      platformUid: "psn_test",
      syncStatus: "pending",
    });

    await updateSyncStatus(testUserId, "psn", "syncing");

    const conn = await getConnection(testUserId, "psn");
    expect(conn!.syncStatus).toBe("syncing");
  });

  it("updates sync status with lastSyncedAt", async () => {
    const syncDate = new Date();
    await updateSyncStatus(testUserId, "psn", "success", syncDate);

    const conn = await getConnection(testUserId, "psn");
    expect(conn!.syncStatus).toBe("success");
    expect(conn!.lastSyncedAt).not.toBeNull();
  });
});

describe("deleteConnection", () => {
  it("deletes existing connection", async () => {
    await upsertConnection({
      userId: testUserId,
      platform: "gog",
      platformUid: "gog_test",
      syncStatus: "idle",
    });

    const deleted = await deleteConnection(testUserId, "gog");
    expect(deleted).toBe(true);

    const conn = await getConnection(testUserId, "gog");
    expect(conn).toBeNull();
  });

  it("returns false for non-existent connection", async () => {
    const deleted = await deleteConnection(testUserId, "ea");
    expect(deleted).toBe(false);
  });
});
