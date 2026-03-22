import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Supertest from "supertest";
import Fastify from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, tokenBlacklist } from "../../db/schema.js";
import { registerPlugins } from "../../plugins/index.js";
import { registerRoutes } from "../../routes/index.js";
import { closeRedis } from "../../db/redis.js";

// ── App setup ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: ReturnType<typeof Fastify<any, any, any, any, any>>;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await registerPlugins(app);
  await registerRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeRedis();
});

beforeEach(async () => {
  await db.delete(users).where(eq(users.email, "authtest@test.com"));
  await db.delete(users).where(eq(users.email, "authtest2@test.com"));
  await db.delete(tokenBlacklist);
});

// ── Test helper ───────────────────────────────────────────────

async function registerAndLogin(
  email = "authtest@test.com",
  username = "authtest_user",
  password = "testpassword123",
): Promise<{ accessToken: string; userId: string; cookie: string }> {
  const res = await Supertest(app.server)
    .post("/api/v1/auth/register")
    .send({ email, username, password });
  expect(res.status).toBe(201);
  const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
  const cookie = Array.isArray(setCookie) ? (setCookie[0] ?? "") : (setCookie ?? "");
  return {
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as string,
    cookie,
  };
}

// ── Register tests ────────────────────────────────────────────

describe("POST /api/v1/auth/register", () => {
  it("registers a new user and returns accessToken + user", async () => {
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({ email: "authtest@test.com", username: "authtest_user", password: "testpassword123" });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("authtest@test.com");
    expect(res.body.user.username).toBe("authtest_user");
  });

  it("returns 409 when email already exists", async () => {
    await registerAndLogin();
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({ email: "authtest@test.com", username: "different_user", password: "testpassword123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("EmailTaken");
  });

  it("returns 409 when username already exists", async () => {
    await registerAndLogin();
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({
        email: "authtest2@test.com",
        username: "authtest_user",
        password: "testpassword123",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("UsernameTaken");
  });

  it("returns 400 when password is too short", async () => {
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({ email: "authtest@test.com", username: "authtest_user", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
  });

  it("returns 400 when username contains invalid characters", async () => {
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({
        email: "authtest@test.com",
        username: "bad user!",
        password: "testpassword123",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
  });

  it("sets httpOnly refreshToken cookie on register", async () => {
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({ email: "authtest@test.com", username: "authtest_user", password: "testpassword123" });

    expect(res.status).toBe(201);
    const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toBeDefined();
    expect(cookieStr).toContain("refreshToken=");
    expect(cookieStr?.toLowerCase()).toContain("httponly");
    expect(cookieStr).toContain("Path=/api/v1/auth/refresh");
  });

  it("passwordHash is never returned in response", async () => {
    const res = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({ email: "authtest@test.com", username: "authtest_user", password: "testpassword123" });

    expect(res.status).toBe(201);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("password_hash");
  });
});

// ── Login tests ───────────────────────────────────────────────

describe("POST /api/v1/auth/login", () => {
  it("logs in with valid credentials", async () => {
    await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "authtest@test.com", password: "testpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe("authtest@test.com");
  });

  it("returns 401 for wrong password — same response shape as unknown email", async () => {
    await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "authtest@test.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("InvalidCredentials");
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("returns 401 for unknown email — same response shape as wrong password", async () => {
    const res = await Supertest(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@nowhere.com", password: "somepassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("InvalidCredentials");
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("sets refreshToken cookie on login", async () => {
    await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/login")
      .send({ email: "authtest@test.com", password: "testpassword123" });

    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain("refreshToken=");
    expect(cookieStr?.toLowerCase()).toContain("httponly");
  });
});

// ── Refresh tests ─────────────────────────────────────────────

describe("POST /api/v1/auth/refresh", () => {
  it("issues new accessToken when refresh cookie is valid", async () => {
    const { cookie } = await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toBeDefined();
  });

  it("rotates the refresh token — old cookie rejected after refresh", async () => {
    const { cookie: oldCookie } = await registerAndLogin();

    // First refresh — consumes old token, issues new one
    const refreshRes = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldCookie);
    expect(refreshRes.status).toBe(200);

    // Try again with the old cookie — should fail (revoked in Redis)
    const res = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldCookie);

    expect(res.status).toBe(401);
  });

  it("returns 401 when no cookie present", async () => {
    const res = await Supertest(app.server).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("NoRefreshToken");
  });

  it("returns 401 when refresh token is blacklisted", async () => {
    const { cookie, accessToken } = await registerAndLogin();

    // Logout → blacklists the token
    await Supertest(app.server)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", cookie);

    // Attempt refresh with the old (blacklisted) cookie
    const res = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie);

    expect(res.status).toBe(401);
  });
});

// ── Logout tests ──────────────────────────────────────────────

describe("POST /api/v1/auth/logout", () => {
  it("returns 204 on logout", async () => {
    const { accessToken, cookie } = await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(204);
  });

  it("clears cookie on logout", async () => {
    const { accessToken, cookie } = await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(204);
    const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    // clearCookie sets the cookie with Max-Age=0 or Expires in the past
    expect(cookieStr).toBeDefined();
    expect(cookieStr).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("subsequent refresh after logout returns 401", async () => {
    const { accessToken, cookie } = await registerAndLogin();

    // Logout
    await Supertest(app.server)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Cookie", cookie);

    // Refresh with the same cookie value → should be blacklisted
    const res = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie);

    expect(res.status).toBe(401);
  });

  it("returns 401 without Bearer token", async () => {
    const res = await Supertest(app.server).post("/api/v1/auth/logout");
    expect(res.status).toBe(401);
  });
});

// ── Me tests ──────────────────────────────────────────────────

describe("GET /api/v1/auth/me", () => {
  it("returns current user without passwordHash", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("authtest@test.com");
    expect(res.body.username).toBe("authtest_user");
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("returns 401 without Bearer token", async () => {
    const res = await Supertest(app.server).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/auth/me", () => {
  it("updates username successfully", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ username: "new_username" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("new_username");
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("returns 409 when new username is taken", async () => {
    const { accessToken } = await registerAndLogin();
    // Register a second user
    await registerAndLogin("authtest2@test.com", "taken_username", "testpassword123");

    const res = await Supertest(app.server)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ username: "taken_username" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("UsernameTaken");
  });

  it("returns 401 without Bearer token", async () => {
    const res = await Supertest(app.server)
      .patch("/api/v1/auth/me")
      .send({ username: "new_name" });
    expect(res.status).toBe(401);
  });

  it("accepts avatarUrl as null to clear avatar", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ avatarUrl: null });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBeNull();
  });
});

// ── OAuth platform route tests ─────────────────────────────────

describe("GET /api/v1/auth/oauth/:platform", () => {
  it("returns special message for steam platform", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .get("/api/v1/auth/oauth/steam")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("apikey");
  });

  it("returns special message for nintendo platform", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .get("/api/v1/auth/oauth/nintendo")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.type).toBe("sessiontoken");
  });

  it("returns 400 for unknown platform", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .get("/api/v1/auth/oauth/unknown_platform")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("InvalidPlatform");
  });

  it("returns 503 for unconfigured OAuth platform", async () => {
    const { accessToken } = await registerAndLogin();

    // gamepass is never handled in getOAuthConfig → always returns null → 503
    const res = await Supertest(app.server)
      .get("/api/v1/auth/oauth/gamepass")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("NotConfigured");
  });

  it("returns 401 without auth", async () => {
    const res = await Supertest(app.server).get("/api/v1/auth/oauth/xbox");
    expect(res.status).toBe(401);
  });
});

// ── Nintendo token route ───────────────────────────────────────

describe("POST /api/v1/auth/nintendo-token", () => {
  it("stores nintendo session token", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/nintendo-token")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ sessionToken: "test_nintendo_token_abc123" });

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
  });

  it("returns 400 when sessionToken is missing", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await Supertest(app.server)
      .post("/api/v1/auth/nintendo-token")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ── Full auth flow test ────────────────────────────────────────

describe("Full auth flow", () => {
  it("register → login → refresh → logout → refresh fails", async () => {
    // 1. Register
    const regRes = await Supertest(app.server)
      .post("/api/v1/auth/register")
      .send({ email: "authtest@test.com", username: "authtest_user", password: "testpassword123" });
    expect(regRes.status).toBe(201);
    const { accessToken: regToken } = regRes.body as { accessToken: string };
    const regCookie = (regRes.headers["set-cookie"] as string[])[0]!;

    // 2. Get /me with access token
    const meRes = await Supertest(app.server)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${regToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("authtest@test.com");

    // 3. Refresh using cookie
    const refreshRes = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", regCookie);
    expect(refreshRes.status).toBe(200);
    const newToken = (refreshRes.body as { accessToken: string }).accessToken;
    const newCookie = (refreshRes.headers["set-cookie"] as string[])[0]!;

    // 4. Old cookie should now be rejected
    const oldRefreshRes = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", regCookie);
    expect(oldRefreshRes.status).toBe(401);

    // 5. Logout with new token
    const logoutRes = await Supertest(app.server)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${newToken}`)
      .set("Cookie", newCookie);
    expect(logoutRes.status).toBe(204);

    // 6. Refresh after logout → 401 (cookie blacklisted)
    const finalRefresh = await Supertest(app.server)
      .post("/api/v1/auth/refresh")
      .set("Cookie", newCookie);
    expect(finalRefresh.status).toBe(401);
  });
});
