import { describe, it, expect, beforeAll, afterAll, vi, type MockInstance } from "vitest";
import Supertest from "supertest";
import Fastify from "fastify";
import { registerPlugins } from "../../plugins/index.js";
import { registerRoutes } from "../../routes/index.js";
import { closeRedis, cacheDelPattern } from "../../db/redis.js";
import { db } from "../../db/client.js";
import { achievements } from "../../db/schema.js";
import { testGameIds, testUserGameIds } from "../setup.js";

// Mock IGDB service before app is created
vi.mock("../../services/igdb.js", () => ({
  searchIgdb: vi.fn().mockResolvedValue([]),
  getIgdbGame: vi.fn().mockResolvedValue(null),
  getIgdbToken: vi.fn().mockResolvedValue("mock-token"),
}));

// Mock cover service
vi.mock("../../services/cover.js", () => ({
  resolveCoverUrl: vi.fn().mockResolvedValue(null),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: ReturnType<typeof Fastify<any, any, any, any, any>>;
let token: string;

let mockSearchIgdb: MockInstance;
let mockGetIgdbGame: MockInstance;
let mockResolveCoverUrl: MockInstance;

beforeAll(async () => {
  // Import mocks after vi.mock is set up
  const igdbModule = await import("../../services/igdb.js");
  const coverModule = await import("../../services/cover.js");
  mockSearchIgdb = igdbModule.searchIgdb as unknown as MockInstance;
  mockGetIgdbGame = igdbModule.getIgdbGame as unknown as MockInstance;
  mockResolveCoverUrl = coverModule.resolveCoverUrl as unknown as MockInstance;

  app = Fastify({ logger: false });
  await registerPlugins(app);
  await registerRoutes(app);
  await app.ready();

  // Clear IGDB search caches so mock calls are not skipped by cached results
  await cacheDelPattern("igdb_search:*");

  const res = await Supertest(app.server)
    .post("/api/v1/auth/login")
    .send({ email: "testuser1@test.com", password: "testpassword" });
  token = res.body.accessToken as string;

  // Insert a test achievement for user game 0 (testUser1's alpha game)
  await db.insert(achievements).values({
    userGameId: testUserGameIds[0]!,
    platformId: "ACH_TEST_001",
    title: "Test Achievement",
    description: "Earned in tests",
    iconUrl: null,
    earnedAt: new Date("2024-01-01"),
    rarityPct: 42.5,
    points: 50,
  });
});

afterAll(async () => {
  await app.close();
  await closeRedis();
});

// ── GET /api/v1/games/search?q= ───────────────────────────────

describe("GET /api/v1/games/search", () => {
  it("returns local catalog results for known game", async () => {
    mockSearchIgdb.mockResolvedValueOnce([]);

    const res = await Supertest(app.server)
      .get("/api/v1/games/search?q=Test+Game+Alpha")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some((g: { title: string }) => g.title.includes("Alpha"))).toBe(true);
  });

  it("calls IGDB when local has no match", async () => {
    const igdbGame = {
      id: "99999",
      igdbId: 99999,
      title: "Nonexistent IGDB Game",
      coverUrl: null,
      backgroundUrl: null,
      genres: ["RPG"],
      platforms: [],
      releaseYear: 2020,
      metacritic: null,
      description: null,
    };
    mockSearchIgdb.mockResolvedValueOnce([igdbGame]);

    const res = await Supertest(app.server)
      .get("/api/v1/games/search?q=zzz_unique_no_match_xyz")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockSearchIgdb).toHaveBeenCalled();
    expect(res.body.some((g: { title: string }) => g.title === "Nonexistent IGDB Game")).toBe(
      true,
    );
  });

  it("deduplicates results that appear in both local and IGDB", async () => {
    // Return IGDB game with same igdbId as local "Test Game Beta" (igdbId=9900002)
    const igdbDuplicate = {
      id: "9900002",
      igdbId: 9900002,
      title: "Test Game Beta",
      coverUrl: null,
      backgroundUrl: null,
      genres: ["FPS"],
      platforms: [],
      releaseYear: 2021,
      metacritic: 85,
      description: null,
    };
    mockSearchIgdb.mockResolvedValueOnce([igdbDuplicate]);

    const res = await Supertest(app.server)
      .get("/api/v1/games/search?q=Test+Game+Beta")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Should only appear once despite being in both sources
    const betas = res.body.filter((g: { igdbId: number }) => g.igdbId === 9900002);
    expect(betas.length).toBe(1);
  });

  it("returns 400 when q is missing", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/games/search")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("returns 400 when q is 1 character", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/games/search?q=a")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("returns cached results on second call — IGDB not called again", async () => {
    mockSearchIgdb.mockResolvedValue([]);
    const callsBefore = mockSearchIgdb.mock.calls.length;

    // Use a unique query to avoid cache hits from other tests
    const uniqueQ = "Test+Game+Gamma+unique123";
    await Supertest(app.server)
      .get(`/api/v1/games/search?q=${uniqueQ}`)
      .set("Authorization", `Bearer ${token}`);

    const callsAfterFirst = mockSearchIgdb.mock.calls.length;

    await Supertest(app.server)
      .get(`/api/v1/games/search?q=${uniqueQ}`)
      .set("Authorization", `Bearer ${token}`);

    // IGDB should not be called on the second request (cached)
    expect(mockSearchIgdb.mock.calls.length).toBe(callsAfterFirst);
    expect(callsAfterFirst).toBeGreaterThan(callsBefore); // was called on first
  });

  it("returns local results even when IGDB throws", async () => {
    mockSearchIgdb.mockRejectedValueOnce(new Error("IGDB unavailable"));

    const res = await Supertest(app.server)
      .get("/api/v1/games/search?q=Test+Game+Delta")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Local results still returned
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── GET /api/v1/games/:id ──────────────────────────────────────

describe("GET /api/v1/games/:id", () => {
  it("returns game for valid id", async () => {
    const id = testGameIds[0];
    const res = await Supertest(app.server)
      .get(`/api/v1/games/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBeDefined();
  });

  it("returns 404 for unknown id", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/games/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NotFound");
  });

  it("lazily resolves coverUrl if missing (mock resolveCoverUrl)", async () => {
    // Test Game Gamma has no coverUrl
    const gammaId = testGameIds[2];
    const resolvedUrl = "http://localhost:9000/covers/test-cover.jpg";
    mockResolveCoverUrl.mockResolvedValueOnce(resolvedUrl);
    mockGetIgdbGame.mockResolvedValueOnce(null);

    const res = await Supertest(app.server)
      .get(`/api/v1/games/${gammaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.coverUrl).toBe(resolvedUrl);
  });
});

// ── GET /api/v1/games/:id/achievements ───────────────────────

describe("GET /api/v1/games/:id/achievements", () => {
  it("returns achievement array for user's game", async () => {
    const gameId = testGameIds[0]; // alpha — testUser1 has this
    const res = await Supertest(app.server)
      .get(`/api/v1/games/${gameId}/achievements`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].platformId).toBe("ACH_TEST_001");
    expect(res.body[0].isEarned).toBe(true);
    expect(res.body[0].earnedAt).toBeDefined();
  });

  it("returns [] when game not in user's library", async () => {
    const gameId = testGameIds[0];
    // testUser2 doesn't have this game
    const res2 = await Supertest(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "testuser2@test.com", password: "testpassword" });
    const token2 = res2.body.accessToken as string;

    const res = await Supertest(app.server)
      .get(`/api/v1/games/${gameId}/achievements`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
