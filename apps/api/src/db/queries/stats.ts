import { and, eq, sql } from "drizzle-orm";
import type {
  LibraryStats,
  PlayHeatmap,
  PlayStreaks,
  WeeklyPlaytime,
  GamingWrapped,
  PlatformId,
} from "@gamers-hub/types";
import { db } from "../client.js";
import { userGames, playSessions, games } from "../schema.js";

// ── getLibraryStats ───────────────────────────────────────────

export async function getLibraryStats(userId: string): Promise<LibraryStats> {
  // Aggregate from user_games
  const [agg] = await db
    .select({
      totalGames: sql<number>`COUNT(*)::int`,
      totalMinutes: sql<number>`SUM(${userGames.minutesPlayed})::int`,
      completedGames: sql<number>`COUNT(*) FILTER (WHERE ${userGames.status} = 'completed')::int`,
      currentlyPlaying: sql<number>`COUNT(*) FILTER (WHERE ${userGames.status} = 'playing')::int`,
    })
    .from(userGames)
    .where(eq(userGames.userId, userId));

  // Platform breakdown
  const platformRows = await db
    .select({
      platform: userGames.platform,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(userGames)
    .where(eq(userGames.userId, userId))
    .groupBy(userGames.platform);

  const platformBreakdown: Record<string, number> = {};
  for (const row of platformRows) {
    platformBreakdown[row.platform] = row.count;
  }

  // Genre breakdown — unnest array
  const genreRows = await db
    .select({
      genre: sql<string>`UNNEST(${games.genres})`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(eq(userGames.userId, userId))
    .groupBy(sql`UNNEST(${games.genres})`);

  const genreBreakdown: Record<string, number> = {};
  for (const row of genreRows) {
    genreBreakdown[row.genre] = row.count;
  }

  // This-week delta
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [weekAgg] = await db
    .select({
      newGames: sql<number>`COUNT(*) FILTER (WHERE ${userGames.addedAt} >= ${weekAgo.toISOString()}::timestamptz)::int`,
    })
    .from(userGames)
    .where(eq(userGames.userId, userId));

  const [weekMinutes] = await db
    .select({
      minutes: sql<number>`COALESCE(SUM(${playSessions.minutes}), 0)::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${weekAgo.toISOString()}::timestamptz`,
      ),
    );

  const totalMinutes = agg?.totalMinutes ?? 0;
  const totalGames = agg?.totalGames ?? 0;
  const completedGames = agg?.completedGames ?? 0;

  return {
    totalGames,
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    completedGames,
    currentlyPlaying: agg?.currentlyPlaying ?? 0,
    completionRate: totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0,
    platformBreakdown: platformBreakdown as Record<PlatformId, number>,
    genreBreakdown,
    deltaThisWeek: {
      newGames: weekAgg?.newGames ?? 0,
      minutesPlayed: weekMinutes?.minutes ?? 0,
    },
  };
}

// ── getPlayHeatmap ────────────────────────────────────────────

export async function getPlayHeatmap(userId: string, year: number): Promise<PlayHeatmap> {
  const rows = await db
    .select({
      day: sql<string>`TO_CHAR(${playSessions.startedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      minutes: sql<number>`SUM(${playSessions.minutes})::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`EXTRACT(YEAR FROM ${playSessions.startedAt} AT TIME ZONE 'UTC') = ${year}`,
      ),
    )
    .groupBy(sql`TO_CHAR(${playSessions.startedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);

  const heatmap: PlayHeatmap = {};
  for (const row of rows) {
    heatmap[row.day] = row.minutes;
  }
  return heatmap;
}

// ── getPlayStreaks ────────────────────────────────────────────

export async function getPlayStreaks(userId: string): Promise<PlayStreaks> {
  // Fetch all distinct play days ordered ascending
  const rows = await db
    .select({
      day: sql<string>`DISTINCT TO_CHAR(${playSessions.startedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
    })
    .from(playSessions)
    .where(eq(playSessions.userId, userId))
    .orderBy(sql`1`);

  if (rows.length === 0) {
    return { current: 0, longest: 0, totalDays: 0 };
  }

  const days = rows.map((r) => r.day);

  let longest = 1;
  let currentStreak = 1;
  let streak = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]!);
    const curr = new Date(days[i]!);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      streak = 1;
    }
  }

  // Check if current streak is still active (last day is today or yesterday)
  const lastDay = new Date(days[days.length - 1]!);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  lastDay.setUTCHours(0, 0, 0, 0);
  const diffFromToday = (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24);

  if (diffFromToday <= 1) {
    // Re-compute current streak going backwards from last day
    currentStreak = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const prev = new Date(days[i - 1]!);
      const curr = new Date(days[i]!);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  return {
    current: currentStreak,
    longest,
    totalDays: days.length,
  };
}

// ── getWeeklyPlaytime ─────────────────────────────────────────

export async function getWeeklyPlaytime(
  userId: string,
  weeks = 12,
): Promise<WeeklyPlaytime[]> {
  const rows = await db
    .select({
      week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${playSessions.startedAt} AT TIME ZONE 'UTC'), 'IYYY-"W"IW')`,
      minutes: sql<number>`SUM(${playSessions.minutes})::int`,
      games: sql<number>`COUNT(DISTINCT ${playSessions.userGameId})::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= NOW() - INTERVAL '${sql.raw(String(weeks))} weeks'`,
      ),
    )
    .groupBy(
      sql`DATE_TRUNC('week', ${playSessions.startedAt} AT TIME ZONE 'UTC')`,
    )
    .orderBy(sql`DATE_TRUNC('week', ${playSessions.startedAt} AT TIME ZONE 'UTC')`);

  return rows.map((r) => ({
    week: r.week,
    minutes: r.minutes,
    games: r.games,
  }));
}

// ── getPlaytimeByPlatform ─────────────────────────────────────

export async function getPlaytimeByPlatform(
  userId: string,
): Promise<{ platform: string; minutes: number; games: number }[]> {
  // Use userGames.minutesPlayed (sourced from Steam playtime_forever) — playSessions
  // is not populated with reliable per-session data from Steam's API.
  const rows = await db
    .select({
      platform: userGames.platform,
      minutes: sql<number>`SUM(${userGames.minutesPlayed})::int`,
      games: sql<number>`COUNT(*)::int`,
    })
    .from(userGames)
    .where(eq(userGames.userId, userId))
    .groupBy(userGames.platform)
    .orderBy(sql`SUM(${userGames.minutesPlayed}) DESC`);

  return rows.map((r) => ({
    platform: r.platform,
    minutes: r.minutes,
    games: r.games,
  }));
}

// ── getPlaytimeByGenre ────────────────────────────────────────

export async function getPlaytimeByGenre(
  userId: string,
): Promise<{ genre: string; minutes: number; games: number }[]> {
  // Use userGames.minutesPlayed (sourced from Steam playtime_forever) — playSessions
  // is not populated with reliable per-session data from Steam's API.
  const rows = await db
    .select({
      genre: sql<string>`UNNEST(${games.genres})`,
      minutes: sql<number>`SUM(${userGames.minutesPlayed})::int`,
      games: sql<number>`COUNT(DISTINCT ${userGames.id})::int`,
    })
    .from(userGames)
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(eq(userGames.userId, userId))
    .groupBy(sql`UNNEST(${games.genres})`)
    .orderBy(sql`SUM(${userGames.minutesPlayed}) DESC`);

  return rows.map((r) => ({
    genre: r.genre,
    minutes: r.minutes,
    games: r.games,
  }));
}

// ── getGamingWrapped ──────────────────────────────────────────

export async function getGamingWrapped(userId: string, year: number): Promise<GamingWrapped> {
  const yearStart = `${year}-01-01T00:00:00.000Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00.000Z`;

  // Total hours & sessions
  const [totals] = await db
    .select({
      totalMinutes: sql<number>`COALESCE(SUM(${playSessions.minutes}), 0)::int`,
      sessionCount: sql<number>`COUNT(*)::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    );

  // Distinct games played this year
  const [gameCount] = await db
    .select({
      totalGames: sql<number>`COUNT(DISTINCT ${playSessions.userGameId})::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    );

  // New games added this year
  const [newGamesCount] = await db
    .select({
      newGames: sql<number>`COUNT(*)::int`,
    })
    .from(userGames)
    .where(
      and(
        eq(userGames.userId, userId),
        sql`${userGames.addedAt} >= ${yearStart}::timestamptz`,
        sql`${userGames.addedAt} < ${yearEnd}::timestamptz`,
      ),
    );

  // Completed games this year (status = 'completed')
  const [completedCount] = await db
    .select({
      completedGames: sql<number>`COUNT(*)::int`,
    })
    .from(userGames)
    .where(
      and(
        eq(userGames.userId, userId),
        eq(userGames.status, "completed"),
        sql`${userGames.addedAt} >= ${yearStart}::timestamptz`,
        sql`${userGames.addedAt} < ${yearEnd}::timestamptz`,
      ),
    );

  // Top game by minutes
  const topGameRows = await db
    .select({
      title: games.title,
      coverUrl: games.coverUrl,
      minutes: sql<number>`SUM(${playSessions.minutes})::int`,
    })
    .from(playSessions)
    .innerJoin(userGames, eq(playSessions.userGameId, userGames.id))
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    )
    .groupBy(games.title, games.coverUrl)
    .orderBy(sql`SUM(${playSessions.minutes}) DESC`)
    .limit(1);

  // Top genre
  const topGenreRows = await db
    .select({
      genre: sql<string>`UNNEST(${games.genres})`,
      minutes: sql<number>`SUM(${playSessions.minutes})::int`,
    })
    .from(playSessions)
    .innerJoin(userGames, eq(playSessions.userGameId, userGames.id))
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    )
    .groupBy(sql`UNNEST(${games.genres})`)
    .orderBy(sql`SUM(${playSessions.minutes}) DESC`)
    .limit(1);

  // Top platform
  const topPlatformRows = await db
    .select({
      platform: playSessions.platform,
      minutes: sql<number>`SUM(${playSessions.minutes})::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    )
    .groupBy(playSessions.platform)
    .orderBy(sql`SUM(${playSessions.minutes}) DESC`)
    .limit(1);

  // Longest single session
  const longestSessionRows = await db
    .select({
      gameTitle: games.title,
      minutes: playSessions.minutes,
      startedAt: playSessions.startedAt,
    })
    .from(playSessions)
    .innerJoin(userGames, eq(playSessions.userGameId, userGames.id))
    .innerJoin(games, eq(userGames.gameId, games.id))
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    )
    .orderBy(sql`${playSessions.minutes} DESC`)
    .limit(1);

  // Favorite day of week
  const favDayRows = await db
    .select({
      dayName: sql<string>`TO_CHAR(${playSessions.startedAt} AT TIME ZONE 'UTC', 'Day')`,
      minutes: sql<number>`SUM(${playSessions.minutes})::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    )
    .groupBy(sql`TO_CHAR(${playSessions.startedAt} AT TIME ZONE 'UTC', 'Day')`)
    .orderBy(sql`SUM(${playSessions.minutes}) DESC`)
    .limit(1);

  // Late night gamer: sessions starting after midnight
  const [lateNight] = await db
    .select({
      lateCount: sql<number>`COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM ${playSessions.startedAt} AT TIME ZONE 'UTC') >= 0 AND EXTRACT(HOUR FROM ${playSessions.startedAt} AT TIME ZONE 'UTC') < 4)::int`,
      totalCount: sql<number>`COUNT(*)::int`,
    })
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        sql`${playSessions.startedAt} >= ${yearStart}::timestamptz`,
        sql`${playSessions.startedAt} < ${yearEnd}::timestamptz`,
      ),
    );

  const totalMinutes = totals?.totalMinutes ?? 0;
  const lateCount = lateNight?.lateCount ?? 0;
  const totalCount = lateNight?.totalCount ?? 0;

  const topGame = topGameRows[0]
    ? {
        title: topGameRows[0].title,
        coverUrl: topGameRows[0].coverUrl,
        hours: Math.round((topGameRows[0].minutes / 60) * 10) / 10,
      }
    : null;

  const longestSession = longestSessionRows[0]
    ? {
        gameTitle: longestSessionRows[0].gameTitle,
        hours: Math.round((longestSessionRows[0].minutes / 60) * 10) / 10,
        date: longestSessionRows[0].startedAt.toISOString().split("T")[0]!,
      }
    : null;

  return {
    year,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    totalGames: gameCount?.totalGames ?? 0,
    newGames: newGamesCount?.newGames ?? 0,
    completedGames: completedCount?.completedGames ?? 0,
    topGame,
    topGenre: topGenreRows[0]?.genre?.trim() ?? null,
    topPlatform: (topPlatformRows[0]?.platform as PlatformId) ?? null,
    longestSession,
    favoriteDay: favDayRows[0]?.dayName?.trim() ?? null,
    lateNightGamer: totalCount > 0 && lateCount / totalCount > 0.2,
  };
}
