import type { RawGame, TokenSet } from "@gamers-hub/types";
import type { PlatformAdapter, RawAchievement } from "@gamers-hub/platform-sdk";

export class XboxAdapter implements PlatformAdapter {
  readonly platform = "xbox" as const;
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
      scope: "XboxLive.signin offline_access",
      state,
    });
    return `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
    const res = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`Xbox token exchange error ${res.status}`);
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
    const res = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Xbox token refresh error ${res.status}`);
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

  private async getXblTokens(msalToken: string): Promise<{ xstsToken: string; userHash: string; xuId: string }> {
    // Step 1: Exchange MSAL token for XBL token
    const xblRes = await fetch("https://user.auth.xboxlive.com/user/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${msalToken}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      }),
    });
    if (!xblRes.ok) throw new Error(`Xbox XBL auth error ${xblRes.status}`);
    const xblData = (await xblRes.json()) as {
      Token: string;
      DisplayClaims: { xui: Array<{ uhs: string }> };
    };
    const xblToken = xblData.Token;
    const userHash = xblData.DisplayClaims.xui[0]?.uhs ?? "";

    // Step 2: Exchange XBL for XSTS token
    const xstsRes = await fetch("https://xsts.auth.xboxlive.com/xsts/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        Properties: { SandboxId: "RETAIL", UserTokens: [xblToken] },
        RelyingParty: "http://xboxlive.com",
        TokenType: "JWT",
      }),
    });
    if (!xstsRes.ok) throw new Error(`Xbox XSTS auth error ${xstsRes.status}`);
    const xstsData = (await xstsRes.json()) as {
      Token: string;
      DisplayClaims: { xui: Array<{ uhs: string; xid: string }> };
    };

    return {
      xstsToken: xstsData.Token,
      userHash: xstsData.DisplayClaims.xui[0]?.uhs ?? userHash,
      xuId: xstsData.DisplayClaims.xui[0]?.xid ?? "",
    };
  }

  async getOwnedGames(accessToken: string): Promise<RawGame[]> {
    const { xstsToken, userHash } = await this.getXblTokens(accessToken);
    const auth = `XBL3.0 x=${userHash};${xstsToken}`;

    const res = await fetch(
      "https://titlehub.xbox.com/users/me/titles/titlehistory/decoration/Achievement,GamePass,GameType",
      { headers: { Authorization: auth, "x-xbl-contract-version": "2", Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Xbox titlehub error ${res.status}`);

    const data = (await res.json()) as {
      titles?: Array<{
        titleId: string;
        name: string;
        achievement?: { currentGamerscore: number; totalGamerscore: number };
        titleHistory?: { lastTimePlayed: string };
      }>;
    };

    if (!data.titles) return [];

    return data.titles.map((t) => ({
      platformGameId: String(t.titleId),
      title: t.name,
      minutesPlayed: 0, // Xbox title history doesn't expose playtime
      lastPlayedAt: t.titleHistory?.lastTimePlayed,
      achievementsEarned: t.achievement?.currentGamerscore ?? 0,
      achievementsTotal: t.achievement?.totalGamerscore ?? 0,
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
    const { xstsToken, userHash, xuId } = await this.getXblTokens(accessToken);
    const auth = `XBL3.0 x=${userHash};${xstsToken}`;

    const res = await fetch(
      `https://achievements.xboxlive.com/users/xuid(${xuId})/achievements?titleId=${platformGameId}`,
      { headers: { Authorization: auth, "x-xbl-contract-version": "2", Accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Xbox achievements error ${res.status}`);

    const data = (await res.json()) as {
      achievements?: Array<{
        id: string;
        name: string;
        description: string;
        isUnlocked: boolean;
        timeUnlocked: string;
        rarityPercentage?: number;
      }>;
    };

    if (!data.achievements) return [];

    return data.achievements.map((a) => ({
      platformId: a.id,
      title: a.name,
      description: a.description,
      earnedAt: a.isUnlocked && a.timeUnlocked ? new Date(a.timeUnlocked) : undefined,
      rarityPct: a.rarityPercentage,
    }));
  }
}
