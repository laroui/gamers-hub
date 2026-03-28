import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, auditLogs } from "../../db/schema.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { env } from "../../config/env.js";

export async function adminRoutes(server: FastifyInstance) {
  // ── GET /verify-secret — validate admin token (no auth required) ──
  server.get("/verify-secret", {
    handler: async (req, reply) => {
      const query = req.query as { token?: string };
      const adminSecret = env.ADMIN_SECRET;

      if (!adminSecret) {
        return reply.status(503).send({ error: "Admin access not configured" });
      }
      if (!query.token || query.token !== adminSecret) {
        return reply.status(403).send({ error: "Invalid admin token" });
      }

      return reply.send({ ok: true });
    },
  });

  // ── GET /me — confirm admin status ────────────────────────────────
  server.get("/me", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const [user] = await db
        .select({ id: users.id, email: users.email, username: users.username, role: users.role })
        .from(users)
        .where(eq(users.id, req.user.userId));
      return reply.send({ user });
    },
  });

  // ── POST /audit — log an admin action (internal helper) ───────────
  server.post("/audit", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const body = req.body as { action: string; targetType?: string; targetId?: string; metadata?: unknown };
      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: body.action,
        targetType: body.targetType ?? null,
        targetId: body.targetId ?? null,
        metadata: body.metadata ?? null,
      });
      return reply.send({ ok: true });
    },
  });
}
