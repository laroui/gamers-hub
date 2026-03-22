// Battle.net adapter — auth works, but no general "owned games" endpoint.
// Specific games can be detected via their dedicated APIs.
import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";
import { env } from "../config/env.js";

export class BattlenetAdapter implements PlatformAdapter {
  readonly platform = "battlenet" as const;

  getAuthUrl(state: string, redirectUri: string): string {
    const region = env.BATTLENET_REGION;
    const params = new URLSearchParams({
      client_id: env.BATTLENET_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "openid",
      state,
    });
    return `https://${region}.battle.net/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const region = env.BATTLENET_REGION;
    const basic = Buffer.from(
      `${env.BATTLENET_CLIENT_ID}:${env.BATTLENET_CLIENT_SECRET}`,
    ).toString("base64");
    const res = await fetch(`https://${region}.battle.net/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Battle.net token exchange error ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(): Promise<TokenSet> {
    // Battle.net doesn't issue refresh tokens for client credential flows
    throw new Error("Battle.net access tokens cannot be refreshed — user must re-authenticate");
  }

  async getOwnedGames(accessToken: string): Promise<RawGame[]> {
    // Battle.net doesn't have a general "owned games" endpoint.
    // We detect specific games via their APIs.
    const games: RawGame[] = [];
    const region = env.BATTLENET_REGION;

    // Check WoW subscription
    try {
      const res = await fetch(
        `https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}&locale=en_US`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.ok) {
        games.push({ platformGameId: "wow", title: "World of Warcraft", minutesPlayed: 0 });
      }
    } catch {
      // Not subscribed or API unavailable
    }

    return games;
  }

  async getRecentGames(): Promise<RawGame[]> {
    return [];
  }

  async getAchievements(): Promise<RawAchievement[]> {
    return [];
  }
}
