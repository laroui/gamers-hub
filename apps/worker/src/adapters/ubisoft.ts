// Ubisoft Connect adapter — auth stub, library requires Ubisoft Connect developer access.
import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";
import { env } from "../config/env.js";

export class UbisoftAdapter implements PlatformAdapter {
  readonly platform = "ubisoft" as const;

  getAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: env.UBISOFT_CLIENT_ID ?? "",
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `https://public-ubiservices.ubi.com/v3/profiles/sessions?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const res = await fetch("https://public-ubiservices.ubi.com/v3/profiles/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ubi-AppId": env.UBISOFT_CLIENT_ID ?? "",
        Authorization: `Basic ${Buffer.from(`${env.UBISOFT_CLIENT_ID}:${env.UBISOFT_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Ubisoft token exchange error ${res.status}`);
    const data = (await res.json()) as {
      ticket: string;
      expiration: string;
    };
    return {
      accessToken: data.ticket,
      expiresAt: new Date(data.expiration),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenSet> {
    const res = await fetch("https://public-ubiservices.ubi.com/v3/profiles/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ubi-AppId": env.UBISOFT_CLIENT_ID ?? "",
        Authorization: `Ubi_v1 t=${refreshToken}`,
      },
    });
    if (!res.ok) throw new Error(`Ubisoft token refresh error ${res.status}`);
    const data = (await res.json()) as { ticket: string; expiration: string };
    return { accessToken: data.ticket, expiresAt: new Date(data.expiration) };
  }

  async getOwnedGames(): Promise<RawGame[]> {
    // TODO: Library requires Ubisoft Connect developer access.
    return [];
  }

  async getRecentGames(): Promise<RawGame[]> {
    return [];
  }

  async getAchievements(): Promise<RawAchievement[]> {
    return [];
  }
}
