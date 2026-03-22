import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
  deleteNotification,
} from "../db/queries/notifications.js";
import type { Notification } from "@gamers-hub/types";

export async function notificationsRoutes(server: FastifyInstance) {
  server.get("/", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const { limit, cursor } = req.query as { limit?: string; cursor?: string };
      const { data, nextCursor } = await getUserNotifications(userId, {
        limit: limit ? parseInt(limit, 10) : 20,
        ...(cursor !== undefined ? { cursor } : {}),
      });
      const mapped: Notification[] = data.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type as Notification["type"],
        title: n.title,
        body: n.body,
        payload: n.payload as Record<string, unknown> | null,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        isRead: n.readAt !== null,
      }));
      reply.send({ data: mapped, nextCursor });
    },
  });

  server.get("/unread-count", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const count = await getUnreadCount(req.user.userId);
      reply.send({ count });
    },
  });

  server.patch("/read", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      await markAllRead(req.user.userId);
      reply.send({ ok: true });
    },
  });

  server.patch("/:id/read", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      await markOneRead(req.user.userId, id);
      reply.send({ ok: true });
    },
  });

  server.delete("/:id", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { id } = req.params as { id: string };
      await deleteNotification(req.user.userId, id);
      reply.code(204).send();
    },
  });
}
