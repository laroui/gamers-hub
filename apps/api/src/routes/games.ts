import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Game } from "@gamers-hub/types";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { searchGames, getGameById, upsertGame } from "../db/queries/index.js";
import { cacheGet, cacheSet } from "../db/redis.js";
import { searchIgdb, getIgdbGame } from "../services/igdb.js";
import { resolveCoverUrl } from "../services/cover.js";
import { db } from "../db/client.js";
import { achievements, userGames, games } from "../db/schema.js";

function sha256(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

export async function gamesRoutes(server: FastifyInstance) {
  // ── GET /api/v1/games/search?q= ───────────────────────────────

  server.get("/search", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const q = (req.query as { q?: string }).q;
      if (!q || q.length < 2) {
        return reply.code(400).send({
          error: "InvalidQuery",
          message: "Search query must be at least 2 characters",
        });
      }

      const cacheKey = `igdb_search:${sha256(q)}`;
      const cached = await cacheGet<Game[]>(cacheKey);
      if (cached) return reply.send(cached);

      const localResults = await searchGames(q, 10);

      let igdbResults: Game[] = [];
      try {
        igdbResults = await searchIgdb(q, 10);
      } catch (err) {
        server.log.warn({ err }, "IGDB search failed, returning local results only");
      }

      // Upsert new IGDB games into local catalog
      const localIgdbIds = new Set(localResults.map((g) => g.igdbId).filter(Boolean));
      const newGames = igdbResults.filter((g) => g.igdbId && !localIgdbIds.has(g.igdbId));

      for (const game of newGames) {
        try {
          await upsertGame({
            igdbId: game.igdbId ?? null,
            title: game.title,
            coverUrl: game.coverUrl ?? null,
            genres: game.genres,
            releaseYear: game.releaseYear ?? null,
            metacritic: game.metacritic ?? null,
            description: game.description ?? null,
          });
        } catch {
          /* non-fatal */
        }
      }

      // Merge, deduplicate by igdbId then by lowercase title
      const seen = new Set<string>();
      const merged: Game[] = [];
      for (const game of [...localResults, ...igdbResults]) {
        const key = game.igdbId
          ? `igdb:${game.igdbId}`
          : `title:${game.title.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(game);
        }
      }

      await cacheSet(cacheKey, merged, 60 * 60 * 24);
      return reply.send(merged);
    },
  });

  // ── GET /api/v1/games/:id ─────────────────────────────────────

  server.get<{ Params: { id: string } }>("/:id", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const game = await getGameById(req.params.id);
      if (!game) {
        return reply.code(404).send({ error: "NotFound", message: "Game not found" });
      }

      let enriched: Game = game;

      // Lazily resolve cover art if missing
      if (!game.coverUrl) {
        try {
          const [raw] = await db
            .select({ steamAppId: games.steamAppId })
            .from(games)
            .where(eq(games.id, req.params.id))
            .limit(1);
          const steamAppId = raw?.steamAppId ?? null;

          if (game.igdbId != null || steamAppId != null) {
            const coverUrl = await resolveCoverUrl({
              id: game.id,
              coverUrl: game.coverUrl,
              igdbId: game.igdbId,
              steamAppId,
            });
            if (coverUrl) {
              await upsertGame({
                igdbId: game.igdbId ?? null,
                title: game.title,
                coverUrl,
                backgroundUrl: game.backgroundUrl ?? null,
                genres: game.genres,
                platforms: game.platforms,
                releaseYear: game.releaseYear ?? null,
                metacritic: game.metacritic ?? null,
                description: game.description ?? null,
              });
              enriched = { ...enriched, coverUrl };
            }
          }
        } catch {
          /* non-fatal */
        }
      }

      // Enrich with IGDB data if no description
      if (game.igdbId != null && !game.description) {
        try {
          const igdbGame = await getIgdbGame(game.igdbId);
          if (igdbGame) {
            enriched = {
              ...enriched,
              description: igdbGame.description,
              coverUrl: igdbGame.coverUrl ?? enriched.coverUrl,
            };
          }
        } catch {
          /* non-fatal */
        }
      }

      return reply.send(enriched);
    },
  });

  // ── GET /api/v1/games/:id/achievements ────────────────────────

  server.get<{ Params: { id: string } }>("/:id/achievements", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;

      const [userGame] = await db
        .select({ id: userGames.id })
        .from(userGames)
        .where(and(eq(userGames.userId, userId), eq(userGames.gameId, req.params.id)))
        .limit(1);

      if (!userGame) return reply.send([]);

      const rows = await db
        .select()
        .from(achievements)
        .where(eq(achievements.userGameId, userGame.id));

      return reply.send(
        rows.map((a) => ({
          id: a.id,
          userGameId: a.userGameId,
          platformId: a.platformId,
          title: a.title,
          description: a.description,
          iconUrl: a.iconUrl,
          earnedAt: a.earnedAt?.toISOString() ?? null,
          rarityPct: a.rarityPct,
          points: a.points,
          isEarned: a.earnedAt !== null,
        })),
      );
    },
  });
}
