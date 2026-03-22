// Epic has limited public API access — library only, no playtime, no achievements.
import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";

export class EpicAdapter implements PlatformAdapter {
  readonly platform = "epic" as const;
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
      scope: "basic_profile friends_list",
      state,
    });
    return `https://www.epicgames.com/id/authorize?${params}`;
  }

  private basicAuth(): string {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const res = await fetch("https://api.epicgames.dev/epic/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${this.basicAuth()}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`Epic token exchange error ${res.status}`);
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
    const res = await fetch("https://api.epicgames.dev/epic/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${this.basicAuth()}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Epic token refresh error ${res.status}`);
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
    const res = await fetch(
      "https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error(`Epic library error ${res.status}`);

    const data = (await res.json()) as {
      records?: Array<{
        catalogItemId: string;
        appName?: string;
        metadata?: { title?: string };
      }>;
    };

    if (!data.records) return [];

    return data.records.map((r) => ({
      platformGameId: r.catalogItemId,
      title: r.metadata?.title ?? r.appName ?? r.catalogItemId,
      // No playtime or lastPlayedAt available from Epic public API
      minutesPlayed: 0,
    }));
  }

  async getRecentGames(): Promise<RawGame[]> {
    // Epic doesn't expose recent play history in its public API
    return [];
  }

  async getAchievements(): Promise<RawAchievement[]> {
    // Epic uses a separate achievement system not available in the public API
    return [];
  }
}
