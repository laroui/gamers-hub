import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { articles, auditLogs } from "../../db/schema.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
function makeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function adminArticlesRoutes(server: FastifyInstance) {
  // ── GET / — list all articles ─────────────────────────────────────
  server.get("/", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const all = await db.select().from(articles).orderBy(desc(articles.createdAt));
      return reply.send(all);
    },
  });

  // ── POST / — create article ───────────────────────────────────────
  server.post("/", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const body = req.body as {
        title: string;
        summary: string;
        content: string;
        coverImageUrl?: string;
        tag?: string;
      };

      const slug = makeSlug(body.title) + "-" + Date.now().toString(36);

      const [article] = await db.insert(articles).values({
        authorId: req.user.userId,
        title: body.title,
        slug,
        summary: body.summary,
        content: body.content,
        coverImageUrl: body.coverImageUrl ?? null,
        tag: body.tag ?? "news",
      }).returning();

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "ARTICLE_CREATED",
        targetType: "article",
        targetId: article!.id,
        metadata: { title: body.title },
      });

      return reply.status(201).send(article);
    },
  });

  // ── PUT /:id — update article ─────────────────────────────────────
  server.put("/:id", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        title?: string;
        summary?: string;
        content?: string;
        coverImageUrl?: string;
        tag?: string;
        status?: string;
      };

      const [updated] = await db
        .update(articles)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(articles.id, id))
        .returning();

      if (!updated) return reply.status(404).send({ error: "Article not found" });

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "ARTICLE_UPDATED",
        targetType: "article",
        targetId: id,
      });

      return reply.send(updated);
    },
  });

  // ── POST /:id/publish ─────────────────────────────────────────────
  server.post("/:id/publish", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      const [updated] = await db
        .update(articles)
        .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(articles.id, id))
        .returning();

      if (!updated) return reply.status(404).send({ error: "Article not found" });

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "ARTICLE_PUBLISHED",
        targetType: "article",
        targetId: id,
      });

      return reply.send(updated);
    },
  });

  // ── POST /:id/archive ─────────────────────────────────────────────
  server.post("/:id/archive", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      const [updated] = await db
        .update(articles)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(articles.id, id))
        .returning();

      if (!updated) return reply.status(404).send({ error: "Article not found" });

      return reply.send(updated);
    },
  });

  // ── DELETE /:id ───────────────────────────────────────────────────
  server.delete("/:id", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      await db.delete(articles).where(eq(articles.id, id));

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "ARTICLE_DELETED",
        targetType: "article",
        targetId: id,
      });

      return reply.send({ ok: true });
    },
  });
}
