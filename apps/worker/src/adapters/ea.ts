// EA App adapter — auth works, but full library API requires approved developer access.
import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";
import { env } from "../config/env.js";

export class EAAdapter implements PlatformAdapter {
  readonly platform = "ea" as const;

  getAuthUrl(state: string, redirectUri: string): string {
    return (
      `https://accounts.ea.com/connect/auth` +
      `?client_id=${env.EA_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=openid%20basic_identity%20offline` +
      `&state=${state}`
    );
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const basic = Buffer.from(`${env.EA_CLIENT_ID}:${env.EA_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.ea.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`EA token exchange error ${res.status}`);
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
    const basic = Buffer.from(`${env.EA_CLIENT_ID}:${env.EA_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://accounts.ea.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error(`EA token refresh error ${res.status}`);
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

  async getOwnedGames(): Promise<RawGame[]> {
    // TODO: EA's full library API requires approved developer access.
    // Returning empty array until API access is granted.
    // See: https://developer.ea.com
    return [];
  }

  async getRecentGames(): Promise<RawGame[]> {
    return [];
  }

  async getAchievements(): Promise<RawAchievement[]> {
    return [];
  }
}
