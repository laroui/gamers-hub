import { createHash, createHmac, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { tokenBlacklist } from "../db/schema.js";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "../db/redis.js";
import { env } from "../config/env.js";

// ── Token hash ────────────────────────────────────────────────

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// ── Refresh token (HS256 implemented via Node crypto) ─────────

function parseExpiry(exp: string): number {
  const n = parseInt(exp, 10);
  if (exp.endsWith("d")) return n * 86400;
  if (exp.endsWith("h")) return n * 3600;
  if (exp.endsWith("m")) return n * 60;
  return n;
}

export function signRefreshToken(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + parseExpiry(env.JWT_REFRESH_EXPIRES_IN);
  const jti = randomBytes(16).toString("hex"); // unique per token — prevents same-second collisions
  const body = Buffer.from(JSON.stringify({ userId, iat, exp, jti })).toString("base64url");
  const sig = createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyRefreshToken(token: string): { userId: string; exp: number } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [header, body, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", env.JWT_REFRESH_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  if (sig !== expected) throw new Error("Invalid signature");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    userId: string;
    exp: number;
  };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

// ── Issue token pair ──────────────────────────────────────────

export async function issueTokenPair(
  server: FastifyInstance,
  userId: string,
  email: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = (server as any).jwt.sign(
    { userId, email },
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  ) as string;
  const refreshToken = signRefreshToken(userId);
  return { accessToken, refreshToken };
}

// ── Refresh token Redis key management ────────────────────────

const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days

export async function storeRefreshToken(userId: string, tokenHash: string): Promise<void> {
  await cacheSet(`refresh:${userId}:${tokenHash}`, 1, REFRESH_TTL);
}

export async function revokeRefreshToken(userId: string, tokenHash: string): Promise<void> {
  await cacheDel(`refresh:${userId}:${tokenHash}`);
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await cacheDelPattern(`refresh:${userId}:*`);
}

export async function isRefreshTokenValid(userId: string, tokenHash: string): Promise<boolean> {
  const val = await cacheGet<number>(`refresh:${userId}:${tokenHash}`);
  return val !== null;
}

// ── DB token blacklist ────────────────────────────────────────

export async function blacklistToken(tokenHash: string, expiresAt: Date): Promise<void> {
  await db.insert(tokenBlacklist).values({ tokenHash, expiresAt }).onConflictDoNothing();
}

export async function isTokenBlacklisted(tokenHash: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select({ id: tokenBlacklist.id })
    .from(tokenBlacklist)
    .where(and(eq(tokenBlacklist.tokenHash, tokenHash), gt(tokenBlacklist.expiresAt, now)))
    .limit(1);
  return rows.length > 0;
}
