import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import {
  getUserLibrary,
  getRecentlyPlayed,
  getUserGameById,
  upsertUserGame,
  updateUserGame,
  deleteUserGame,
  getLibraryStats,
  getGameById,
} from "../db/queries/index.js";
import { cacheGet, cacheSet } from "../db/redis.js";
import { invalidateUserCaches } from "../services/cache.js";

const platformEnum = z.enum([
  "steam", "psn", "xbox", "epic", "gog", "nintendo", "ea", "ubisoft", "battlenet", "gamepass",
]);
const statusEnum = z.enum(["library", "playing", "completed", "wishlist", "dropped"]);

const libraryQuery = z.object({
  platform: platformEnum.optional(),
  genre: z.string().optional(),
  status: statusEnum.optional(),
  search: z.string().min(1).max(100).optional(),
  sort: z.enum(["recent", "alpha", "hours", "progress", "rating"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  cursor: z.string().optional(),
});

const addGameBody = z.object({
  gameId: z.string().uuid(),
  platform: platformEnum,
  platformGameId: z.string().min(1),
});

const patchBody = z
  .object({
    status: statusEnum.optional(),
    userRating: z.number().int().min(1).max(10).nullable().optional(),
    userNotes: z.string().max(2000).nullable().optional(),
    completionPct: z.number().min(0).max(100).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "At least one field required" });

const STATS_TTL = 60 * 5; // 5 minutes

export async function libraryRoutes(server: FastifyInstance) {
  // ── GET /api/v1/library ───────────────────────────────────────

  server.get("/", {
    preHandler: authMiddleware,
    schema: {
      tags: ["library"],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          platform: { type: "string" },
          genre: { type: "string" },
          status: {
            type: "string",
            enum: ["library", "playing", "completed", "wishlist", "dropped"],
          },
          sort: {
            type: "string",
            enum: ["recent", "alpha", "hours", "progress", "rating"],
          },
          limit: { type: "number" },
          cursor: { type: "string" },
        },
      },
    },
    handler: async (req, reply) => {
      const { userId } = req.user;
      const parsed = libraryQuery.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: "InvalidQuery", message: parsed.error.message });
      }
      const d = parsed.data;
      const params: import("@gamers-hub/types").LibraryQueryParams = {
        sort: d.sort,
        limit: d.limit,
      };
      if (d.platform !== undefined) params.platform = d.platform;
      if (d.genre !== undefined) params.genre = d.genre;
      if (d.status !== undefined) params.status = d.status;
      if (d.search !== undefined) params.search = d.search;
      if (d.cursor !== undefined) params.cursor = d.cursor;
      const result = await getUserLibrary(userId, params);
      return reply.send(result);
    },
  });

  // ── GET /api/v1/library/stats ─────────────────────────────────

  server.get("/stats", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const cacheKey = `library_stats:${userId}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return reply.send(cached);

      const stats = await getLibraryStats(userId);
      await cacheSet(cacheKey, stats, STATS_TTL);
      return reply.send(stats);
    },
  });

  // ── GET /api/v1/library/recent ────────────────────────────────

  server.get("/recent", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const { limit = 10 } = req.query as { limit?: number };
      const clamped = Math.min(Math.max(1, Number(limit)), 20);
      const games = await getRecentlyPlayed(userId, clamped);
      return reply.send(games);
    },
  });
  
  // ── GET /api/v1/library/games/:id ───────────────────────────

  server.get<{ Params: { id: string } }>("/games/:id", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const userGame = await getUserGameById(userId, req.params.id);
      if (!userGame) {
        return reply.code(404).send({ error: "NotFound", message: "Game not found in library" });
      }
      return reply.send(userGame);
    },
  });

  // ── POST /api/v1/library/games ────────────────────────────────

  server.post("/games", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const parsed = addGameBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "InvalidBody", message: parsed.error.message });
      }
      const { gameId, platform, platformGameId } = parsed.data;

      const game = await getGameById(gameId);
      if (!game) {
        return reply
          .code(404)
          .send({ error: "GameNotFound", message: "Game not found in catalog" });
      }

      const id = await upsertUserGame(userId, gameId, {
        platform,
        platformGameId,
        minutesPlayed: 0,
      });

      await invalidateUserCaches(userId);
      const userGame = await getUserGameById(userId, id);
      return reply.code(201).send(userGame);
    },
  });

  // ── PATCH /api/v1/library/games/:id ──────────────────────────

  server.patch<{ Params: { id: string } }>("/games/:id", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const parsed = patchBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "InvalidBody", message: parsed.error.message });
      }
      const d = parsed.data;
      const patch: Parameters<typeof updateUserGame>[2] = {};
      if (d.status !== undefined) patch.status = d.status;
      if (d.userRating !== undefined) patch.userRating = d.userRating;
      if (d.userNotes !== undefined) patch.userNotes = d.userNotes;
      if (d.completionPct !== undefined) patch.completionPct = d.completionPct;
      const result = await updateUserGame(userId, req.params.id, patch);
      if (!result) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Game not found in your library" });
      }
      await invalidateUserCaches(userId);
      return reply.send(result);
    },
  });

  // ── DELETE /api/v1/library/games/:id ─────────────────────────

  server.delete<{ Params: { id: string } }>("/games/:id", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const deleted = await deleteUserGame(userId, req.params.id);
      if (!deleted) {
        return reply
          .code(404)
          .send({ error: "NotFound", message: "Game not found in your library" });
      }
      await invalidateUserCaches(userId);
      return reply.code(204).send();
    },
  });
}
