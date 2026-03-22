// Nintendo uses an unofficial session token (no OAuth).
// The user provides the session token directly via the /nintendo-token endpoint.
import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";

const NSO_CLIENT_ID = "71b963c1b7b6d119"; // NSO app client ID (public, used by nxapi)

export class NintendoAdapter implements PlatformAdapter {
  readonly platform = "nintendo" as const;

  getAuthUrl(): string {
    return ""; // No OAuth flow — user provides session token directly
  }

  async exchangeCode(): Promise<TokenSet> {
    throw new Error("Nintendo uses session token, not OAuth code exchange");
  }

  async refreshAccessToken(): Promise<TokenSet> {
    throw new Error("Nintendo session tokens don't refresh via standard OAuth");
  }

  private async getAccessToken(sessionToken: string): Promise<string> {
    const res = await fetch("https://accounts.nintendo.com/connect/1.0.0/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: NSO_CLIENT_ID,
        session_token: sessionToken,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
      }),
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 401) {
        throw new Error("Nintendo session token expired — please re-link your Nintendo account");
      }
      throw new Error(`Nintendo token exchange error ${res.status}`);
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async getOwnedGames(sessionToken: string): Promise<RawGame[]> {
    const accessToken = await this.getAccessToken(sessionToken);

    const res = await fetch("https://api-lp1.pctl.srv.nintendo.net/moon/v1/users/me/play_histories", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Moon-Os-Language": "en-US",
        "X-Moon-App-Id": "com.nintendo.znca",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Nintendo session token expired — please re-link your Nintendo account");
      }
      throw new Error(`Nintendo play history error ${res.status}`);
    }

    const data = (await res.json()) as {
      playHistories?: Array<{
        titleId: string;
        title: string;
        totalPlayedMinutes: number;
        lastPlayedAt: string;
      }>;
    };

    if (!data.playHistories) return [];

    return data.playHistories.map((h) => ({
      platformGameId: h.titleId,
      title: h.title,
      minutesPlayed: h.totalPlayedMinutes,
      lastPlayedAt: h.lastPlayedAt,
    }));
  }

  async getRecentGames(sessionToken: string, limit = 50): Promise<RawGame[]> {
    const games = await this.getOwnedGames(sessionToken);
    return games
      .filter((g) => g.lastPlayedAt)
      .sort((a, b) =>
        new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime(),
      )
      .slice(0, limit);
  }

  async getAchievements(): Promise<RawAchievement[]> {
    // Nintendo Switch Online doesn't expose achievements
    return [];
  }
}
