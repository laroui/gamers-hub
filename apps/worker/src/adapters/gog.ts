import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";

const MAX_CONCURRENT = 5;

export class GOGAdapter implements PlatformAdapter {
  readonly platform = "gog" as const;
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
      scope: "galaxyaccounts.api",
      state,
    });
    return `https://auth.gog.com/auth?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const res = await fetch(
      `https://auth.gog.com/token?grant_type=authorization_code&code=${code}&client_id=${this.clientId}&client_secret=${this.clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}`,
    );
    if (!res.ok) throw new Error(`GOG token exchange error ${res.status}`);
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
    const res = await fetch(
      `https://auth.gog.com/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
    );
    if (!res.ok) throw new Error(`GOG token refresh error ${res.status}`);
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
    const res = await fetch("https://embed.gog.com/user/data/games", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`GOG owned games error ${res.status}`);

    const data = (await res.json()) as { owned: number[] };
    if (!data.owned || data.owned.length === 0) return [];

    // Batch fetch titles in groups of MAX_CONCURRENT
    const results: RawGame[] = [];
    for (let i = 0; i < data.owned.length; i += MAX_CONCURRENT) {
      const batch = data.owned.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.allSettled(
        batch.map(async (id) => {
          const productRes = await fetch(`https://api.gog.com/products/${id}?expand=description`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!productRes.ok) return null;
          const product = (await productRes.json()) as { title: string };
          return {
            platformGameId: String(id),
            title: product.title,
            minutesPlayed: 0,
          } satisfies RawGame;
        }),
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value) results.push(r.value);
      }
    }

    return results;
  }

  async getRecentGames(accessToken: string, limit = 50): Promise<RawGame[]> {
    try {
      const res = await fetch("https://gameplay.gog.com/games/recent", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("recent unavailable");
      const data = (await res.json()) as {
        items?: Array<{ game_id: number; title: string; last_session_date: string }>;
      };
      if (!data.items) throw new Error("no items");
      return data.items.slice(0, limit).map((item) => ({
        platformGameId: String(item.game_id),
        title: item.title,
        minutesPlayed: 0,
        lastPlayedAt: item.last_session_date,
      }));
    } catch {
      // GOG gameplay API has limited access — fall back to full library
      const games = await this.getOwnedGames(accessToken);
      return games.slice(0, limit);
    }
  }

  async getAchievements(accessToken: string, platformGameId: string): Promise<RawAchievement[]> {
    try {
      const res = await fetch(
        `https://gameplay.gog.com/clients/${this.clientId}/users/me/achievements?gameId=${platformGameId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as {
        items?: Array<{ achievement_id: string; name: string; description: string; date_unlocked?: string }>;
      };
      if (!data.items) return [];
      return data.items.map((a) => ({
        platformId: a.achievement_id,
        title: a.name,
        description: a.description,
        earnedAt: a.date_unlocked ? new Date(a.date_unlocked) : undefined,
      }));
    } catch {
      return [];
    }
  }
}
