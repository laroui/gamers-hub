import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { upsertConnection } from "../db/queries/platforms.js";
import {
  sha256,
  verifyRefreshToken,
  issueTokenPair,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  isRefreshTokenValid,
  blacklistToken,
  isTokenBlacklisted,
} from "../services/auth.js";
import {
  isValidPlatform,
  getOAuthConfig,
  generateCodeVerifier,
  computeCodeChallenge,
  storeOAuthState,
  consumeOAuthState,
  storePkceVerifier,
  consumePkceVerifier,
  oauthSuccessHtml,
  oauthErrorHtml,
} from "../services/oauth.js";
import { env } from "../config/env.js";

// ── Zod schemas ───────────────────────────────────────────────

const registerBody = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeBody = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const steamKeyBody = z.object({
  apiKey: z.string().min(1).optional(), // optional when STEAM_API_KEY is set server-side
  steamId: z.string().min(1),
});

const nintendoTokenBody = z.object({
  sessionToken: z.string().min(1),
});

// ── Helper: strip passwordHash from user ──────────────────────

function stripHash(user: typeof users.$inferSelect) {
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

// ── Refresh cookie options ────────────────────────────────────

function refreshCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "strict" as const,
    path: "/api/v1/auth/refresh",
    maxAge: 60 * 60 * 24 * 30,
  };
}

// ── Rate limit config ─────────────────────────────────────────
// In test mode we disable per-route rate limits to avoid 429 during test runs.
// The global rate limit from @fastify/rate-limit still applies.

const isTest = env.NODE_ENV === "test";

// ── Auth routes ───────────────────────────────────────────────

