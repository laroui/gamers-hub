// Inline query functions — mirrors the B2 query functions the worker needs.
// We cannot re-export from apps/api because that would transitively load the
// API's env validation (which requires JWT_SECRET etc. not present in the worker env).
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { PlatformId } from "@gamers-hub/types";
import { db } from "./client.js";
import { games, userGames, playSessions, platformConnections, achievements } from "./schema.js";

// ── Games ──────────────────────────────────────────────────────

export async function getGameById(id: string): Promise<any | null> {
  const [row] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return row ?? null;
}

export async function findGameBySteamId(steamAppId: number): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.steamAppId, steamAppId))
    .limit(1);
  return row ?? null;
}

export async function findGameByIgdbId(igdbId: number): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: games.id })
    .from(games)
    .where(eq(games.igdbId, igdbId))
    .limit(1);
  return row ?? null;
}

export async function upsertGame(data: {
  id?: string;
  igdbId?: number | null;
  steamAppId?: number | null;
  title: string;
  coverUrl?: string | null;
  genres?: string[];
  releaseYear?: number | null;
  metacritic?: number | null;
  description?: string | null;
  screenshotUrls?: string[];
}): Promise<{ id: string }> {
  // 1. Try to find existing game by ID, IGDB ID, or Steam App ID
  let existingId: string | null = data.id ?? null;

  if (!existingId && data.igdbId) {
    const row = await findGameByIgdbId(data.igdbId);
    if (row) existingId = row.id;
  }
  if (!existingId && data.steamAppId) {
    const row = await findGameBySteamId(data.steamAppId);
    if (row) existingId = row.id;
  }

  // 2. If exists, UPDATE
  if (existingId) {
    const [row] = await db
      .update(games)
      .set({
        title: data.title,
        coverUrl: data.coverUrl ?? sql`games.cover_url`,
        genres: (data.genres && data.genres.length > 0) ? data.genres : sql`games.genres`,
        releaseYear: data.releaseYear ?? sql`games.release_year`,
        metacritic: data.metacritic ?? sql`games.metacritic`,
        description: data.description ?? sql`games.description`,
        screenshotUrls: (data.screenshotUrls && data.screenshotUrls.length > 0) ? data.screenshotUrls : sql`games.screenshot_urls`,
        steamAppId: data.steamAppId ?? sql`games.steam_app_id`,
        igdbId: data.igdbId ?? sql`games.igdb_id`,
      })
      .where(eq(games.id, existingId))
      .returning({ id: games.id });
    return row!;
  }

  // 3. If new, INSERT
  const [row] = await db
    .insert(games)
    .values({
      igdbId: data.igdbId ?? null,
      steamAppId: data.steamAppId ?? null,
      title: data.title,
      coverUrl: data.coverUrl ?? null,
      genres: data.genres ?? [],
      releaseYear: data.releaseYear ?? null,
      metacritic: data.metacritic ?? null,
      description: data.description ?? null,
      screenshotUrls: data.screenshotUrls ?? [],
    })
    .returning({ id: games.id });

  return row!;
}

export async function getAllGamesMissingMetadata(): Promise<Array<{ id: string; title: string; steamAppId: number | null; igdbId: number | null; coverUrl: string | null }>> {
  return db
    .select({
      id: games.id,
      title: games.title,
      steamAppId: games.steamAppId,
      igdbId: games.igdbId,
      coverUrl: games.coverUrl,
    })
    .from(games)
    .where(sql`games.cover_url IS NULL OR games.screenshot_urls = '{}' OR games.description IS NULL`);
}

// ── User Games ────────────────────────────────────────────────

