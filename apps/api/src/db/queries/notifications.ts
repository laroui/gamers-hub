import { db } from "../client.js";
import { notifications } from "../schema.js";
import { eq, and, isNull, desc, lt } from "drizzle-orm";

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    payload: data.payload ?? null,
  });
}

export async function getUserNotifications(
  userId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ data: (typeof notifications.$inferSelect)[]; nextCursor: string | null }> {
  const limit = Math.min(opts.limit ?? 20, 50);
  const rows = await db
    .select()
    .from(notifications)
    .where(
      opts.cursor
        ? and(
            eq(notifications.userId, userId),
            lt(notifications.createdAt, new Date(opts.cursor)),
          )
        : eq(notifications.userId, userId),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1]!.createdAt.toISOString() : null;
  return { data, nextCursor };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function markOneRead(userId: string, notificationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
