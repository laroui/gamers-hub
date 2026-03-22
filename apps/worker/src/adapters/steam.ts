import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";

export class SteamAdapter implements PlatformAdapter {
  readonly platform = "steam" as const;
  private readonly apiKey: string;
  private readonly steamId: string;

  constructor(apiKey: string, steamId: string) {
    this.apiKey = apiKey;
    this.steamId = steamId;
  }

  getAuthUrl(): string { return ""; }

  async exchangeCode(): Promise<TokenSet> {
    throw new Error("Steam uses API key, not OAuth");
  }

  async refreshAccessToken(): Promise<TokenSet> {
    throw new Error("Steam API key does not expire");
  }

  async getOwnedGames(): Promise<RawGame[]> {
    const url =
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/` +
      `?key=${this.apiKey}&steamid=${this.steamId}&include_appinfo=1&include_played_free_games=1&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam API error ${res.status} for GetOwnedGames`);

    const data = (await res.json()) as {
      response: {
        games?: Array<{
          appid: number;
          name: string;
          playtime_forever: number;
          rtime_last_played: number;
        }>;
      };
    };

    const games = data.response.games;
    if (!games || games.length === 0) return [];

    return games.map((g) => ({
      platformGameId: String(g.appid),
      title: g.name,
      steamAppId: g.appid,
      minutesPlayed: g.playtime_forever,
      lastPlayedAt: g.rtime_last_played > 0
        ? new Date(g.rtime_last_played * 1000).toISOString()
        : undefined,
    }));
  }

  async getRecentGames(_accessToken: string, limit = 50): Promise<RawGame[]> {
    const url =
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/` +
      `?key=${this.apiKey}&steamid=${this.steamId}&count=${limit}&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam API error ${res.status} for GetRecentlyPlayedGames`);

    const data = (await res.json()) as {
      response: {
        games?: Array<{
          appid: number;
          name: string;
          playtime_forever: number;
          playtime_2weeks?: number;
          rtime_last_played: number;
        }>;
      };
    };

    const games = data.response.games;
    if (!games || games.length === 0) return [];

    return games.map((g) => ({
      platformGameId: String(g.appid),
      title: g.name,
      steamAppId: g.appid,
      // Use playtime_2weeks (recent playtime) for session duration — playtime_forever
      // is the lifetime total and must not be used as a single session length.
      // Fall back to a conservative 60-minute estimate if the field is absent.
      minutesPlayed: g.playtime_2weeks ?? 60,
      lastPlayedAt: g.rtime_last_played > 0
        ? new Date(g.rtime_last_played * 1000).toISOString()
        : undefined,
    }));
  }

  async getAchievements(_accessToken: string, platformGameId: string): Promise<RawAchievement[]> {
    // 1. Get player's progress (Earned status + Unlock time)
    const progressUrl =
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/` +
      `?appid=${platformGameId}&key=${this.apiKey}&steamid=${this.steamId}&l=english&format=json`;

    // 2. Get game schema (Names, Descriptions, Icons)
    const schemaUrl =
      `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/` +
      `?appid=${platformGameId}&key=${this.apiKey}&l=english&format=json`;

    try {
      // 1. Fetch both in parallel
      const [pRes, sRes] = await Promise.allSettled([
        fetch(progressUrl),
        fetch(schemaUrl)
      ]);

      let playerAchievements: any[] = [];
      let schemaAchievements: any[] = [];

      // Parse player achievements if success
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const pData = await pRes.value.json() as any;
        playerAchievements = pData.playerstats?.achievements ?? [];
        console.log(`      ✔️ Player achievements for ${platformGameId}: ${playerAchievements.length}`);
      } else {
        console.warn(`      ⚠️ Player achievements fetch failed for ${platformGameId}:`, pRes.status === "fulfilled" ? pRes.value.status : pRes.reason);
      }

      // Parse schema achievements if success
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const sData = await sRes.value.json() as any;
        schemaAchievements = sData.game?.availableGameStats?.achievements ?? [];
        console.log(`      ✔️ Schema achievements for ${platformGameId}: ${schemaAchievements.length}`);
      } else {
        console.warn(`      ⚠️ Schema achievements fetch failed for ${platformGameId}:`, sRes.status === "fulfilled" ? sRes.value.status : sRes.reason);
      }

      if (schemaAchievements.length === 0 && playerAchievements.length === 0) return [];

      const playerMap = new Map<string, any>(playerAchievements.map((a: any) => [a.apiname, a]));

      return schemaAchievements.map((s: any) => {
        const progress = playerMap.get(s.name);
        return {
          platformId: s.name,
          title: s.displayName ?? s.name,
          description: s.description ?? null,
          iconUrl: s.icon ?? null,
          earnedAt: progress?.achieved === 1 ? new Date(progress.unlocktime * 1000) : undefined,
          rarityPct: s.defaultvalue === 0 ? undefined : s.defaultvalue, // Valve sometimes puts rarity here or elsewhere
        };
      });
    } catch (err) {
      console.error(`      ❌ Steam Achievements fetch failed for ${platformGameId}:`, err);
      return [];
    }
  }

  async getPlayerStats(_accessToken: string, platformGameId: string): Promise<Record<string, any>> {
    const url =
      `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/` +
      `?appid=${platformGameId}&key=${this.apiKey}&steamid=${this.steamId}&format=json`;

    try {
      const res = await fetch(url);
      if (!res.ok) return {};
      const data = (await res.json()) as any;
      const stats = data.playerstats?.stats ?? [];
      const statsMap: Record<string, any> = {};
      for (const s of stats) {
        statsMap[s.name] = s.value;
      }
      return statsMap;
    } catch {
      return {};
    }
  }
}
