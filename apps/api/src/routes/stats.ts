import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import {
  getLibraryStats,
  getPlayHeatmap,
  getPlayStreaks,
  getWeeklyPlaytime,
  getPlaytimeByPlatform,
  getPlaytimeByGenre,
  getGamingWrapped,
} from "../db/queries/index.js";
import { cacheGet, cacheSet } from "../db/redis.js";

const OVERVIEW_TTL = 60 * 5; // 5 min
const HEATMAP_TTL = 60 * 60; // 1 h
const STREAKS_TTL = 60 * 15; // 15 min
const WEEKLY_TTL = 60 * 30; // 30 min
const PLATFORM_TTL = 60 * 60; // 1 h
const GENRE_TTL = 60 * 60; // 1 h
const WRAPPED_TTL = 60 * 60 * 24; // 24 h

const yearQuery = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
});

const weeksQuery = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(12),
});

const yearOnlyQuery = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
});

export async function statsRoutes(server: FastifyInstance) {
  // ── GET /api/v1/stats/overview ────────────────────────────────
  server.get("/overview", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const key = `library_stats:${userId}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getLibraryStats(userId);
    await cacheSet(key, data, OVERVIEW_TTL);
    return reply.send(data);
  });

  // ── GET /api/v1/stats/heatmap?year= ──────────────────────────
  server.get("/heatmap", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const q = yearQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }
    const { year } = q.data;
    const key = `heatmap:${userId}:${year}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getPlayHeatmap(userId, year);
    await cacheSet(key, data, HEATMAP_TTL);
    return reply.send(data);
  });

  // ── GET /api/v1/stats/streaks ─────────────────────────────────
  server.get("/streaks", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const key = `streaks:${userId}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getPlayStreaks(userId);
    await cacheSet(key, data, STREAKS_TTL);
    return reply.send(data);
  });

  // ── GET /api/v1/stats/weekly?year= ───────────────────────────
  server.get("/weekly", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const q = yearOnlyQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }
    const { year } = q.data;
    const key = `weekly_playtime:${userId}:${year}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getWeeklyPlaytime(userId, year);
    await cacheSet(key, data, WEEKLY_TTL);
    return reply.send(data);
  });

  // ── GET /api/v1/stats/platforms?year= ────────────────────────
  server.get("/platforms", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const q = yearOnlyQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }
    const { year } = q.data;
    const key = `playtime_platform:${userId}:${year}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getPlaytimeByPlatform(userId, year);
    await cacheSet(key, data, PLATFORM_TTL);
    return reply.send(data);
  });

  // ── GET /api/v1/stats/genres?year= ───────────────────────────
  server.get("/genres", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const q = yearOnlyQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }
    const { year } = q.data;
    const key = `playtime_genre:${userId}:${year}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getPlaytimeByGenre(userId, year);
    await cacheSet(key, data, GENRE_TTL);
    return reply.send(data);
  });

  // ── GET /api/v1/stats/wrapped?year= ──────────────────────────
  server.get("/wrapped", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const q = yearQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }
    const { year } = q.data;
    const key = `wrapped:${userId}:${year}`;
    const cached = await cacheGet(key);
    if (cached) return reply.send(cached);
    const data = await getGamingWrapped(userId, year);
    await cacheSet(key, data, WRAPPED_TTL);
    return reply.send(data);
  });
}
