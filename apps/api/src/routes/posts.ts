import type { FastifyInstance } from "fastify";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { posts, postComments, postLikes, users } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

// ── Zod schemas ───────────────────────────────────────────────

const createPostBody = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(20000),
  coverUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

const createCommentBody = z.object({
  body: z.string().min(1).max(2000),
});

// ── Helper: enrich posts with counts + likedByMe ──────────────

async function enrichPosts(rawPosts: (typeof posts.$inferSelect)[], viewerId?: string) {
  if (rawPosts.length === 0) return [];

  const ids = rawPosts.map((p) => p.id);

  // Like counts
  const likeCounts = await db
    .select({ postId: postLikes.postId, count: sql<number>`cast(count(*) as int)` })
    .from(postLikes)
    .where(inArray(postLikes.postId, ids))
    .groupBy(postLikes.postId);

  const likeMap = new Map(likeCounts.map((r) => [r.postId, r.count]));

  // Comment counts
  const commentCounts = await db
    .select({ postId: postComments.postId, count: sql<number>`cast(count(*) as int)` })
    .from(postComments)
    .where(inArray(postComments.postId, ids))
    .groupBy(postComments.postId);

  const commentMap = new Map(commentCounts.map((r) => [r.postId, r.count]));

  // Liked by viewer
  const likedSet = new Set<string>();
  if (viewerId) {
    const liked = await db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(and(eq(postLikes.userId, viewerId), inArray(postLikes.postId, ids)));
    liked.forEach((r) => likedSet.add(r.postId));
  }

  // Author info
  const authorIds = [...new Set(rawPosts.map((p) => p.authorId))];
  const authorRows = await db
    .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, authorIds));
  const authorMap = new Map(authorRows.map((a) => [a.id, a]));

  return rawPosts.map((p) => {
    const author = authorMap.get(p.authorId);
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      coverUrl: p.coverUrl,
      tags: p.tags,
      pinned: p.pinned,
      author: {
        id: author?.id ?? p.authorId,
        username: author?.username ?? "unknown",
        avatarUrl: author?.avatarUrl ?? null,
      },
      likeCount: likeMap.get(p.id) ?? 0,
      commentCount: commentMap.get(p.id) ?? 0,
      likedByMe: likedSet.has(p.id),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

// ── Routes ────────────────────────────────────────────────────

export async function postsRoutes(server: FastifyInstance) {
  // ── GET /posts ─────────────────────────────────────────────
  server.get("/", {
    handler: async (req, reply) => {
      const { cursor, limit = "20" } = req.query as { cursor?: string; limit?: string };
      const take = Math.min(Number(limit), 50);

      let viewerId: string | undefined;
      try {
        const payload = await req.jwtVerify<{ sub: string }>();
        viewerId = payload.sub;
      } catch { /* unauthenticated visitor */ }

      const offset = cursor ? parseInt(cursor, 10) : 0;
      const rows = await db
        .select()
        .from(posts)
        .orderBy(desc(posts.pinned), desc(posts.createdAt))
        .limit(take + 1)
        .offset(offset);

      const hasMore = rows.length > take;
      const page = rows.slice(0, take);
      const nextCursor = hasMore ? String(offset + take) : null;

      const enriched = await enrichPosts(page, viewerId);
      return reply.send({ data: enriched, nextCursor, total: enriched.length });
    },
  });

  // ── POST /posts ────────────────────────────────────────────
  server.post("/", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const parsed = createPostBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "ValidationError", message: parsed.error.issues[0]?.message });
      }

      const { userId } = req.user;
      const { title, body, coverUrl, tags } = parsed.data;

      const [post] = await db
        .insert(posts)
        .values({ authorId: userId, title, body, coverUrl: coverUrl ?? null, tags })
        .returning();

      if (!post) return reply.code(500).send({ error: "InternalError", message: "Failed to create post" });

      const [enriched] = await enrichPosts([post], userId);
      return reply.code(201).send(enriched);
    },
  });

  // ── GET /posts/:id ─────────────────────────────────────────
  server.get("/:id", {
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };

      let viewerId: string | undefined;
      try {
        const payload = await req.jwtVerify<{ sub: string }>();
        viewerId = payload.sub;
      } catch { /* visitor */ }

      const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!post) return reply.code(404).send({ error: "NotFound", message: "Post not found" });

      const [enriched] = await enrichPosts([post], viewerId);
      return reply.send(enriched);
    },
  });

  // ── DELETE /posts/:id ──────────────────────────────────────
  server.delete("/:id", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { userId } = req.user;

      const [post] = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id)).limit(1);
      if (!post) return reply.code(404).send({ error: "NotFound", message: "Post not found" });
      if (post.authorId !== userId) return reply.code(403).send({ error: "Forbidden" });

      await db.delete(posts).where(eq(posts.id, id));
      return reply.code(204).send();
    },
  });

  // ── POST /posts/:id/like ───────────────────────────────────
  server.post("/:id/like", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { userId } = req.user;

      const [existing] = await db
        .select()
        .from(postLikes)
        .where(and(eq(postLikes.postId, id), eq(postLikes.userId, userId)))
        .limit(1);

      if (existing) {
        await db.delete(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, userId)));
        return reply.send({ liked: false });
      }

      await db.insert(postLikes).values({ postId: id, userId });
      return reply.send({ liked: true });
    },
  });

  // ── GET /posts/:id/comments ────────────────────────────────
  server.get("/:id/comments", {
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { cursor, limit = "30" } = req.query as { cursor?: string; limit?: string };
      const take = Math.min(Number(limit), 100);
      const offset = cursor ? parseInt(cursor, 10) : 0;

      const rows = await db
        .select({
          id: postComments.id,
          postId: postComments.postId,
          body: postComments.body,
          createdAt: postComments.createdAt,
          updatedAt: postComments.updatedAt,
          authorId: postComments.authorId,
          authorUsername: users.username,
          authorAvatarUrl: users.avatarUrl,
        })
        .from(postComments)
        .leftJoin(users, eq(postComments.authorId, users.id))
        .where(eq(postComments.postId, id))
        .orderBy(desc(postComments.createdAt))
        .limit(take + 1)
        .offset(offset);

      const hasMore = rows.length > take;
      const page = rows.slice(0, take);
      const nextCursor = hasMore ? String(offset + take) : null;

      const data = page.map((r) => ({
        id: r.id,
        postId: r.postId,
        body: r.body,
        author: {
          id: r.authorId,
          username: r.authorUsername ?? "unknown",
          avatarUrl: r.authorAvatarUrl ?? null,
        },
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return reply.send({ data, nextCursor });
    },
  });

  // ── POST /posts/:id/comments ───────────────────────────────
  server.post("/:id/comments", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      const { userId } = req.user;

      const parsed = createCommentBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "ValidationError", message: parsed.error.issues[0]?.message });
      }

      const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1);
      if (!post) return reply.code(404).send({ error: "NotFound", message: "Post not found" });

      const [comment] = await db
        .insert(postComments)
        .values({ postId: id, authorId: userId, body: parsed.data.body })
        .returning();

      const [author] = await db
        .select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return reply.code(201).send({
        id: comment?.id,
        postId: id,
        body: comment?.body,
        author: {
          id: author?.id ?? userId,
          username: author?.username ?? "unknown",
          avatarUrl: author?.avatarUrl ?? null,
        },
        createdAt: comment?.createdAt.toISOString(),
        updatedAt: comment?.updatedAt.toISOString(),
      });
    },
  });

  // ── DELETE /posts/:id/comments/:commentId ──────────────────
  server.delete("/:id/comments/:commentId", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { commentId } = req.params as { id: string; commentId: string };
      const { userId } = req.user;

      const [comment] = await db
        .select({ authorId: postComments.authorId })
        .from(postComments)
        .where(eq(postComments.id, commentId))
        .limit(1);

      if (!comment) return reply.code(404).send({ error: "NotFound" });
      if (comment.authorId !== userId) return reply.code(403).send({ error: "Forbidden" });

      await db.delete(postComments).where(eq(postComments.id, commentId));
      return reply.code(204).send();
    },
  });
}
