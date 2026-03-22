import type { Job } from "bullmq";
import type { SyncJobPayload, SyncJobProgress, PlatformId, RawGame } from "@gamers-hub/types";
import { getAdapter } from "../adapters/index.js";
import {
  findGameBySteamId,
  findGameByIgdbId,
  upsertGame,
  upsertUserGame,
  bulkInsertSessions,
  bulkInsertAchievements,
  getConnection,
  upsertConnection,
  updateSyncStatus,
  getGameById,
  createNotification,
} from "../db/queries.js";

// ── Progress helper ───────────────────────────────────────────

async function report(
  job: Job,
  stage: SyncJobProgress["stage"],
  processed: number,
  total: number,
  message: string,
): Promise<void> {
  await job.updateProgress({ stage, processed, total, message } satisfies SyncJobProgress);
}

// ── Core sync orchestrator ────────────────────────────────────

export async function syncPlatform(job: Job<SyncJobPayload>): Promise<void> {
  const { userId, platform } = job.data;

  try {
    // 1. Mark as syncing
    await updateSyncStatus(userId, platform, "syncing");

    // 2. Get adapter (may throw for unsupported platform)
    let adapter;
    try {
      const conn = await getConnection(userId, platform);
      adapter = getAdapter(
        platform as PlatformId,
        conn?.accessToken ?? "",
        conn?.platformUid ?? undefined,
      );
    } catch (err) {
      await updateSyncStatus(userId, platform, "error");
      throw err;
    }

    // 3. Get connection from DB
    const conn = await getConnection(userId, platform);
    if (!conn) throw new Error(`No connection found for ${platform}`);

    // 4. Refresh token if expiring within 5 minutes
    let accessToken = conn.accessToken ?? "";
    if (conn.tokenExpiresAt) {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (conn.tokenExpiresAt < fiveMinutesFromNow) {
        const newTokens = await adapter.refreshAccessToken(conn.refreshToken ?? "");
        await upsertConnection({
          userId,
          platform,
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          tokenExpiresAt: newTokens.expiresAt,
        });
        accessToken = newTokens.accessToken;
      }
    }

    // 5. Initial progress
    await report(job, "fetching_library", 0, 0, `Connecting to ${platform}...`);

    // 6. Fetch owned games
    const rawGames = await adapter.getOwnedGames(accessToken);
    await report(job, "fetching_library", 0, rawGames.length, `Found ${rawGames.length} games`);

    // 7. Upsert each game into catalog + user library
    const platformGameIdToUserGameId = new Map<string, string>();

    for (let i = 0; i < rawGames.length; i++) {
      const rawGame = rawGames[i]!;

      // Find or create game in catalog
      let game: { id: string } | null = null;

      if (rawGame.steamAppId) {
        game = await findGameBySteamId(rawGame.steamAppId);
      }
      if (!game && rawGame.igdbId) {
        game = await findGameByIgdbId(rawGame.igdbId);
      }
      if (!game) {
        game = await upsertGame({
          title: rawGame.title,
          steamAppId: rawGame.steamAppId ?? null,
          igdbId: rawGame.igdbId ?? null,
        });
      }

      // Metadata enrichment (Lazy resolution of covers/screenshots)
      const fullGame = await getGameById(game.id);
      if (fullGame && (!fullGame.coverUrl || fullGame.screenshotUrls.length === 0)) {
        try {
          const enrichment = await import("./cover.js").then(m => m.enrichGame({
            id: fullGame.id,
            title: fullGame.title,
            coverUrl: fullGame.coverUrl,
            igdbId: fullGame.igdbId ?? null,
            steamAppId: rawGame.steamAppId ?? null,
          }));

          if (enrichment) {
            await upsertGame({
              ...fullGame,
              ...enrichment,
              steamAppId: rawGame.steamAppId ?? null,
            });
          }
        } catch {
          // Non-fatal
        }
      }

      // 1. Initial upsert to get userGameId
      const userGameId = await upsertUserGame(userId, game.id, {
        platform,
        platformGameId: rawGame.platformGameId,
        minutesPlayed: rawGame.minutesPlayed ?? 0,
        lastPlayedAt: rawGame.lastPlayedAt ? new Date(rawGame.lastPlayedAt) : null,
        achievementsEarned: rawGame.achievementsEarned ?? 0,
        achievementsTotal: rawGame.achievementsTotal ?? 0,
      });

      // ── Real Player Data Sync (Achievements & Stats) ─────────────────
      // We sync full details for:
      // - Recently played games (played in last 3 months)
      // - Games where we don't have achievements yet
      // - If forceDeep is requested in the job payload
      const shouldDeepSync = 
        job.data.forceDeep ||
        (rawGame.lastPlayedAt && new Date(rawGame.lastPlayedAt).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000) ||
        (i % 20 === 0); // Slow backfill: 5% of games each sync

      let stats: Record<string, any> | undefined;
      let earnedCount = 0;
      let totalCount = 0;

      if (shouldDeepSync) {
        try {
          // Fetch stats (platform specific)
          if (adapter.getPlayerStats) {
             stats = await adapter.getPlayerStats(accessToken, rawGame.platformGameId);
          }

          // Fetch and bulk insert achievements
          const rawAchievements = await adapter.getAchievements(accessToken, rawGame.platformGameId);
          if (rawAchievements.length > 0) {
              await bulkInsertAchievements(userGameId, rawAchievements);
              totalCount = rawAchievements.length;
              earnedCount = rawAchievements.filter(a => !!a.earnedAt).length;
          }
        } catch (err) {
          console.error(`      ⚠️ Deep sync failed for ${rawGame.title}:`, err);
        }
      }

      // If we got stats OR achievements, update the userGame record one last time
      if (stats || totalCount > 0) {
        const completionPct = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
        
        await upsertUserGame(userId, game.id, {
          platform,
          platformGameId: rawGame.platformGameId,
          stats,
          achievementsEarned: totalCount > 0 ? earnedCount : undefined,
          achievementsTotal: totalCount > 0 ? totalCount : undefined,
          completionPct,
        });
      }

      platformGameIdToUserGameId.set(rawGame.platformGameId, userGameId);

      // Report every 10 games
      if ((i + 1) % 10 === 0 || i === rawGames.length - 1) {
        await report(
          job,
          "fetching_library",
          i + 1,
          rawGames.length,
          `Syncing library (${i + 1}/${rawGames.length})`,
        );
      }
    }

    // 8. Fetch recent sessions and bulk insert
    await report(job, "saving", rawGames.length, rawGames.length, "Fetching recent sessions...");

    const recentGames = await adapter.getRecentGames(accessToken, 50);
    const sessions: Parameters<typeof bulkInsertSessions>[0] = [];

    for (const recentGame of recentGames) {
      if (!recentGame.lastPlayedAt || !recentGame.minutesPlayed || recentGame.minutesPlayed <= 0) {
        continue;
      }
      const userGameId = platformGameIdToUserGameId.get(recentGame.platformGameId);
      if (!userGameId) continue;

      sessions.push({
        userId,
        userGameId,
        startedAt: new Date(recentGame.lastPlayedAt),
        minutes: Math.min(recentGame.minutesPlayed, 480), // Cap at 8 hours
        platform,
      });
    }

    if (sessions.length > 0) {
      await bulkInsertSessions(sessions);
    }

    // 9. Mark complete
    await updateSyncStatus(userId, platform, "success", new Date());
    await report(job, "done", rawGames.length, rawGames.length, "Sync complete");

    // 10. Emit sync_complete notification (non-fatal)
    try {
      await createNotification({
        userId,
        type: "sync_complete",
        title: "Sync complete",
        body: `${platform} sync finished — ${rawGames.length} game${rawGames.length === 1 ? "" : "s"} updated.`,
        payload: { platform, gameCount: rawGames.length },
      });
    } catch {
      // Non-fatal
    }
  } catch (err) {
    await updateSyncStatus(userId, platform, "error").catch(() => {});

    // Emit sync_error notification (non-fatal)
    try {
      await createNotification({
        userId,
        type: "sync_error",
        title: "Sync failed",
        body: `${platform} sync encountered an error. Please try again.`,
        payload: { platform },
      });
    } catch {
      // Non-fatal
    }

    throw err;
  }
}
