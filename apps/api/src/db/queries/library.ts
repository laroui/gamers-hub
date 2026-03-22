import { and, asc, desc, eq, gt, ilike, inArray, lt, sql } from "drizzle-orm";
import type { UserGame, LibraryQueryParams, GameStatus, PlatformId } from "@gamers-hub/types";
import { db } from "../client.js";
import { userGames, games } from "../schema.js";

// ── Row → domain type mapper ──────────────────────────────────

type RawUserGameRow = typeof userGames.$inferSelect & {
  game: typeof games.$inferSelect;
};

function toUserGame(row: RawUserGameRow): UserGame {
  return {
    id: row.id,
    userId: row.userId,
    game: {
      id: row.game.id,
      igdbId: row.game.igdbId,
      title: row.game.title,
      coverUrl: row.game.coverUrl,
      backgroundUrl: row.game.backgroundUrl,
      genres: row.game.genres,
      platforms: row.game.platforms,
      releaseYear: row.game.releaseYear,
      metacritic: row.game.metacritic,
      description: row.game.description,
    },
    platform: row.platform as PlatformId,
    platformGameId: row.platformGameId,
    status: row.status as GameStatus,
    minutesPlayed: row.minutesPlayed,
    hoursPlayed: Math.round((row.minutesPlayed / 60) * 10) / 10,
    lastPlayedAt: row.lastPlayedAt ? row.lastPlayedAt.toISOString() : null,
    completionPct: row.completionPct,
    achievementsEarned: row.achievementsEarned,
    achievementsTotal: row.achievementsTotal,
    userRating: row.userRating,
    userNotes: row.userNotes,
    addedAt: row.addedAt.toISOString(),
  };
}

// ── getUserLibrary ─────────────────────────────────────────────

export async function getUserLibrary(
  userId: string,
  params: LibraryQueryParams,
): Promise<{ data: UserGame[]; nextCursor: string | null; total: number }> {
  const limit = Math.min(params.limit ?? 20, 100);
  const sort = params.sort ?? "recent";

  // Build filter conditions
  const conditions = [eq(userGames.userId, userId)];

  if (params.platform) {
    conditions.push(eq(userGames.platform, params.platform));
  }
  if (params.status) {
    conditions.push(eq(userGames.status, params.status));
  }
  if (params.genre) {
    conditions.push(sql`${games.genres} @> ARRAY[${params.genre}]::text[]`);
  }
  if (params.search) {
    conditions.push(ilike(games.title, `%${params.search}%`));
  }

  // Cursor-based pagination
  if (params.cursor) {
    try {
      const cursor = JSON.parse(Buffer.from(params.cursor, "base64url").toString("utf8")) as {
        val: string;
        id: string;
      };
      switch (sort) {
        case "recent":
          conditions.push(
            sql`(${userGames.lastPlayedAt}, ${userGames.id}) < (${cursor.val}::timestamptz, ${cursor.id}::uuid)`,
          );
          break;
        case "alpha":
          conditions.push(
            sql`(${games.title}, ${userGames.id}) > (${cursor.val}, ${cursor.id}::uuid)`,
          );
          break;
        case "hours":
          conditions.push(
            sql`(${userGames.minutesPlayed}, ${userGames.id}) < (${cursor.val}::int, ${cursor.id}::uuid)`,
          );
          break;
        case "progress":
          conditions.push(
            sql`(${userGames.completionPct}, ${userGames.id}) < (${cursor.val}::real, ${cursor.id}::uuid)`,
          );
          break;
        case "rating":
          conditions.push(
            sql`(${userGames.userRating}, ${userGames.id}) < (${cursor.val}::int, ${cursor.id}::uuid)`,
          );
          break;
      }
    } catch {
      // Invalid cursor — ignore and start from beginning
    }
  }

  const where = and(...conditions);

  // Count query (without cursor for accurate total)
  const countConditions = [eq(userGames.userId, userId)];
  if (params.platform) countConditions.push(eq(userGames.platform, params.platform));
  if (params.status) countConditions.push(eq(userGames.status, params.status));
  if (params.genre)
    countConditions.push(sql`${games.genres} @> ARRAY[${params.genre}]::text[]`);
  if (params.search) countConditions.push(ilike(games.title, `%${params.search}%`));

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(and(...countConditions));

  const total = countRow?.count ?? 0;

  // Sort order
  let orderBy;
  switch (sort) {
    case "alpha":
      orderBy = [asc(games.title), asc(userGames.id)];
      break;
    case "hours":
      orderBy = [desc(userGames.minutesPlayed), desc(userGames.id)];
      break;
    case "progress":
      orderBy = [desc(userGames.completionPct), desc(userGames.id)];
      break;
    case "rating":
      orderBy = [desc(userGames.userRating), desc(userGames.id)];
      break;
    default: // recent
      orderBy = [desc(userGames.lastPlayedAt), desc(userGames.id)];
  }

  const rows = await db
    .select()
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && slice.length > 0) {
    const last = slice[slice.length - 1]!;
    let val: string;
    switch (sort) {
      case "alpha":
        val = last.games.title;
        break;
      case "hours":
        val = String(last.user_games.minutesPlayed);
        break;
      case "progress":
        val = String(last.user_games.completionPct);
        break;
      case "rating":
        val = String(last.user_games.userRating ?? 0);
        break;
      default:
        val = last.user_games.lastPlayedAt?.toISOString() ?? new Date(0).toISOString();
    }
    nextCursor = Buffer.from(
      JSON.stringify({ val, id: last.user_games.id }),
      "utf8",
    ).toString("base64url");
  }

  return {
    data: slice.map((row) => toUserGame({ ...row.user_games, game: row.games })),
    nextCursor,
    total,
  };
}

