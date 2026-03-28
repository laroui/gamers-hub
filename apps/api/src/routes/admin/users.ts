import type { FastifyInstance } from "fastify";
import { eq, desc, ilike, sql, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, posts, postComments, userGames, auditLogs } from "../../db/schema.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

export async function adminUsersRoutes(server: FastifyInstance) {
  // ── GET / — list users ────────────────────────────────────────────
  server.get("/", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const query = req.query as { page?: string; limit?: string; search?: string; role?: string };
      const page = Math.max(1, parseInt(query.page ?? "1"));
      const limit = Math.min(50, parseInt(query.limit ?? "20"));
      const offset = (page - 1) * limit;

      const conditions = [];
      if (query.search) conditions.push(ilike(users.email, `%${query.search}%`));
      if (query.role) conditions.push(eq(users.role, query.role));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult, rows] = await Promise.all([
        db.select({ count: sql<number>`cast(count(*) as int)` }).from(users).where(where),
        db.select({
          id: users.id,
          email: users.email,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
          createdAt: users.createdAt,
        }).from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      ]);

      return reply.send({
        users: rows,
        total: totalResult[0]?.count ?? 0,
        page,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
      });
    },
  });

  // ── GET /:id — user detail + stats ───────────────────────────────
  server.get("/:id", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      const [user] = await db
        .select({ id: users.id, email: users.email, username: users.username, avatarUrl: users.avatarUrl, role: users.role, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, id));

      if (!user) return reply.status(404).send({ error: "User not found" });

      const [postCount, commentCount, libraryCount] = await Promise.all([
        db.select({ count: sql<number>`cast(count(*) as int)` }).from(posts).where(eq(posts.authorId, id)),
        db.select({ count: sql<number>`cast(count(*) as int)` }).from(postComments).where(eq(postComments.authorId, id)),
        db.select({ count: sql<number>`cast(count(*) as int)` }).from(userGames).where(eq(userGames.userId, id)),
      ]);

      return reply.send({
        ...user,
        stats: {
          posts: postCount[0]?.count ?? 0,
          comments: commentCount[0]?.count ?? 0,
          libraryItems: libraryCount[0]?.count ?? 0,
        },
      });
    },
  });

  // ── PUT /:id/role ─────────────────────────────────────────────────
  server.put("/:id/role", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { role } = req.body as { role: string };

      if (!["user", "admin", "moderator"].includes(role)) {
        return reply.status(400).send({ error: "Invalid role" });
      }

      const [updated] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning({ id: users.id, email: users.email, role: users.role });

      if (!updated) return reply.status(404).send({ error: "User not found" });

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "USER_ROLE_CHANGED",
        targetType: "user",
        targetId: id,
        metadata: { newRole: role },
      });

      return reply.send(updated);
    },
  });

  // ── POST /:id/ban ─────────────────────────────────────────────────
  server.post("/:id/ban", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      const [updated] = await db
        .update(users)
        .set({ role: "banned" })
        .where(eq(users.id, id))
        .returning({ id: users.id, email: users.email, role: users.role });

      if (!updated) return reply.status(404).send({ error: "User not found" });

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "USER_BANNED",
        targetType: "user",
        targetId: id,
      });

      return reply.send(updated);
    },
  });

  // ── DELETE /:id ───────────────────────────────────────────────────
  server.delete("/:id", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      await db.delete(users).where(eq(users.id, id));

      await db.insert(auditLogs).values({
        adminId: req.user.userId,
        action: "USER_DELETED",
        targetType: "user",
        targetId: id,
      });

      return reply.send({ ok: true });
    },
  });
}
