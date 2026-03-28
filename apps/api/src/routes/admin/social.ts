import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { socialAccounts, socialPublications, auditLogs } from "../../db/schema.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { publishToAll } from "../../services/socialPublisher.js";

export async function adminSocialRoutes(server: FastifyInstance) {
  // ── GET /accounts — list without credentials ──────────────────────
  server.get("/accounts", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const accounts = await db
        .select({ id: socialAccounts.id, platform: socialAccounts.platform, name: socialAccounts.name, active: socialAccounts.active, createdAt: socialAccounts.createdAt })
        .from(socialAccounts)
        .orderBy(socialAccounts.platform);
      return reply.send(accounts);
    },
  });

  // ── POST /accounts — add account ──────────────────────────────────
  server.post("/accounts", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const body = req.body as { platform: string; name: string; credentials: unknown };

      const [account] = await db.insert(socialAccounts).values({
        platform: body.platform,
        name: body.name,
        credentials: body.credentials,
      }).returning({ id: socialAccounts.id, platform: socialAccounts.platform, name: socialAccounts.name, active: socialAccounts.active });

      return reply.status(201).send(account);
    },
  });

  // ── PUT /accounts/:id ─────────────────────────────────────────────
  server.put("/accounts/:id", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { name?: string; credentials?: unknown; active?: boolean };

      const [updated] = await db.update(socialAccounts).set(body).where(eq(socialAccounts.id, id)).returning({ id: socialAccounts.id, platform: socialAccounts.platform, name: socialAccounts.name, active: socialAccounts.active });

      if (!updated) return reply.status(404).send({ error: "Account not found" });
      return reply.send(updated);
    },
  });

  // ── DELETE /accounts/:id ──────────────────────────────────────────
  server.delete("/accounts/:id", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
      return reply.send({ ok: true });
    },
  });

  // ── POST /publish ─────────────────────────────────────────────────
  server.post("/publish", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const body = req.body as { content: string; platforms: string[]; articleId?: string };

      const accounts = await db.select().from(socialAccounts).where(eq(socialAccounts.active, true));

      const results = await publishToAll(body.content, body.platforms, accounts);

      // Store publication records
      for (const result of results) {
        await db.insert(socialPublications).values({
          articleId: body.articleId ?? null,
          platform: result.platform,
          externalId: result.externalId ?? null,
          content: body.content,
          status: result.success ? "sent" : "failed",
          error: result.error ?? null,
          sentAt: result.success ? new Date() : null,
        });
      }

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "SOCIAL_PUBLISHED",
        targetType: "social",
        metadata: { platforms: body.platforms, results },
      });

      return reply.send({ results });
    },
  });

  // ── GET /history ──────────────────────────────────────────────────
  server.get("/history", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const history = await db
        .select()
        .from(socialPublications)
        .orderBy(desc(socialPublications.createdAt))
        .limit(50);
      return reply.send(history);
    },
  });
}
