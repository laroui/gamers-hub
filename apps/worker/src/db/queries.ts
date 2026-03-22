// Inline query functions — mirrors the B2 query functions the worker needs.
// We cannot re-export from apps/api because that would transitively load the
// API's env validation (which requires JWT_SECRET etc. not present in the worker env).
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { PlatformId } from "@gamers-hub/types";
import { db } from "./client.js";
import { games, userGames, playSessions, platformConnections } from "./schema.js";

// ── Games ──────────────────────────────────────────────────────

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
  igdbId?: number | null;
  steamAppId?: number | null;
  title: string;
}): Promise<{ id: string }> {
  // Choose conflict target based on available IDs
  if (data.igdbId) {
    const [row] = await db
      .insert(games)
      .values({ igdbId: data.igdbId, steamAppId: data.steamAppId ?? null, title: data.title })
      .onConflictDoUpdate({
        target: games.igdbId,
        set: { title: sql`EXCLUDED.title`, steamAppId: sql`COALESCE(EXCLUDED.steam_app_id, games.steam_app_id)` },
      })
      .returning({ id: games.id });
    return row!;
  }

  if (data.steamAppId) {
    const [row] = await db
      .insert(games)
      .values({ igdbId: null, steamAppId: data.steamAppId, title: data.title })
      .onConflictDoUpdate({
        target: games.steamAppId,
        set: { title: sql`EXCLUDED.title` },
      })
      .returning({ id: games.id });
    return row!;
  }

  // No igdbId or steamAppId — plain insert (may create duplicates; B5 will deduplicate)
  const [row] = await db
    .insert(games)
    .values({ igdbId: null, steamAppId: null, title: data.title })
    .returning({ id: games.id });
  return row!;
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
      completionPct: 0,
      achievementsEarned: data.achievementsEarned ?? 0,
      achievementsTotal: data.achievementsTotal ?? 0,
    })
    .onConflictDoUpdate({
      target: [userGames.userId, userGames.platform, userGames.platformGameId],
      set: {
        minutesPlayed: sql`GREATEST(user_games.minutes_played, EXCLUDED.minutes_played)`,
        lastPlayedAt: sql`GREATEST(user_games.last_played_at, EXCLUDED.last_played_at)`,
        achievementsEarned: sql`GREATEST(user_games.achievements_earned, EXCLUDED.achievements_earned)`,
        achievementsTotal: sql`GREATEST(user_games.achievements_total, EXCLUDED.achievements_total)`,
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
