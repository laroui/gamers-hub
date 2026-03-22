import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Supertest from "supertest";
import Fastify from "fastify";
import { registerPlugins } from "../../plugins/index.js";
import { registerRoutes } from "../../routes/index.js";
import { closeRedis, cacheDel, cacheDelPattern } from "../../db/redis.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: ReturnType<typeof Fastify<any, any, any, any, any>>;
let token: string;
let token2: string;
let testUserId: string;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await registerPlugins(app);
  await registerRoutes(app);
  await app.ready();

  const res1 = await Supertest(app.server)
    .post("/api/v1/auth/login")
    .send({ email: "testuser1@test.com", password: "testpassword" });
  token = res1.body.accessToken as string;
  // Decode userId from JWT payload (base64 middle segment)
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1]!, "base64url").toString(),
  ) as { userId: string };
  testUserId = payload.userId;

  const res2 = await Supertest(app.server)
    .post("/api/v1/auth/login")
    .send({ email: "testuser2@test.com", password: "testpassword" });
  token2 = res2.body.accessToken as string;
});

afterAll(async () => {
  await app.close();
  await closeRedis();
});

// ── GET /api/v1/stats/overview ────────────────────────────────

describe("GET /api/v1/stats/overview", () => {
  it("returns LibraryStats shape", async () => {
    await cacheDel(`library_stats:${testUserId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.totalGames).toBe("number");
    expect(typeof res.body.totalMinutes).toBe("number");
    expect(typeof res.body.totalHours).toBe("number");
    expect(typeof res.body.completedGames).toBe("number");
    expect(typeof res.body.currentlyPlaying).toBe("number");
    expect(typeof res.body.completionRate).toBe("number");
    expect(typeof res.body.platformBreakdown).toBe("object");
    expect(typeof res.body.genreBreakdown).toBe("object");
    expect(typeof res.body.deltaThisWeek).toBe("object");
  });

  it("totalGames is 5 for seeded testUser1", async () => {
    await cacheDel(`library_stats:${testUserId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalGames).toBe(5);
  });

  it("serves from cache on second call", async () => {
    await cacheDel(`library_stats:${testUserId}`);
    // First call — populates cache
    await Supertest(app.server)
      .get("/api/v1/stats/overview")
      .set("Authorization", `Bearer ${token}`);
    // Second call — from cache
    const res = await Supertest(app.server)
      .get("/api/v1/stats/overview")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalGames).toBe(5);
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/overview");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/stats/heatmap ─────────────────────────────────

describe("GET /api/v1/stats/heatmap", () => {
  const currentYear = new Date().getFullYear();

  it("returns Record<string, number> for current year", async () => {
    await cacheDelPattern(`heatmap:${testUserId}:*`);
    const res = await Supertest(app.server)
      .get(`/api/v1/stats/heatmap?year=${currentYear}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    // Seed has sessions in current year — at least one entry
    const entries = Object.entries(res.body);
    expect(entries.length).toBeGreaterThan(0);
    // Keys are YYYY-MM-DD, values are numbers
    const [day, minutes] = entries[0]!;
    expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof minutes).toBe("number");
  });

  it("returns empty object for year with no sessions (2000)", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/stats/heatmap?year=2000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).length).toBe(0);
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/heatmap");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/stats/streaks ─────────────────────────────────

describe("GET /api/v1/stats/streaks", () => {
  it("returns { current, longest, totalDays }", async () => {
    await cacheDel(`streaks:${testUserId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/streaks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.current).toBe("number");
    expect(typeof res.body.longest).toBe("number");
    expect(typeof res.body.totalDays).toBe("number");
  });

  it("totalDays > 0 for testUser1 (has sessions)", async () => {
    await cacheDel(`streaks:${testUserId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/streaks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalDays).toBeGreaterThan(0);
  });

  it("zero streaks for testUser2 (no sessions)", async () => {
    const payload2 = JSON.parse(
      Buffer.from(token2.split(".")[1]!, "base64url").toString(),
    ) as { userId: string };
    await cacheDel(`streaks:${payload2.userId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/streaks")
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.current).toBe(0);
    expect(res.body.longest).toBe(0);
    expect(res.body.totalDays).toBe(0);
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/streaks");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/stats/weekly ──────────────────────────────────

describe("GET /api/v1/stats/weekly", () => {
  it("returns array of WeeklyPlaytime", async () => {
    await cacheDelPattern(`weekly_playtime:${testUserId}:*`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/weekly")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const entry = res.body[0];
      expect(typeof entry.week).toBe("string");
      expect(typeof entry.minutes).toBe("number");
      expect(typeof entry.games).toBe("number");
    }
  });

  it("respects weeks param — fewer results than default 12 weeks", async () => {
    const [res12, res2] = await Promise.all([
      Supertest(app.server)
        .get("/api/v1/stats/weekly?weeks=12")
        .set("Authorization", `Bearer ${token}`),
      Supertest(app.server)
        .get("/api/v1/stats/weekly?weeks=2")
        .set("Authorization", `Bearer ${token}`),
    ]);

    expect(res12.status).toBe(200);
    expect(res2.status).toBe(200);
    // Shorter window returns fewer or equal week buckets
    expect(res2.body.length).toBeLessThanOrEqual(res12.body.length);
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/weekly");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/stats/platforms ───────────────────────────────

describe("GET /api/v1/stats/platforms", () => {
  it("returns array with platform breakdown", async () => {
    await cacheDelPattern(`playtime_platform:${testUserId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/platforms")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const entry = res.body[0];
    expect(typeof entry.platform).toBe("string");
    expect(typeof entry.minutes).toBe("number");
    expect(typeof entry.games).toBe("number");
  });

  it("returns empty array for testUser2 (no sessions)", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/stats/platforms")
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/platforms");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/stats/genres ──────────────────────────────────

describe("GET /api/v1/stats/genres", () => {
  it("returns array with genre breakdown", async () => {
    await cacheDelPattern(`playtime_genre:${testUserId}`);
    const res = await Supertest(app.server)
      .get("/api/v1/stats/genres")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const entry = res.body[0];
    expect(typeof entry.genre).toBe("string");
    expect(typeof entry.minutes).toBe("number");
    expect(typeof entry.games).toBe("number");
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/genres");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/stats/wrapped ─────────────────────────────────

describe("GET /api/v1/stats/wrapped", () => {
  const currentYear = new Date().getFullYear();

  it("returns GamingWrapped shape for current year", async () => {
    await cacheDelPattern(`wrapped:${testUserId}:*`);
    const res = await Supertest(app.server)
      .get(`/api/v1/stats/wrapped?year=${currentYear}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(currentYear);
    expect(typeof res.body.totalHours).toBe("number");
    expect(typeof res.body.totalGames).toBe("number");
    expect(typeof res.body.newGames).toBe("number");
    expect(typeof res.body.completedGames).toBe("number");
    expect("topGame" in res.body).toBe(true);
    expect("topGenre" in res.body).toBe(true);
    expect("topPlatform" in res.body).toBe(true);
    expect("longestSession" in res.body).toBe(true);
    expect("favoriteDay" in res.body).toBe(true);
    expect(typeof res.body.lateNightGamer).toBe("boolean");
  });

  it("totalHours > 0 for testUser1 (has sessions)", async () => {
    await cacheDelPattern(`wrapped:${testUserId}:*`);
    const res = await Supertest(app.server)
      .get(`/api/v1/stats/wrapped?year=${currentYear}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalHours).toBeGreaterThan(0);
  });

  it("returns zero-data wrapped for user2 (no sessions)", async () => {
    const res = await Supertest(app.server)
      .get(`/api/v1/stats/wrapped?year=${currentYear}`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.totalHours).toBe(0);
    expect(res.body.totalGames).toBe(0);
  });

  it("wrapped for past year with no sessions returns zero totals", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/stats/wrapped?year=2000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2000);
    expect(res.body.totalHours).toBe(0);
  });

  it("returns 401 without token", async () => {
    const res = await Supertest(app.server).get("/api/v1/stats/wrapped");
    expect(res.status).toBe(401);
  });
});
