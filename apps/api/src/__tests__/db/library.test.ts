import { describe, it, expect, beforeAll } from "vitest";
import { testUserId, testUserId2, testGameIds, testUserGameIds } from "../setup.js";
import {
  getUserLibrary,
  getRecentlyPlayed,
  getUserGameById,
  upsertUserGame,
  updateUserGame,
  deleteUserGame,
} from "../../db/queries/library.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

// ── getUserLibrary ────────────────────────────────────────────

describe("getUserLibrary", () => {
  it("returns paginated results for user", async () => {
    const result = await getUserLibrary(testUserId, { limit: 10 });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(result.data.length);
    expect(result.data[0]).toHaveProperty("game");
    expect(result.data[0]).toHaveProperty("hoursPlayed");
  });

  it("returns empty array for user with no games", async () => {
    const result = await getUserLibrary(testUserId2, {});
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.nextCursor).toBeNull();
  });

  it("filters by platform", async () => {
    const result = await getUserLibrary(testUserId, { platform: "steam" });
    expect(result.data.every((g) => g.platform === "steam")).toBe(true);
  });

  it("filters by status", async () => {
    const result = await getUserLibrary(testUserId, { status: "completed" });
    expect(result.data.every((g) => g.status === "completed")).toBe(true);
  });

  it("filters by genre", async () => {
    const result = await getUserLibrary(testUserId, { genre: "RPG" });
    expect(result.data.every((g) => g.game.genres.includes("RPG"))).toBe(true);
  });

  it("filters by search query", async () => {
    const result = await getUserLibrary(testUserId, { search: "Alpha" });
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0]!.game.title).toContain("Alpha");
  });

  it("sorts by alpha ascending", async () => {
    const result = await getUserLibrary(testUserId, { sort: "alpha" });
    const titles = result.data.map((g) => g.game.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  it("sorts by hours descending", async () => {
    const result = await getUserLibrary(testUserId, { sort: "hours" });
    const hours = result.data.map((g) => g.minutesPlayed);
    for (let i = 1; i < hours.length; i++) {
      expect(hours[i]!).toBeLessThanOrEqual(hours[i - 1]!);
    }
  });

  it("sorts by progress descending", async () => {
    const result = await getUserLibrary(testUserId, { sort: "progress" });
    const pcts = result.data.map((g) => g.completionPct);
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]!).toBeLessThanOrEqual(pcts[i - 1]!);
    }
  });

  it("paginates with cursor", async () => {
    const first = await getUserLibrary(testUserId, { limit: 2 });
    expect(first.data.length).toBeLessThanOrEqual(2);

    if (first.nextCursor) {
      const second = await getUserLibrary(testUserId, {
        limit: 2,
        cursor: first.nextCursor,
      });
      // IDs should not overlap
      const firstIds = new Set(first.data.map((g) => g.id));
      for (const item of second.data) {
        expect(firstIds.has(item.id)).toBe(false);
      }
    }
  });

  it("respects limit=1", async () => {
    const result = await getUserLibrary(testUserId, { limit: 1 });
    expect(result.data.length).toBe(1);
  });

  it("cursor pagination alpha sort works", async () => {
    const first = await getUserLibrary(testUserId, { sort: "alpha", limit: 2 });
    if (first.nextCursor) {
      const second = await getUserLibrary(testUserId, {
        sort: "alpha",
        limit: 2,
        cursor: first.nextCursor,
      });
      if (second.data.length > 0 && first.data.length > 0) {
        const lastFirst = first.data[first.data.length - 1]!.game.title;
        const firstSecond = second.data[0]!.game.title;
        expect(firstSecond.localeCompare(lastFirst)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("total count is consistent with filter", async () => {
    const all = await getUserLibrary(testUserId, { limit: 100 });
    const steam = await getUserLibrary(testUserId, { platform: "steam", limit: 100 });
    expect(steam.total).toBeLessThanOrEqual(all.total);
  });

  it("hoursPlayed is computed correctly", async () => {
    const result = await getUserLibrary(testUserId, { limit: 5 });
    for (const game of result.data) {
      expect(game.hoursPlayed).toBeCloseTo(game.minutesPlayed / 60, 1);
    }
  });
});

// ── getRecentlyPlayed ─────────────────────────────────────────

describe("getRecentlyPlayed", () => {
  it("returns games with minutes played > 0", async () => {
    const result = await getRecentlyPlayed(testUserId);
    expect(result.every((g) => g.minutesPlayed > 0)).toBe(true);
  });

  it("returns results ordered by lastPlayedAt desc", async () => {
    const result = await getRecentlyPlayed(testUserId, 10);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]!.lastPlayedAt;
      const curr = result[i]!.lastPlayedAt;
      if (prev && curr) {
        expect(new Date(prev).getTime()).toBeGreaterThanOrEqual(new Date(curr).getTime());
      }
    }
  });

  it("respects limit parameter", async () => {
    const result = await getRecentlyPlayed(testUserId, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array for user with no played games", async () => {
    const result = await getRecentlyPlayed(testUserId2);
    expect(result).toHaveLength(0);
  });

  it("each result has complete game object", async () => {
    const result = await getRecentlyPlayed(testUserId, 3);
    for (const item of result) {
      expect(item.game).toBeDefined();
      expect(typeof item.game.title).toBe("string");
    }
  });
});

// ── getUserGameById ───────────────────────────────────────────

describe("getUserGameById", () => {
  it("returns user game by id", async () => {
    const result = await getUserGameById(testUserId, testUserGameIds[0]!);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(testUserGameIds[0]);
    expect(result!.userId).toBe(testUserId);
  });

  it("returns null for wrong userId", async () => {
    const result = await getUserGameById(testUserId2, testUserGameIds[0]!);
    expect(result).toBeNull();
  });

  it("returns null for non-existent id", async () => {
    const result = await getUserGameById(testUserId, "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("includes nested game details", async () => {
    const result = await getUserGameById(testUserId, testUserGameIds[0]!);
    expect(result!.game.id).toBeDefined();
    expect(result!.game.title).toBe("Test Game Alpha");
    expect(result!.game.genres).toContain("RPG");
  });
});

// ── upsertUserGame ────────────────────────────────────────────

describe("upsertUserGame", () => {
  it("inserts new user game", async () => {
    // Use user 2 with game index 0 (not yet used by user 2)
    const id = await upsertUserGame(testUserId2, testGameIds[0]!, {
      platform: "steam",
      platformGameId: "upsert_test_1",
      status: "playing",
      minutesPlayed: 100,
    });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("updates existing entry on conflict (GREATEST for minutes)", async () => {
    // Insert initial
    const id = await upsertUserGame(testUserId2, testGameIds[1]!, {
      platform: "psn",
      platformGameId: "upsert_test_2",
      minutesPlayed: 200,
    });

    // Upsert with lower minutes — should keep 200
    const id2 = await upsertUserGame(testUserId2, testGameIds[1]!, {
      platform: "psn",
      platformGameId: "upsert_test_2",
      minutesPlayed: 50,
    });

    expect(id).toBe(id2);

    const ug = await getUserGameById(testUserId2, id);
    expect(ug!.minutesPlayed).toBe(200);
  });

  it("updates minutes to higher value", async () => {
    const id = await upsertUserGame(testUserId2, testGameIds[2]!, {
      platform: "xbox",
      platformGameId: "upsert_test_3",
      minutesPlayed: 100,
    });

    await upsertUserGame(testUserId2, testGameIds[2]!, {
      platform: "xbox",
      platformGameId: "upsert_test_3",
      minutesPlayed: 500,
    });

    const ug = await getUserGameById(testUserId2, id);
    expect(ug!.minutesPlayed).toBe(500);
  });
});

// ── updateUserGame ────────────────────────────────────────────

describe("updateUserGame", () => {
  it("updates status field", async () => {
    const result = await updateUserGame(testUserId, testUserGameIds[2]!, {
      status: "playing",
    });
    expect(result).not.toBeNull();
    expect(result!.status).toBe("playing");
  });

  it("updates userRating", async () => {
    const result = await updateUserGame(testUserId, testUserGameIds[0]!, {
      userRating: 7,
    });
    expect(result!.userRating).toBe(7);
  });

  it("returns null for wrong userId", async () => {
    const result = await updateUserGame(testUserId2, testUserGameIds[0]!, {
      status: "completed",
    });
    expect(result).toBeNull();
  });

  it("updates userNotes", async () => {
    const result = await updateUserGame(testUserId, testUserGameIds[1]!, {
      userNotes: "Updated notes",
    });
    expect(result!.userNotes).toBe("Updated notes");
  });
});

// ── deleteUserGame ────────────────────────────────────────────

describe("deleteUserGame", () => {
  it("deletes existing user game", async () => {
    // First insert one to delete
    const id = await upsertUserGame(testUserId2, testGameIds[4]!, {
      platform: "gog",
      platformGameId: "delete_test_1",
    });

    const deleted = await deleteUserGame(testUserId2, id);
    expect(deleted).toBe(true);

    const check = await getUserGameById(testUserId2, id);
    expect(check).toBeNull();
  });

  it("returns false for non-existent game", async () => {
    const deleted = await deleteUserGame(testUserId, "00000000-0000-0000-0000-000000000000");
    expect(deleted).toBe(false);
  });

  it("returns false when wrong userId", async () => {
    const deleted = await deleteUserGame(testUserId2, testUserGameIds[0]!);
    expect(deleted).toBe(false);
  });
});
