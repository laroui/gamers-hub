import { describe, it, expect, vi, beforeEach } from "vitest";
import { EpicAdapter } from "../../adapters/epic.js";

const adapter = new EpicAdapter("test-client-id", "test-client-secret");

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

describe("EpicAdapter.getAuthUrl", () => {
  it("includes correct scopes", () => {
    const url = adapter.getAuthUrl("state123", "http://localhost/callback");
    expect(url).toContain("basic_profile");
    expect(url).toContain("friends_list");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("state=state123");
  });
});

describe("EpicAdapter.exchangeCode", () => {
  it("uses Basic auth header with base64 credentials", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      access_token: "at",
      refresh_token: "rt",
      expires_in: 3600,
    }));
    await adapter.exchangeCode("code123", "http://localhost/callback");
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const authHeader = (opts.headers as Record<string, string>)["Authorization"];
    const expectedBasic = Buffer.from("test-client-id:test-client-secret").toString("base64");
    expect(authHeader).toBe(`Basic ${expectedBasic}`);
  });
});

describe("EpicAdapter.getOwnedGames", () => {
  it("maps catalogItemId to platformGameId", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      records: [
        { catalogItemId: "abc123", appName: "SomeApp", metadata: { title: "My Epic Game" } },
      ],
    }));
    const games = await adapter.getOwnedGames("access-token");
    expect(games[0]!.platformGameId).toBe("abc123");
  });

  it("prefers metadata.title over appName", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      records: [
        { catalogItemId: "abc123", appName: "RawAppName", metadata: { title: "Display Title" } },
      ],
    }));
    const games = await adapter.getOwnedGames("access-token");
    expect(games[0]!.title).toBe("Display Title");
  });

  it("falls back to appName when metadata.title is absent", async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({
      records: [
        { catalogItemId: "abc123", appName: "FallbackName" },
      ],
    }));
    const games = await adapter.getOwnedGames("access-token");
    expect(games[0]!.title).toBe("FallbackName");
  });
});

describe("EpicAdapter.getRecentGames", () => {
  it("always returns empty array", async () => {
    const games = await adapter.getRecentGames("access-token");
    expect(games).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