export async function authRoutes(server: FastifyInstance) {
  // ── POST /register ────────────────────────────────────────
  server.post("/register", {
    config: { rateLimit: isTest ? false : { max: 5, timeWindow: "1 hour" } },
    handler: async (req, reply) => {
      const parsed = registerBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "ValidationError",
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const body = parsed.data;

      // Uniqueness checks
      const [existingEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      if (existingEmail) {
        return reply.code(409).send({ error: "EmailTaken", message: "Email already registered" });
      }

      const [existingUsername] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, body.username))
        .limit(1);
      if (existingUsername) {
        return reply.code(409).send({ error: "UsernameTaken", message: "Username already taken" });
      }

      const passwordHash = await bcrypt.hash(body.password, 10);
      const [user] = await db
        .insert(users)
        .values({ email: body.email, username: body.username, passwordHash, avatarUrl: null })
        .returning();

      if (!user) {
        return reply.code(500).send({ error: "InsertFailed", message: "Could not create user" });
      }

      const { accessToken, refreshToken } = await issueTokenPair(server, user.id, user.email);
      await storeRefreshToken(user.id, sha256(refreshToken));

      reply.setCookie("refreshToken", refreshToken, refreshCookieOptions(env.NODE_ENV === "production"));

      return reply.code(201).send({ user: stripHash(user), accessToken });
    },
  });

  // ── POST /login ───────────────────────────────────────────
  server.post("/login", {
    config: { rateLimit: isTest ? false : { max: 10, timeWindow: "15 minutes" } },
    handler: async (req, reply) => {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "ValidationError",
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const body = parsed.data;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) {
        // Timing attack prevention: hash a dummy password so response time is consistent
        await bcrypt.hash("dummy_timing_prevention", 10);
        return reply.code(401).send({
          error: "InvalidCredentials",
          message: "Invalid email or password",
        });
      }

      const passwordValid = await bcrypt.compare(body.password, user.passwordHash);
      if (!passwordValid) {
        return reply.code(401).send({
          error: "InvalidCredentials",
          message: "Invalid email or password",
        });
      }

      // Revoke all previous sessions for this user
      await revokeAllRefreshTokens(user.id);

      const { accessToken, refreshToken } = await issueTokenPair(server, user.id, user.email);
      await storeRefreshToken(user.id, sha256(refreshToken));

      reply.setCookie("refreshToken", refreshToken, refreshCookieOptions(env.NODE_ENV === "production"));

      return reply.code(200).send({ user: stripHash(user), accessToken });
    },
  });

  // ── POST /refresh ─────────────────────────────────────────
  server.post("/refresh", {
    config: { rateLimit: isTest ? false : { max: 30, timeWindow: "1 hour" } },
    handler: async (req, reply) => {
      const token = req.cookies.refreshToken;
      if (!token) {
        return reply.code(401).send({ error: "NoRefreshToken", message: "Not authenticated" });
      }

      let payload: { userId: string; exp: number };
      try {
        payload = verifyRefreshToken(token);
      } catch {
        return reply
          .code(401)
          .send({ error: "InvalidToken", message: "Invalid or expired session" });
      }

      const tokenHash = sha256(token);

      // Check DB blacklist
      if (await isTokenBlacklisted(tokenHash)) {
        return reply
          .code(401)
          .send({ error: "InvalidToken", message: "Invalid or expired session" });
      }

      // Check Redis validity
      if (!(await isRefreshTokenValid(payload.userId, tokenHash))) {
        return reply
          .code(401)
          .send({ error: "InvalidToken", message: "Invalid or expired session" });
      }

      // Fetch user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        return reply
          .code(401)
          .send({ error: "InvalidToken", message: "Invalid or expired session" });
      }

      // Rotate: revoke old, issue new
      await revokeRefreshToken(payload.userId, tokenHash);
      const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
        server,
        user.id,
        user.email,
      );
      await storeRefreshToken(user.id, sha256(newRefreshToken));

      reply.setCookie(
        "refreshToken",
        newRefreshToken,
        refreshCookieOptions(env.NODE_ENV === "production"),
      );

      return reply.code(200).send({ user: stripHash(user), accessToken });
    },
  });

  // ── POST /logout ──────────────────────────────────────────
  server.post("/logout", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const token = req.cookies.refreshToken;
      if (token) {
        try {
          const payload = verifyRefreshToken(token);
          const tokenHash = sha256(token);
          const expiresAt = new Date(payload.exp * 1000);
          await blacklistToken(tokenHash, expiresAt);
          await revokeRefreshToken(req.user.userId, tokenHash);
        } catch {
          // Token already expired or invalid — nothing to revoke
        }
      }

      reply.clearCookie("refreshToken", { path: "/api/v1/auth/refresh" });
      return reply.code(204).send();
    },
  });

  // ── GET /me ───────────────────────────────────────────────
  server.get("/me", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: "NotFound", message: "User not found" });
      }

      return reply.code(200).send(stripHash(user));
    },
  });

  // ── PATCH /me ─────────────────────────────────────────────
  server.patch("/me", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const parsed = updateMeBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "ValidationError",
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const body = parsed.data;

      // Check username uniqueness if changing it
      if (body.username !== undefined) {
        const [current] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, req.user.userId))
          .limit(1);

        if (current && body.username !== current.username) {
          const [taken] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, body.username))
            .limit(1);
          if (taken) {
            return reply
              .code(409)
              .send({ error: "UsernameTaken", message: "Username already taken" });
          }
        }
      }

      // Build update set — only include explicitly provided fields
      const setData: {
        updatedAt: Date;
        username?: string;
        avatarUrl?: string | null;
      } = { updatedAt: new Date() };

      if (body.username !== undefined) setData.username = body.username;
      if (body.avatarUrl !== undefined) setData.avatarUrl = body.avatarUrl;

      const [updated] = await db
        .update(users)
        .set(setData)
        .where(eq(users.id, req.user.userId))
        .returning();

      if (!updated) {
        return reply.code(404).send({ error: "NotFound", message: "User not found" });
      }

      return reply.code(200).send(stripHash(updated));
    },
  });

  // ── GET /oauth/:platform ──────────────────────────────────
  server.get("/oauth/:platform", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { platform } = req.params as { platform: string };

      if (!isValidPlatform(platform)) {
        return reply.code(400).send({ error: "InvalidPlatform", message: "Unknown platform" });
      }

      if (platform === "steam") {
        return reply.code(200).send({
          type: "apikey",
          message: "Use POST /auth/steam-key",
        });
      }

      if (platform === "nintendo") {
        return reply.code(200).send({
          type: "sessiontoken",
          message: "Use POST /auth/nintendo-token",
        });
      }

      const config = getOAuthConfig(platform);
      if (!config) {
        return reply.code(503).send({
          error: "NotConfigured",
          message: `${platform} OAuth is not configured on this server`,
        });
      }

      const state = randomUUID();
      await storeOAuthState(state, req.user.userId);

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: config.scopes.join(" "),
        state,
      });

      if (config.usePKCE) {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = computeCodeChallenge(codeVerifier);
        await storePkceVerifier(state, codeVerifier);
        params.set("code_challenge", codeChallenge);
        params.set("code_challenge_method", "S256");
      }

      const authUrl = `${config.authUrl}?${params.toString()}`;
      return reply.code(200).send({ authUrl, state });
    },
  });

  // ── GET /oauth/:platform/callback ─────────────────────────
  server.get("/oauth/:platform/callback", {
    handler: async (req, reply) => {
      const { platform } = req.params as { platform: string };
      const query = req.query as Record<string, string>;
      const { code, state, error } = query;

      if (error) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml(`OAuth error: ${error}`));
      }

      if (!state) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("Missing state parameter"));
      }

      const userId = await consumeOAuthState(state);
      if (!userId) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("State expired or tampered"));
      }

      if (!isValidPlatform(platform)) {
        return reply.type("text/html").code(400).send(oauthErrorHtml("Unknown platform"));
      }

      const config = getOAuthConfig(platform);
      if (!config) {
        return reply
          .type("text/html")
          .code(503)
          .send(oauthErrorHtml("Platform not configured"));
      }

      let codeVerifier: string | null = null;
      if (config.usePKCE) {
        codeVerifier = await consumePkceVerifier(state);
      }

      // Exchange code for tokens
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code: code ?? "",
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
      });

      if (codeVerifier) {
        tokenParams.set("code_verifier", codeVerifier);
      } else {
        tokenParams.set("client_secret", config.clientSecret);
      }

      let tokenData: { access_token?: string; refresh_token?: string; expires_in?: number };
      try {
        const tokenRes = await fetch(config.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: tokenParams.toString(),
        });
        if (!tokenRes.ok) {
          throw new Error(`Token exchange failed: ${tokenRes.status}`);
        }
        tokenData = (await tokenRes.json()) as typeof tokenData;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Token exchange failed";
        return reply.type("text/html").code(400).send(oauthErrorHtml(msg));
      }

      if (!tokenData.access_token) {
        return reply.type("text/html").code(400).send(oauthErrorHtml("No access token received"));
      }

      const tokenExpiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      await upsertConnection({
        userId,
        platform,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiresAt,
        syncStatus: "pending",
      });

      // Enqueue initial sync via BullMQ
      try {
        const { Queue } = await import("bullmq");
        const { getRedis } = await import("../db/redis.js");
        const syncQueue = new Queue("platform-sync", { connection: getRedis() });
        await syncQueue.add(
          "sync",
          { userId, platform, triggeredBy: "connect" as const },
          { jobId: `${userId}:${platform}:${Date.now()}` },
        );
        await syncQueue.close();
      } catch {
        // Non-fatal: sync will be triggered manually
      }

      return reply.type("text/html").code(200).send(oauthSuccessHtml(platform));
    },
  });

  // ── POST /steam-key ───────────────────────────────────────
  server.post("/steam-key", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const parsed = steamKeyBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "ValidationError",
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const { apiKey: userApiKey, steamId } = parsed.data;

      // Resolve which API key to use: server-side env key takes priority,
      // fall back to user-supplied key (legacy — still works for power users)
      const resolvedKey = env.STEAM_API_KEY ?? userApiKey;
      if (!resolvedKey) {
        return reply.code(503).send({
          error: "NoSteamKey",
          message: "No Steam API key configured. Either set STEAM_API_KEY on the server or provide your own.",
        });
      }

      // Validate key + Steam ID via Steam API
      let displayName: string;
      try {
        const steamRes = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(resolvedKey)}&steamids=${encodeURIComponent(steamId)}`,
        );
        if (!steamRes.ok) throw new Error(`Steam API returned ${steamRes.status}`);
        const data = (await steamRes.json()) as {
          response?: { players?: Array<{ personaname?: string }> };
        };
        const player = data.response?.players?.[0];
        if (!player) {
          return reply.code(400).send({
            error: "InvalidSteamId",
            message: "Steam ID not found. Make sure you entered your 64-bit Steam ID.",
          });
        }
        displayName = player.personaname ?? steamId;
      } catch {
        return reply.code(400).send({
          error: "InvalidSteamKey",
          message: "Could not verify Steam ID. Check the ID and try again.",
        });
      }

      await upsertConnection({
        userId: req.user.userId,
        platform: "steam",
        accessToken: resolvedKey,
        platformUid: steamId,
        displayName,
        syncStatus: "pending",
      });

      return reply.code(200).send({ connected: true, displayName });
    },
  });

  // ── POST /nintendo-token ──────────────────────────────────
  server.post("/nintendo-token", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const parsed = nintendoTokenBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "ValidationError",
          message: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const { sessionToken } = parsed.data;

      await upsertConnection({
        userId: req.user.userId,
        platform: "nintendo",
        accessToken: sessionToken,
        syncStatus: "pending",
      });

      return reply.code(200).send({ connected: true });
    },
  });

  // ── GET /steam-openid/callback ────────────────────────────
  // Steam OpenID relying-party callback. Steam redirects here after the user
  // authenticates. We verify the OpenID assertion, extract the Steam64 ID,
  // fetch their display name, then store the connection and close the popup.
  server.get("/steam-openid/callback", {
    handler: async (req, reply) => {
      const query = req.query as Record<string, string>;

      if (query["openid.mode"] === "cancel") {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("Steam login was cancelled"));
      }

      if (query["openid.mode"] !== "id_res") {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("Unexpected OpenID response"));
      }

      // Recover user from state param we attached to return_to
      const state = query["state"];
      if (!state) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("Missing state parameter"));
      }

      const userId = await consumeOAuthState(state);
      if (!userId) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("State expired or invalid — please try again"));
      }

      // Verify the assertion with Steam (prevents replay/forgery attacks)
      const verifyParams = new URLSearchParams(query);
      verifyParams.delete("state"); // state is ours, not part of OpenID
      verifyParams.set("openid.mode", "check_authentication");

      let isValid = false;
      try {
        const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: verifyParams.toString(),
        });
        const text = await verifyRes.text();
        isValid = text.includes("is_valid:true");
      } catch {
        return reply
          .type("text/html")
          .code(500)
          .send(oauthErrorHtml("Could not verify with Steam — try again"));
      }

      if (!isValid) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("Steam authentication could not be verified"));
      }

      // Extract Steam64 ID from claimed_id (format: .../openid/id/76561198XXXXXXXXX)
      const claimedId = query["openid.claimed_id"] ?? "";
      const steamId64 = claimedId.match(/\/id\/(\d+)$/)?.[1];
      if (!steamId64) {
        return reply
          .type("text/html")
          .code(400)
          .send(oauthErrorHtml("Could not extract Steam ID from response"));
      }

      // Fetch Steam display name
      let displayName = steamId64;
      if (env.STEAM_API_KEY) {
        try {
          const profileRes = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(env.STEAM_API_KEY)}&steamids=${steamId64}`,
          );
          const profileData = (await profileRes.json()) as {
            response?: { players?: Array<{ personaname?: string }> };
          };
          displayName = profileData.response?.players?.[0]?.personaname ?? steamId64;
        } catch { /* non-fatal — fall back to steam ID */ }
      }

      await upsertConnection({
        userId,
        platform: "steam",
        accessToken: env.STEAM_API_KEY ?? "",
        platformUid: steamId64,
        displayName,
        syncStatus: "pending",
      });

      return reply.type("text/html").code(200).send(oauthSuccessHtml("steam"));
    },
  });
}
