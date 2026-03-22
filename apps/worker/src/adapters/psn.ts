import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";

const TROPHY_POINTS: Record<string, number> = {
  bronze: 15,
  silver: 30,
  gold: 90,
  platinum: 300,
};

export class PSNAdapter implements PlatformAdapter {
  readonly platform = "psn" as const;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "psn:mobile.v2.core psn:clientapp",
      state,
    });
    return `https://ca.account.sony.com/api/authz/v3/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch("https://ca.account.sony.com/api/authz/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`PSN token exchange error ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch("https://ca.account.sony.com/api/authz/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error(`PSN token refresh error ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getOwnedGames(accessToken: string): Promise<RawGame[]> {
    const params = new URLSearchParams({
      categories: "ps4_game,ps5_native_game",
      limit: "200",
      offset: "0",
    });
    const res = await fetch(
      `https://m.np.playstation.com/api/gamelist/v2/users/me/titles?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error(`PSN gamelist error ${res.status}`);

    const data = (await res.json()) as {
      titles?: Array<{
        titleId: string;
        name: string;
        lastPlayedDateTime?: string;
      }>;
    };

    if (!data.titles) return [];

    return data.titles.map((t) => ({
      platformGameId: t.titleId,
      title: t.name,
      minutesPlayed: 0, // PSN doesn't expose playtime in public API
      lastPlayedAt: t.lastPlayedDateTime,
    }));
  }

  async getRecentGames(accessToken: string, limit = 50): Promise<RawGame[]> {
    const games = await this.getOwnedGames(accessToken);
    return games
      .filter((g) => g.lastPlayedAt)
      .sort((a, b) =>
        new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime(),
      )
      .slice(0, limit);
  }

  async getAchievements(accessToken: string, platformGameId: string): Promise<RawAchievement[]> {
    const res = await fetch(
      `https://m.np.playstation.com/api/trophy/v1/users/me/npCommIds/${platformGameId}/trophyGroups/all/trophies`,
      { headers: { Authorization: `Bearer ${accessToken}`, "Accept-Language": "en" } },
    );
    if (!res.ok) return []; // Not all games have trophies

    const data = (await res.json()) as {
      trophies?: Array<{
        trophyId: string;
        trophyName: string;
        trophyDetail?: string;
        trophyIconUrl?: string;
        trophyType: string;
        earned?: boolean;
        earnedDateTime?: string;
        trophyEarnedRate?: string;
      }>;
    };

    if (!data.trophies) return [];

    return data.trophies.map((t) => ({
      platformId: t.trophyId,
      title: t.trophyName,
      description: t.trophyDetail,
      iconUrl: t.trophyIconUrl,
      points: TROPHY_POINTS[t.trophyType] ?? 0,
      earnedAt: t.earned && t.earnedDateTime ? new Date(t.earnedDateTime) : undefined,
      rarityPct: t.trophyEarnedRate ? parseFloat(t.trophyEarnedRate) : undefined,
    }));
  }
}
