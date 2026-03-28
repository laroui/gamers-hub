import type { FastifyInstance } from "fastify";
import { sql, desc, gte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, posts, postComments, userGames, articles, auditLogs } from "../../db/schema.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

export async function adminAnalyticsRoutes(server: FastifyInstance) {
  // ── GET /overview ─────────────────────────────────────────────────
  server.get("/overview", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const [totalUsers] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(users);
      const [totalPosts] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(posts);
      const [totalComments] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(postComments);
      const [totalLibrary] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(userGames);
      const [totalArticles] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(articles);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [newUsers] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(users)
        .where(gte(users.createdAt, weekAgo));

      return reply.send({
        totalUsers: totalUsers?.count ?? 0,
        totalPosts: totalPosts?.count ?? 0,
        totalComments: totalComments?.count ?? 0,
        totalLibraryItems: totalLibrary?.count ?? 0,
        totalArticles: totalArticles?.count ?? 0,
        newUsersThisWeek: newUsers?.count ?? 0,
      });
    },
  });

  // ── GET /signups?days=30 ─────────────────────────────────────────
  server.get("/signups", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const query = req.query as { days?: string };
      const days = Math.min(parseInt(query.days ?? "30"), 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const data = await db
        .select({
          date: sql<string>`to_char(created_at, 'YYYY-MM-DD')`,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(users)
        .where(gte(users.createdAt, since))
        .groupBy(sql`to_char(created_at, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(created_at, 'YYYY-MM-DD')`);

      return reply.send(data);
    },
  });

  // ── GET /activity ─────────────────────────────────────────────────
  server.get("/activity", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentUsers = await db
        .select({ id: users.id, email: users.email, username: users.username, role: users.role, createdAt: users.createdAt })
        .from(users)
        .where(gte(users.createdAt, since))
        .orderBy(desc(users.createdAt))
        .limit(10);

      return reply.send({ recentUsers });
    },
  });

  // ── GET /audit-logs ───────────────────────────────────────────────
  server.get("/audit-logs", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const logs = await db
        .select({
          id: auditLogs.id,
          adminId: auditLogs.adminId,
          adminUsername: users.username,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .innerJoin(users, sql`${users.id} = ${auditLogs.adminId}`)
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);

      return reply.send(logs);
    },
  });
}
