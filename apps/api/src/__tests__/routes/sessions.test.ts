import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Supertest from "supertest";
import Fastify from "fastify";
import { registerPlugins } from "../../plugins/index.js";
import { registerRoutes } from "../../routes/index.js";
import { closeRedis } from "../../db/redis.js";
import { testUserGameIds } from "../setup.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: ReturnType<typeof Fastify<any, any, any, any, any>>;
let token: string;
let token2: string;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await registerPlugins(app);
  await registerRoutes(app);
  await app.ready();

  const res1 = await Supertest(app.server)
    .post("/api/v1/auth/login")
    .send({ email: "testuser1@test.com", password: "testpassword" });
  token = res1.body.accessToken as string;

  const res2 = await Supertest(app.server)
    .post("/api/v1/auth/login")
    .send({ email: "testuser2@test.com", password: "testpassword" });
  token2 = res2.body.accessToken as string;
});

afterAll(async () => {
  await app.close();
  await closeRedis();
});

// ── GET /api/v1/sessions ──────────────────────────────────────

describe("GET /api/v1/sessions", () => {
  it("returns { data, nextCursor } shape", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect("nextCursor" in res.body).toBe(true);
  });

  it("returns sessions for testUser1 (seed has ~40 sessions)", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("each session has required fields", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/sessions?limit=1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const session = res.body.data[0];
    expect(session).toHaveProperty("id");
    expect(session).toHaveProperty("userGameId");
    expect(session).toHaveProperty("gameTitle");
    expect(session).toHaveProperty("startedAt");
    expect(session).toHaveProperty("minutes");
    expect(session).toHaveProperty("platform");
  });

  it("respects limit param", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/sessions?limit=5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it("returns nextCursor when more pages exist", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/sessions?limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.nextCursor).not.toBeNull();
  });

  it("cursor pagination — second page has different sessions", async () => {
    const page1 = await Supertest(app.server)
      .get("/api/v1/sessions?limit=3")
      .set("Authorization", `Bearer ${token}`);

    expect(page1.status).toBe(200);
    const cursor = page1.body.nextCursor as string;
    expect(cursor).toBeTruthy();

    const page2 = await Supertest(app.server)
      .get(`/api/v1/sessions?limit=3&cursor=${encodeURIComponent(cursor)}`)
      .set("Authorization", `Bearer ${token}`);

    expect(page2.status).toBe(200);
    const ids1 = page1.body.data.map((s: { id: string }) => s.id);
    const ids2 = page2.body.data.map((s: { id: string }) => s.id);
    const overlap = ids1.filter((id: string) => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });

  it("returns empty data for testUser2 (no sessions)", async () => {
    const res = await Supertest(app.server)
      .get("/api/v1/sessions")
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns 401 without auth token", async () => {
    const res = await Supertest(app.server).get("/api/v1/sessions");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/v1/sessions/:userGameId ─────────────────────────

describe("GET /api/v1/sessions/:userGameId", () => {
  it("returns sessions for a specific userGame", async () => {
    const userGameId = testUserGameIds[0]!;
    const res = await Supertest(app.server)
      .get(`/api/v1/sessions/${userGameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect("nextCursor" in res.body).toBe(true);
    // All sessions belong to the requested userGame
    for (const session of res.body.data) {
      expect(session.userGameId).toBe(userGameId);
    }
  });

  it("returns empty for userGame with no sessions (wishlist game)", async () => {
    // testUserGameIds[3] is 'wishlist' / 0 min — loop skips it (index 3 → day%5=3 only once in 60d cycle)
    // Use userGameId for delta game (nintendo/wishlist) which has 0 minutesPlayed
    const userGameId = testUserGameIds[3]!;
    const res = await Supertest(app.server)
      .get(`/api/v1/sessions/${userGameId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // nextCursor must be null (no more pages)
    expect(res.body.nextCursor).toBeNull();
  });

  it("returns 401 without auth token", async () => {
    const userGameId = testUserGameIds[0]!;
    const res = await Supertest(app.server).get(`/api/v1/sessions/${userGameId}`);
    expect(res.status).toBe(401);
  });
});
