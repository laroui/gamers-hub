import { describe, it, expect } from "vitest";
import { testUserId, testUserId2, testGameIds } from "../setup.js";
import {
  getLibraryStats,
  getPlayHeatmap,
  getPlayStreaks,
  getWeeklyPlaytime,
  getPlaytimeByPlatform,
  getPlaytimeByGenre,
  getGamingWrapped,
} from "../../db/queries/stats.js";

// ── getLibraryStats ───────────────────────────────────────────

describe("getLibraryStats", () => {
  it("returns correct totalGames for user with games", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(stats.totalGames).toBe(5);
  });

  it("returns zero stats for user with no games", async () => {
    const stats = await getLibraryStats(testUserId2);
    expect(stats.totalGames).toBe(0);
    expect(stats.totalMinutes).toBe(0);
    expect(stats.totalHours).toBe(0);
  });

  it("totalMinutes is sum of all minutesPlayed", async () => {
    const stats = await getLibraryStats(testUserId);
    // We know from setup: 3600 + 1800 + 120 + 0 + 60 = 5580
    expect(stats.totalMinutes).toBe(5580);
  });

  it("totalHours is derived from totalMinutes", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(stats.totalHours).toBeCloseTo(stats.totalMinutes / 60, 1);
  });

  it("completedGames counts status=completed", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(stats.completedGames).toBe(1);
  });

  it("currentlyPlaying counts status=playing", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(stats.currentlyPlaying).toBe(1);
  });

  it("completionRate is percentage", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(stats.completionRate).toBeGreaterThanOrEqual(0);
    expect(stats.completionRate).toBeLessThanOrEqual(100);
  });

  it("platformBreakdown contains platforms used", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(Object.keys(stats.platformBreakdown).length).toBeGreaterThan(0);
    // User 1 has steam, psn, nintendo, xbox entries
    const sum = Object.values(stats.platformBreakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(5);
  });

  it("genreBreakdown contains genres", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(Object.keys(stats.genreBreakdown).length).toBeGreaterThan(0);
    // RPG appears in games 0, 3 (Alpha, Delta)
    expect(stats.genreBreakdown["RPG"]).toBeGreaterThan(0);
  });

  it("deltaThisWeek has newGames and minutesPlayed", async () => {
    const stats = await getLibraryStats(testUserId);
    expect(stats.deltaThisWeek).toHaveProperty("newGames");
    expect(stats.deltaThisWeek).toHaveProperty("minutesPlayed");
    expect(typeof stats.deltaThisWeek.newGames).toBe("number");
    expect(typeof stats.deltaThisWeek.minutesPlayed).toBe("number");
  });

  it("deltaThisWeek.minutesPlayed reflects sessions in last 7 days", async () => {
    const stats = await getLibraryStats(testUserId);
    // We inserted sessions for ~40 days out of 60
    // Sessions from last 7 days should be > 0
    expect(stats.deltaThisWeek.minutesPlayed).toBeGreaterThan(0);
  });
});

// ── getPlayHeatmap ────────────────────────────────────────────

