import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { getPlaySessions } from "../db/queries/index.js";

const sessionsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // ISO timestamp from previous page
});

export async function sessionsRoutes(server: FastifyInstance) {
  // ── GET /api/v1/sessions ──────────────────────────────────────
  server.get("/", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const q = sessionsQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }

    const opts: { limit: number; cursor?: string } = { limit: q.data.limit };
    if (q.data.cursor !== undefined) opts.cursor = q.data.cursor;

    const result = await getPlaySessions(userId, opts);
    return reply.send(result);
  });

  // ── GET /api/v1/sessions/:userGameId ─────────────────────────
  server.get("/:userGameId", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const { userGameId } = request.params as { userGameId: string };
    const q = sessionsQuery.safeParse(request.query);
    if (!q.success) {
      return reply
        .code(400)
        .send({ statusCode: 400, error: "Bad Request", message: q.error.message });
    }

    const opts: { userGameId: string; limit: number; cursor?: string } = {
      userGameId,
      limit: q.data.limit,
    };
    if (q.data.cursor !== undefined) opts.cursor = q.data.cursor;

    const result = await getPlaySessions(userId, opts);
    return reply.send(result);
  });
}
