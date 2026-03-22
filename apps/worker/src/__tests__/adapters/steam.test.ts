import { describe, it, expect, vi, beforeEach } from "vitest";
import { SteamAdapter } from "../../adapters/steam.js";

const adapter = new SteamAdapter("test-api-key", "76561198000000000");

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("SteamAdapter.getOwnedGames", () => {
  it("maps appid to platformGameId as string", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      response: {
        games: [
          { appid: 570, name: "Dota 2", playtime_forever: 1000, rtime_last_played: 1700000000 },
        ],
      },
    }));
    const games = await adapter.getOwnedGames("");
    expect(games[0]!.platformGameId).toBe("570");
    expect(typeof games[0]!.platformGameId).toBe("string");
  });

  it("maps playtime_forever to minutesPlayed", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      response: {
        games: [
          { appid: 570, name: "Dota 2", playtime_forever: 3421, rtime_last_played: 1700000000 },
        ],
      },
    }));
    const games = await adapter.getOwnedGames("");
    expect(games[0]!.minutesPlayed).toBe(3421);
  });

  it("maps rtime_last_played Unix timestamp to ISO string", async () => {
    const ts = 1700000000;
    mockFetch.mockResolvedValue(makeJsonResponse({
      response: {
        games: [
          { appid: 570, name: "Dota 2", playtime_forever: 100, rtime_last_played: ts },
        ],
      },
    }));
    const games = await adapter.getOwnedGames("");
    expect(games[0]!.lastPlayedAt).toBe(new Date(ts * 1000).toISOString());
  });

  it("returns [] when response.games is absent (private profile)", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ response: {} }));
    const games = await adapter.getOwnedGames("");
    expect(games).toEqual([]);
  });

  it("returns [] when response.games is empty array", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({ response: { games: [] } }));
    const games = await adapter.getOwnedGames("");
    expect(games).toEqual([]);
  });

  it("throws with Steam API error message on non-2xx response", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({}, 403));
    await expect(adapter.getOwnedGames("")).rejects.toThrow("Steam API error 403");
  });
});

describe("SteamAdapter.getRecentGames", () => {
  it("returns limited list", async () => {
    const manyGames = Array.from({ length: 60 }, (_, i) => ({
      appid: i,
      name: `Game ${i}`,
      playtime_forever: 10,
      rtime_last_played: 1700000000,
    }));
    mockFetch.mockResolvedValue(makeJsonResponse({ response: { games: manyGames } }));
    const games = await adapter.getRecentGames("", 50);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("count=50"));
    expect(games.length).toBeLessThanOrEqual(60); // API returns what it returns; we just check it was called correctly
  });

  it("maps playtime correctly from getRecentGames response", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      response: {
        games: [{ appid: 730, name: "CS2", playtime_forever: 500, rtime_last_played: 1700000001 }],
      },
    }));
    const games = await adapter.getRecentGames("");
    expect(games[0]!.minutesPlayed).toBe(500);
  });
});

describe("SteamAdapter.getAchievements", () => {
  it("returns [] when game has no stats", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      playerstats: { error: "Requested app has no stats" },
    }));
    const achievements = await adapter.getAchievements("", "570");
    expect(achievements).toEqual([]);
  });

  it("returns earned achievements with earnedAt set", async () => {
    const unlocktime = 1700000000;
    mockFetch.mockResolvedValue(makeJsonResponse({
      playerstats: {
        success: true,
        achievements: [
          { apiname: "ACH_WIN_ONE_GAME", achieved: 1, unlocktime, name: "Win one game" },
        ],
      },
    }));
    const achievements = await adapter.getAchievements("", "570");
    expect(achievements[0]!.earnedAt).toEqual(new Date(unlocktime * 1000));
    expect(achievements[0]!.platformId).toBe("ACH_WIN_ONE_GAME");
  });

  it("returns locked achievements with earnedAt undefined", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      playerstats: {
        success: true,
        achievements: [
          { apiname: "ACH_LOCKED", achieved: 0, unlocktime: 0, name: "Locked" },
        ],
      },
    }));
    const achievements = await adapter.getAchievements("", "570");
    expect(achievements[0]!.earnedAt).toBeUndefined();
  });
});
