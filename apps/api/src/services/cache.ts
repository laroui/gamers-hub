import { cacheDel, cacheDelPattern } from "../db/redis.js";

export async function invalidateUserCaches(userId: string): Promise<void> {
  await Promise.all([
    cacheDel(`library_stats:${userId}`),
    cacheDelPattern(`heatmap:${userId}:*`),
    cacheDel(`streaks:${userId}`),
    cacheDelPattern(`playtime_platform:${userId}`),
    cacheDelPattern(`playtime_genre:${userId}`),
    cacheDelPattern(`weekly_playtime:${userId}:*`),
    cacheDelPattern(`wrapped:${userId}:*`),
  ]);
}