// ── getRecentlyPlayed ─────────────────────────────────────────

export async function getRecentlyPlayed(userId: string, limit = 10): Promise<UserGame[]> {
  const rows = await db
    .select()
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(and(eq(userGames.userId, userId), gt(userGames.minutesPlayed, 0)))
    .orderBy(desc(userGames.lastPlayedAt))
    .limit(limit);

  return rows.map((row) => toUserGame({ ...row.user_games, game: row.games }));
}

// ── getUserGameById ───────────────────────────────────────────

export async function getUserGameById(
  userId: string,
  userGameId: string,
): Promise<UserGame | null> {
  const rows = await db
    .select()
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(and(eq(userGames.userId, userId), eq(userGames.id, userGameId)))
    .limit(1);

  if (!rows[0]) return null;
  return toUserGame({ ...rows[0].user_games, game: rows[0].games });
}

// ── upsertUserGame ────────────────────────────────────────────

export async function upsertUserGame(
  userId: string,
  gameId: string,
  data: {
    platform: string;
    platformGameId: string;
    status?: string;
    minutesPlayed?: number;
    lastPlayedAt?: Date | null;
    completionPct?: number;
    achievementsEarned?: number;
    achievementsTotal?: number;
    userRating?: number | null;
    userNotes?: string | null;
  },
): Promise<string> {
  const [row] = await db
    .insert(userGames)
    .values({
      userId,
      gameId,
      platform: data.platform,
      platformGameId: data.platformGameId,
      status: data.status ?? "library",
      minutesPlayed: data.minutesPlayed ?? 0,
      lastPlayedAt: data.lastPlayedAt,
      completionPct: data.completionPct ?? 0,
      achievementsEarned: data.achievementsEarned ?? 0,
      achievementsTotal: data.achievementsTotal ?? 0,
      userRating: data.userRating,
      userNotes: data.userNotes,
    })
    .onConflictDoUpdate({
      target: [userGames.userId, userGames.platform, userGames.platformGameId],
      set: {
        status: sql`EXCLUDED.status`,
        // Use GREATEST to never decrease playtime
        minutesPlayed: sql`GREATEST(user_games.minutes_played, EXCLUDED.minutes_played)`,
        lastPlayedAt: sql`GREATEST(user_games.last_played_at, EXCLUDED.last_played_at)`,
        // Use GREATEST for completion and achievements
        completionPct: sql`GREATEST(user_games.completion_pct, EXCLUDED.completion_pct)`,
        achievementsEarned: sql`GREATEST(user_games.achievements_earned, EXCLUDED.achievements_earned)`,
        achievementsTotal: sql`GREATEST(user_games.achievements_total, EXCLUDED.achievements_total)`,
        userRating: sql`COALESCE(EXCLUDED.user_rating, user_games.user_rating)`,
        userNotes: sql`COALESCE(EXCLUDED.user_notes, user_games.user_notes)`,
      },
    })
    .returning({ id: userGames.id });

  return row!.id;
}

// ── updateUserGame ────────────────────────────────────────────

export async function updateUserGame(
  userId: string,
  userGameId: string,
  patch: Partial<{
    status: string;
    minutesPlayed: number;
    lastPlayedAt: Date | null;
    completionPct: number;
    achievementsEarned: number;
    achievementsTotal: number;
    userRating: number | null;
    userNotes: string | null;
  }>,
): Promise<UserGame | null> {
  const [updated] = await db
    .update(userGames)
    .set(patch)
    .where(and(eq(userGames.userId, userId), eq(userGames.id, userGameId)))
    .returning();

  if (!updated) return null;

  // Fetch with joined game
  return getUserGameById(userId, userGameId);
}

// ── deleteUserGame ────────────────────────────────────────────

export async function deleteUserGame(userId: string, userGameId: string): Promise<boolean> {
  const result = await db
    .delete(userGames)
    .where(and(eq(userGames.userId, userId), eq(userGames.id, userGameId)))
    .returning({ id: userGames.id });

  return result.length > 0;
}
