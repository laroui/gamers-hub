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
      `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/` +
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
      `http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/` +
      `?key=${this.apiKey}&steamid=${this.steamId}&count=${limit}&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam API error ${res.status} for GetRecentlyPlayedGames`);

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

  async getAchievements(_accessToken: string, platformGameId: string): Promise<RawAchievement[]> {
    const url =
      `http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/` +
      `?appid=${platformGameId}&key=${this.apiKey}&steamid=${this.steamId}&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Steam API error ${res.status} for GetPlayerAchievements`);

    const data = (await res.json()) as {
      playerstats?: {
        error?: string;
        success?: boolean;
        achievements?: Array<{
          apiname: string;
          achieved: number;
          unlocktime: number;
          name?: string;
        }>;
      };
    };

    const ps = data.playerstats;
    if (!ps || ps.error || !ps.success || !ps.achievements) return [];

    return ps.achievements.map((a) => ({
      platformId: a.apiname,
      title: a.name ?? a.apiname,
      earnedAt: a.achieved === 1 ? new Date(a.unlocktime * 1000) : undefined,
    }));
  }
}
