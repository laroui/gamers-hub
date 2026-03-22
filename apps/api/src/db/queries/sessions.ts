import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { PlaySession, PlatformId } from "@gamers-hub/types";
import { db } from "../client.js";
import { playSessions, userGames, games } from "../schema.js";

// ── Row → domain type mapper ──────────────────────────────────

type RawSessionRow = typeof playSessions.$inferSelect & {
  gameTitle: string;
  gameCoverUrl: string | null;
};

function toPlaySession(row: RawSessionRow): PlaySession {
  return {
    id: row.id,
    userGameId: row.userGameId,
    gameTitle: row.gameTitle,
    gameCoverUrl: row.gameCoverUrl,
    platform: row.platform as PlatformId,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    minutes: row.minutes,
    device: row.device,
  };
}

// ── getPlaySessions ───────────────────────────────────────────

export async function getPlaySessions(
  userId: string,
  opts?: {
    userGameId?: string;
    limit?: number;
    cursor?: string; // ISO timestamp
  },
): Promise<{ data: PlaySession[]; nextCursor: string | null }> {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const conditions = [eq(playSessions.userId, userId)];

  if (opts?.userGameId) {
    conditions.push(eq(playSessions.userGameId, opts.userGameId));
  }

  if (opts?.cursor) {
    const cursorDate = new Date(opts.cursor);
    conditions.push(lt(playSessions.startedAt, cursorDate));
  }

  const rows = await db
    .select({
      session: playSessions,
      gameTitle: games.title,
      gameCoverUrl: games.coverUrl,
    })
    .from(playSessions)
    .innerJoin(userGames, eq(playSessions.userGameId, userGames.id))
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(and(...conditions))
    .orderBy(desc(playSessions.startedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && slice.length > 0) {
    nextCursor = slice[slice.length - 1]!.session.startedAt.toISOString();
  }

  return {
    data: slice.map((row) =>
      toPlaySession({
        ...row.session,
        gameTitle: row.gameTitle,
        gameCoverUrl: row.gameCoverUrl,
      }),
    ),
    nextCursor,
  };
}

// ── insertPlaySession ─────────────────────────────────────────

export async function insertPlaySession(data: {
  userId: string;
  userGameId: string;
  startedAt: Date;
  endedAt?: Date | null;
  minutes: number;
  platform: string;
  device?: string | null;
}): Promise<string> {
  // Use a transaction to atomically insert session + update user_game
  return await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(playSessions)
      .values({
        userId: data.userId,
        userGameId: data.userGameId,
        startedAt: data.startedAt,
        endedAt: data.endedAt ?? null,
        minutes: data.minutes,
        platform: data.platform,
        device: data.device ?? null,
      })
      .returning({ id: playSessions.id });

    // Atomically update minutes_played and last_played_at
    await tx
      .update(userGames)
      .set({
        minutesPlayed: sql`${userGames.minutesPlayed} + ${data.minutes}`,
        lastPlayedAt: sql`GREATEST(${userGames.lastPlayedAt}, ${data.startedAt.toISOString()}::timestamptz)`,
      })
      .where(eq(userGames.id, data.userGameId));

    return session!.id;
  });
}

// ── bulkInsertSessions ────────────────────────────────────────

export async function bulkInsertSessions(
  sessions: Array<{
    userId: string;
    userGameId: string;
    startedAt: Date;
    endedAt?: Date | null;
    minutes: number;
    platform: string;
    device?: string | null;
  }>,
): Promise<number> {
  if (sessions.length === 0) return 0;

  const result = await db
    .insert(playSessions)
    .values(
      sessions.map((s) => ({
        userId: s.userId,
        userGameId: s.userGameId,
        startedAt: s.startedAt,
        endedAt: s.endedAt ?? null,
        minutes: s.minutes,
        platform: s.platform,
        device: s.device ?? null,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: playSessions.id });

  return result.length;
}