describe("getPlayHeatmap", () => {
  const currentYear = new Date().getFullYear();

  it("returns object keyed by date strings", async () => {
    const heatmap = await getPlayHeatmap(testUserId, currentYear);
    for (const key of Object.keys(heatmap)) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("values are positive integers (minutes)", async () => {
    const heatmap = await getPlayHeatmap(testUserId, currentYear);
    for (const val of Object.values(heatmap)) {
      expect(val).toBeGreaterThan(0);
    }
  });

  it("has entries for user with sessions", async () => {
    const heatmap = await getPlayHeatmap(testUserId, currentYear);
    expect(Object.keys(heatmap).length).toBeGreaterThan(0);
  });

  it("returns empty for user with no sessions", async () => {
    const heatmap = await getPlayHeatmap(testUserId2, currentYear);
    expect(Object.keys(heatmap)).toHaveLength(0);
  });

  it("returns empty for year with no data", async () => {
    const heatmap = await getPlayHeatmap(testUserId, 1990);
    expect(Object.keys(heatmap)).toHaveLength(0);
  });

  it("all dates are within requested year", async () => {
    const heatmap = await getPlayHeatmap(testUserId, currentYear);
    for (const key of Object.keys(heatmap)) {
      expect(key.startsWith(String(currentYear))).toBe(true);
    }
  });
});

// ── getPlayStreaks ────────────────────────────────────────────

describe("getPlayStreaks", () => {
  it("returns streak object with required fields", async () => {
    const streaks = await getPlayStreaks(testUserId);
    expect(streaks).toHaveProperty("current");
    expect(streaks).toHaveProperty("longest");
    expect(streaks).toHaveProperty("totalDays");
  });

  it("totalDays is positive for user with sessions", async () => {
    const streaks = await getPlayStreaks(testUserId);
    expect(streaks.totalDays).toBeGreaterThan(0);
  });

  it("longest streak is >= current streak", async () => {
    const streaks = await getPlayStreaks(testUserId);
    expect(streaks.longest).toBeGreaterThanOrEqual(streaks.current);
  });

  it("all values are non-negative integers", async () => {
    const streaks = await getPlayStreaks(testUserId);
    expect(streaks.current).toBeGreaterThanOrEqual(0);
    expect(streaks.longest).toBeGreaterThanOrEqual(0);
    expect(streaks.totalDays).toBeGreaterThanOrEqual(0);
  });

  it("returns zero streaks for user with no sessions", async () => {
    const streaks = await getPlayStreaks(testUserId2);
    expect(streaks.current).toBe(0);
    expect(streaks.longest).toBe(0);
    expect(streaks.totalDays).toBe(0);
  });
});

// ── getWeeklyPlaytime ─────────────────────────────────────────

describe("getWeeklyPlaytime", () => {
  it("returns array of weekly data", async () => {
    const weekly = await getWeeklyPlaytime(testUserId);
    expect(Array.isArray(weekly)).toBe(true);
  });

  it("each entry has week, minutes, games fields", async () => {
    const weekly = await getWeeklyPlaytime(testUserId, 12);
    for (const item of weekly) {
      expect(item).toHaveProperty("week");
      expect(item).toHaveProperty("minutes");
      expect(item).toHaveProperty("games");
    }
  });

  it("week string matches ISO week format", async () => {
    const weekly = await getWeeklyPlaytime(testUserId, 12);
    for (const item of weekly) {
      expect(item.week).toMatch(/^\d{4}-W\d{2}$/);
    }
  });

  it("minutes are positive", async () => {
    const weekly = await getWeeklyPlaytime(testUserId, 12);
    for (const item of weekly) {
      expect(item.minutes).toBeGreaterThan(0);
    }
  });

  it("returns empty array for user with no sessions", async () => {
    const weekly = await getWeeklyPlaytime(testUserId2, 4);
    expect(weekly).toHaveLength(0);
  });

  it("respects weeks parameter", async () => {
    const w4 = await getWeeklyPlaytime(testUserId, 4);
    const w12 = await getWeeklyPlaytime(testUserId, 12);
    // 4 weeks should have <= entries than 12 weeks
    expect(w4.length).toBeLessThanOrEqual(w12.length);
  });
});

// ── getPlaytimeByPlatform ─────────────────────────────────────

describe("getPlaytimeByPlatform", () => {
  it("returns array with platform data", async () => {
    const data = await getPlaytimeByPlatform(testUserId);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each entry has platform, minutes, games", async () => {
    const data = await getPlaytimeByPlatform(testUserId);
    for (const item of data) {
      expect(item).toHaveProperty("platform");
      expect(item).toHaveProperty("minutes");
      expect(item).toHaveProperty("games");
    }
  });

  it("sorted by minutes descending", async () => {
    const data = await getPlaytimeByPlatform(testUserId);
    for (let i = 1; i < data.length; i++) {
      expect(data[i]!.minutes).toBeLessThanOrEqual(data[i - 1]!.minutes);
    }
  });

  it("returns empty for user with no sessions", async () => {
    const data = await getPlaytimeByPlatform(testUserId2);
    expect(data).toHaveLength(0);
  });
});

// ── getPlaytimeByGenre ────────────────────────────────────────

describe("getPlaytimeByGenre", () => {
  it("returns array with genre data", async () => {
    const data = await getPlaytimeByGenre(testUserId);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each entry has genre, minutes, games", async () => {
    const data = await getPlaytimeByGenre(testUserId);
    for (const item of data) {
      expect(item).toHaveProperty("genre");
      expect(item).toHaveProperty("minutes");
      expect(item).toHaveProperty("games");
    }
  });

  it("genres are non-empty strings", async () => {
    const data = await getPlaytimeByGenre(testUserId);
    for (const item of data) {
      expect(typeof item.genre).toBe("string");
      expect(item.genre.length).toBeGreaterThan(0);
    }
  });

  it("returns empty for user with no sessions", async () => {
    const data = await getPlaytimeByGenre(testUserId2);
    expect(data).toHaveLength(0);
  });
});

// ── getGamingWrapped ──────────────────────────────────────────

describe("getGamingWrapped", () => {
  const currentYear = new Date().getFullYear();

  it("returns wrapped object with required fields", async () => {
    const wrapped = await getGamingWrapped(testUserId, currentYear);
    expect(wrapped).toHaveProperty("year");
    expect(wrapped).toHaveProperty("totalHours");
    expect(wrapped).toHaveProperty("totalGames");
    expect(wrapped).toHaveProperty("newGames");
    expect(wrapped).toHaveProperty("completedGames");
    expect(wrapped).toHaveProperty("topGame");
    expect(wrapped).toHaveProperty("topGenre");
    expect(wrapped).toHaveProperty("topPlatform");
    expect(wrapped).toHaveProperty("longestSession");
    expect(wrapped).toHaveProperty("favoriteDay");
    expect(wrapped).toHaveProperty("lateNightGamer");
  });

  it("year field matches requested year", async () => {
    const wrapped = await getGamingWrapped(testUserId, currentYear);
    expect(wrapped.year).toBe(currentYear);
  });

  it("totalHours is positive for user with sessions", async () => {
    const wrapped = await getGamingWrapped(testUserId, currentYear);
    expect(wrapped.totalHours).toBeGreaterThan(0);
  });

  it("topGame has title, coverUrl, hours", async () => {
    const wrapped = await getGamingWrapped(testUserId, currentYear);
    if (wrapped.topGame) {
      expect(wrapped.topGame).toHaveProperty("title");
      expect(wrapped.topGame).toHaveProperty("coverUrl");
      expect(wrapped.topGame).toHaveProperty("hours");
      expect(wrapped.topGame.hours).toBeGreaterThan(0);
    }
  });

  it("longestSession has gameTitle, hours, date", async () => {
    const wrapped = await getGamingWrapped(testUserId, currentYear);
    if (wrapped.longestSession) {
      expect(wrapped.longestSession).toHaveProperty("gameTitle");
      expect(wrapped.longestSession).toHaveProperty("hours");
      expect(wrapped.longestSession).toHaveProperty("date");
      expect(wrapped.longestSession.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("lateNightGamer is boolean", async () => {
    const wrapped = await getGamingWrapped(testUserId, currentYear);
    expect(typeof wrapped.lateNightGamer).toBe("boolean");
  });

  it("returns empty wrapped for year with no data", async () => {
    const wrapped = await getGamingWrapped(testUserId, 1990);
    expect(wrapped.totalHours).toBe(0);
    expect(wrapped.totalGames).toBe(0);
    expect(wrapped.topGame).toBeNull();
    expect(wrapped.longestSession).toBeNull();
  });

  it("returns minimal data for user with no sessions", async () => {
    const wrapped = await getGamingWrapped(testUserId2, currentYear);
    expect(wrapped.totalHours).toBe(0);
    expect(wrapped.topGame).toBeNull();
    expect(wrapped.topGenre).toBeNull();
    expect(wrapped.topPlatform).toBeNull();
  });
});
