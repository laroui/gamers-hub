import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { userGames, users, games } from "../db/schema.js";

export async function feedRoutes(server: FastifyInstance) {
  // ── GET /feed — public recent activity ────────────────────
  server.get("/", {
    handler: async (req, reply) => {
      const query = req.query as { limit?: string };
      const limit = Math.min(parseInt(query.limit ?? "20"), 50);

      const rows = await db
        .select({
          userId: userGames.userId,
          username: users.username,
          avatarUrl: users.avatarUrl,
          gameId: userGames.gameId,
          gameTitle: games.title,
          gameCover: games.coverUrl,
          status: userGames.status,
          userRating: userGames.userRating,
          addedAt: userGames.addedAt,
        })
        .from(userGames)
        .innerJoin(users, eq(users.id, userGames.userId))
        .innerJoin(games, eq(games.id, userGames.gameId))
        .orderBy(desc(userGames.addedAt))
        .limit(limit);

      const events = rows.map((r) => {
        const base = {
          user: {
            id: r.userId,
            displayName: r.username,
            avatar: r.avatarUrl,
          },
          game: {
            id: r.gameId,
            name: r.gameTitle,
            cover: r.gameCover,
          },
          createdAt: r.addedAt.toISOString(),
        };

        if (r.userRating != null) {
          return { ...base, type: "RATED_GAME" as const, rating: r.userRating };
        }
        if (r.status === "completed") {
          return { ...base, type: "COMPLETED_GAME" as const };
        }
        return { ...base, type: "ADDED_GAME" as const };
      });

      return reply.send({ events });
    },
  });
}