export async function upsertUserGame(
  userId: string,
  gameId: string,
  data: {
    platform: string;
    platformGameId: string;
    minutesPlayed?: number;
    lastPlayedAt?: Date | null;
    achievementsEarned?: number;
    achievementsTotal?: number;
    completionPct?: number;
    stats?: Record<string, any>;
  },
): Promise<string> {
  const [row] = await db
    .insert(userGames)
    .values({
      userId,
      gameId,
      platform: data.platform,
      platformGameId: data.platformGameId,
      status: "library",
      minutesPlayed: data.minutesPlayed ?? 0,
      lastPlayedAt: data.lastPlayedAt,
      completionPct: data.completionPct ?? 0,
      achievementsEarned: data.achievementsEarned ?? 0,
      achievementsTotal: data.achievementsTotal ?? 0,
      stats: data.stats ?? {},
    })
    .onConflictDoUpdate({
      target: [userGames.userId, userGames.platform, userGames.platformGameId],
      set: {
        minutesPlayed: sql`GREATEST(user_games.minutes_played, EXCLUDED.minutes_played)`,
        lastPlayedAt: sql`GREATEST(user_games.last_played_at, EXCLUDED.last_played_at)`,
        achievementsEarned: sql`GREATEST(user_games.achievements_earned, EXCLUDED.achievements_earned)`,
        achievementsTotal: sql`GREATEST(user_games.achievements_total, EXCLUDED.achievements_total)`,
        completionPct: sql`GREATEST(user_games.completion_pct, EXCLUDED.completion_pct)`,
        stats: sql`EXCLUDED.stats`,
      },
    })
    .returning({ id: userGames.id });
  return row!.id;
}

// ── Play Sessions ─────────────────────────────────────────────

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

// ── Achievements ──────────────────────────────────────────────
export async function bulkInsertAchievements(
  userGameId: string,
  data: Array<{
    platformId: string;
    title: string;
    description?: string | null;
    iconUrl?: string | null;
    earnedAt?: Date | null;
    rarityPct?: number | null;
    points?: number | null;
    metadata?: Record<string, any>;
  }>,
): Promise<number> {
  if (data.length === 0) return 0;

  // Clear existing for this user_game (Full overwrite approach — simpler for now)
  await db.delete(achievements).where(eq(achievements.userGameId, userGameId));

  const result = await db.insert(achievements).values(
    data.map((a) => ({
      userGameId,
      platformId: a.platformId,
      title: a.title,
      description: a.description ?? null,
      iconUrl: a.iconUrl ?? null,
      earnedAt: a.earnedAt ?? null,
      rarityPct: a.rarityPct ?? null,
      points: a.points ?? null,
      metadata: a.metadata ?? {},
    })),
  )
  .returning({ id: achievements.id });

  return result.length;
}

// ── Platform Connections ──────────────────────────────────────

type RawConnectionRow = typeof platformConnections.$inferSelect;

export async function getConnection(
  userId: string,
  platform: string,
): Promise<RawConnectionRow | null> {
  const [row] = await db
    .select()
    .from(platformConnections)
    .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)))
    .limit(1);
  return row ?? null;
}

export async function upsertConnection(data: {
  userId: string;
  platform: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  platformUid?: string | null;
  displayName?: string | null;
  lastSyncedAt?: Date | null;
  syncStatus?: string;
}): Promise<void> {
  await db
    .insert(platformConnections)
    .values({
      userId: data.userId,
      platform: data.platform,
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      platformUid: data.platformUid ?? null,
      displayName: data.displayName ?? null,
      lastSyncedAt: data.lastSyncedAt ?? null,
      syncStatus: data.syncStatus ?? "pending",
    })
    .onConflictDoUpdate({
      target: [platformConnections.userId, platformConnections.platform],
      set: {
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        platformUid: data.platformUid ?? null,
        displayName: data.displayName ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null,
        syncStatus: data.syncStatus ?? "pending",
      },
    });
}

export async function updateSyncStatus(
  userId: string,
  platform: string,
  status: string,
  lastSyncedAt?: Date,
): Promise<void> {
  await db
    .update(platformConnections)
    .set({ syncStatus: status, ...(lastSyncedAt ? { lastSyncedAt } : {}) })
    .where(
      and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)),
    );
}

// Remove userGames for a platform that are NOT in the given set of platformGameIds.
// Called after a full sync to prune stale / seeded entries.
// Guard: if keepIds is empty we skip — avoids wiping everything on an empty sync.
export async function clearStaleUserGames(
  userId: string,
  platform: string,
  keepPlatformGameIds: string[],
): Promise<number> {
  if (keepPlatformGameIds.length === 0) return 0;
  const result = await db
    .delete(userGames)
    .where(
      and(
        eq(userGames.userId, userId),
        eq(userGames.platform, platform),
        notInArray(userGames.platformGameId, keepPlatformGameIds),
      ),
    )
    .returning({ id: userGames.id });
  return result.length;
}

export async function getAllConnectedPlatforms(): Promise<RawConnectionRow[]> {
  return db
    .select()
    .from(platformConnections)
    .where(eq(platformConnections.syncStatus, "success"));
}
