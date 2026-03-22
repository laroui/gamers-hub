import type { PlatformId, RawGame, TokenSet } from "@gamers-hub/types";

export interface RawAchievement {
  platformId: string;
  title: string;
  description?: string;
  iconUrl?: string;
  earnedAt?: Date;
  rarityPct?: number;
  points?: number;
}

export interface PlatformAdapter {
  readonly platform: PlatformId;

  // Returns "" for platforms that use API key instead of OAuth (Steam)
  getAuthUrl(state: string, redirectUri: string): string;

  // Only called for OAuth platforms
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;
  refreshAccessToken(refreshToken: string): Promise<TokenSet>;

  // Core sync methods
  getOwnedGames(accessToken: string): Promise<RawGame[]>;
  getRecentGames(accessToken: string, limit?: number): Promise<RawGame[]>;

  // Per-game detail (called after getOwnedGames for enrichment)
  getAchievements(accessToken: string, platformGameId: string): Promise<RawAchievement[]>;
}
