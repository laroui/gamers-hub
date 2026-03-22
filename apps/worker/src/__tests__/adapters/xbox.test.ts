import { describe, it, expect, vi, beforeEach } from "vitest";
import { XboxAdapter } from "../../adapters/xbox.js";

const adapter = new XboxAdapter("test-client-id", "test-client-secret");

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

function xblMock() {
  return makeJsonResponse({
    Token: "xbl-token",
    DisplayClaims: { xui: [{ uhs: "user-hash", xid: "xuid-123" }] },
  });
}

function xstsMock() {
  return makeJsonResponse({
    Token: "xsts-token",
    DisplayClaims: { xui: [{ uhs: "user-hash", xid: "xuid-123" }] },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("XboxAdapter.getAuthUrl", () => {
  it("includes client_id, scope, and state params", () => {
    const url = adapter.getAuthUrl("test-state", "http://localhost/callback");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("XboxLive.signin");
    expect(url).toContain("state=test-state");
  });
});

describe("XboxAdapter.exchangeCode", () => {
  it("POSTs form body with authorization_code grant", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
    }));
    await adapter.exchangeCode("code123", "http://localhost/callback");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(opts.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code123");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");
  });

  it("returns correct TokenSet shape", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      access_token: "at",
      refresh_token: "rt",
      expires_in: 3600,
    }));
    const tokens = await adapter.exchangeCode("code", "http://localhost/callback");
    expect(tokens.accessToken).toBe("at");
    expect(tokens.refreshToken).toBe("rt");
    expect(tokens.expiresAt).toBeInstanceOf(Date);
  });
});

describe("XboxAdapter.refreshAccessToken", () => {
  it("uses refresh_token grant type", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      access_token: "new-at",
      refresh_token: "new-rt",
      expires_in: 3600,
    }));
    await adapter.refreshAccessToken("old-refresh-token");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(opts.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old-refresh-token");
  });
});

describe("XboxAdapter.getOwnedGames", () => {
  it("performs XBL + XSTS exchange before API call", async () => {
    mockFetch
      .mockResolvedValueOnce(xblMock())  // XBL
      .mockResolvedValueOnce(xstsMock()) // XSTS
      .mockResolvedValueOnce(makeJsonResponse({ titles: [] })); // titlehub

    await adapter.getOwnedGames("msal-token");
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect((mockFetch.mock.calls[0] as [string])[0]).toContain("user.auth.xboxlive.com");
    expect((mockFetch.mock.calls[1] as [string])[0]).toContain("xsts.auth.xboxlive.com");
  });

  it("maps titleId and name correctly", async () => {
    mockFetch
      .mockResolvedValueOnce(xblMock())
      .mockResolvedValueOnce(xstsMock())
      .mockResolvedValueOnce(makeJsonResponse({
        titles: [
          {
            titleId: "1234567890",
            name: "Halo Infinite",
            achievement: { currentGamerscore: 100, totalGamerscore: 1000 },
            titleHistory: { lastTimePlayed: "2024-01-01T12:00:00Z" },
          },
        ],
      }));

    const games = await adapter.getOwnedGames("msal-token");
    expect(games[0]!.platformGameId).toBe("1234567890");
    expect(games[0]!.title).toBe("Halo Infinite");
    expect(games[0]!.achievementsEarned).toBe(100);
    expect(games[0]!.achievementsTotal).toBe(1000);
  });

  it("returns [] on empty titles response", async () => {
    mockFetch
      .mockResolvedValueOnce(xblMock())
      .mockResolvedValueOnce(xstsMock())
      .mockResolvedValueOnce(makeJsonResponse({ titles: [] }));

    const games = await adapter.getOwnedGames("msal-token");
    expect(games).toEqual([]);
  });
});

describe("XboxAdapter.getAchievements", () => {
  it("includes rarityPct from rarityPercentage field", async () => {
    mockFetch
      .mockResolvedValueOnce(xblMock())
      .mockResolvedValueOnce(xstsMock())
      .mockResolvedValueOnce(makeJsonResponse({
        achievements: [
          {
            id: "1",
            name: "First Win",
            description: "Win your first match",
            isUnlocked: true,
            timeUnlocked: "2024-01-01T00:00:00Z",
            rarityPercentage: 42.5,
          },
        ],
      }));

    const achievements = await adapter.getAchievements("msal-token", "12345");
    expect(achievements[0]!.rarityPct).toBe(42.5);
    expect(achievements[0]!.earnedAt).toBeInstanceOf(Date);
  });
});
