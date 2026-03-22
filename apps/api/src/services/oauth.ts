import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { getRedis } from "../db/redis.js";
import type { PlatformId } from "@gamers-hub/types";

// ── Known platform IDs ────────────────────────────────────────

const KNOWN_PLATFORMS: readonly PlatformId[] = [
  "steam",
  "psn",
  "xbox",
  "epic",
  "gog",
  "nintendo",
  "ea",
  "ubisoft",
  "battlenet",
  "gamepass",
];

export function isValidPlatform(platform: string): platform is PlatformId {
  return (KNOWN_PLATFORMS as readonly string[]).includes(platform);
}

// ── OAuth config ──────────────────────────────────────────────

export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  usePKCE: boolean;
}

export function getOAuthConfig(platform: PlatformId): OAuthConfig | null {
  switch (platform) {
    case "xbox":
      if (!env.XBOX_CLIENT_ID || !env.XBOX_CLIENT_SECRET || !env.XBOX_REDIRECT_URI) return null;
      return {
        authUrl: "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
        clientId: env.XBOX_CLIENT_ID,
        clientSecret: env.XBOX_CLIENT_SECRET,
        redirectUri: env.XBOX_REDIRECT_URI,
        scopes: ["XboxLive.signin", "offline_access"],
        usePKCE: false,
      };

    case "psn":
      if (!env.PSN_CLIENT_ID || !env.PSN_CLIENT_SECRET || !env.PSN_REDIRECT_URI) return null;
      return {
        authUrl: "https://ca.account.sony.com/api/authz/v3/oauth/authorize",
        tokenUrl: "https://ca.account.sony.com/api/authz/v3/oauth/token",
        clientId: env.PSN_CLIENT_ID,
        clientSecret: env.PSN_CLIENT_SECRET,
        redirectUri: env.PSN_REDIRECT_URI,
        scopes: ["psn:mobile.v2.core", "psn:clientapp"],
        usePKCE: true,
      };

    case "epic":
      if (!env.EPIC_CLIENT_ID || !env.EPIC_CLIENT_SECRET || !env.EPIC_REDIRECT_URI) return null;
      return {
        authUrl: "https://www.epicgames.com/id/authorize",
        tokenUrl: "https://api.epicgames.dev/epic/oauth/v2/token",
        clientId: env.EPIC_CLIENT_ID,
        clientSecret: env.EPIC_CLIENT_SECRET,
        redirectUri: env.EPIC_REDIRECT_URI,
        scopes: ["basic_profile", "friends_list", "presence"],
        usePKCE: false,
      };

    case "gog":
      if (!env.GOG_CLIENT_ID || !env.GOG_CLIENT_SECRET || !env.GOG_REDIRECT_URI) return null;
      return {
        authUrl: "https://auth.gog.com/auth",
        tokenUrl: "https://auth.gog.com/token",
        clientId: env.GOG_CLIENT_ID,
        clientSecret: env.GOG_CLIENT_SECRET,
        redirectUri: env.GOG_REDIRECT_URI,
        scopes: ["galaxyaccounts.api"],
        usePKCE: false,
      };

    case "ea":
      if (!env.EA_CLIENT_ID || !env.EA_CLIENT_SECRET) return null;
      return {
        authUrl: "https://accounts.ea.com/connect/auth",
        tokenUrl: "https://accounts.ea.com/connect/token",
        clientId: env.EA_CLIENT_ID,
        clientSecret: env.EA_CLIENT_SECRET,
        redirectUri: `${env.APP_URL}/oauth/ea/callback`,
        scopes: ["openid", "basic_identity", "offline"],
        usePKCE: false,
      };

    case "ubisoft":
      if (!env.UBISOFT_CLIENT_ID || !env.UBISOFT_CLIENT_SECRET) return null;
      return {
        authUrl: "https://public-ubiservices.ubi.com/v3/profiles/sessions",
        tokenUrl: "https://public-ubiservices.ubi.com/v3/profiles/sessions",
        clientId: env.UBISOFT_CLIENT_ID,
        clientSecret: env.UBISOFT_CLIENT_SECRET,
        redirectUri: `${env.APP_URL}/oauth/ubisoft/callback`,
        scopes: [],
        usePKCE: false,
      };

    case "battlenet":
      if (!env.BATTLENET_CLIENT_ID || !env.BATTLENET_CLIENT_SECRET) return null;
      return {
        authUrl: `https://${env.BATTLENET_REGION}.battle.net/oauth/authorize`,
        tokenUrl: `https://${env.BATTLENET_REGION}.battle.net/oauth/token`,
        clientId: env.BATTLENET_CLIENT_ID,
        clientSecret: env.BATTLENET_CLIENT_SECRET,
        redirectUri: `${env.APP_URL}/oauth/battlenet/callback`,
        scopes: ["openid"],
        usePKCE: false,
      };

    default:
      return null;
  }
}

// ── PKCE helpers ──────────────────────────────────────────────

export function generateCodeVerifier(): string {
  // 32 random bytes → 43 base64url chars (within 43–128 range)
  return randomBytes(64).toString("base64url").slice(0, 96);
}

export function computeCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

// ── OAuth state Redis management ──────────────────────────────

const STATE_TTL = 600; // 10 minutes

export async function storeOAuthState(state: string, userId: string): Promise<void> {
  const redis = getRedis();
  await redis.setex(`oauth_state:${state}`, STATE_TTL, userId);
}

export async function consumeOAuthState(state: string): Promise<string | null> {
  const redis = getRedis();
  const userId = await redis.get(`oauth_state:${state}`);
  if (userId) await redis.del(`oauth_state:${state}`);
  return userId;
}

export async function storePkceVerifier(state: string, verifier: string): Promise<void> {
  const redis = getRedis();
  await redis.setex(`pkce:${state}`, STATE_TTL, verifier);
}

export async function consumePkceVerifier(state: string): Promise<string | null> {
  const redis = getRedis();
  const verifier = await redis.get(`pkce:${state}`);
  if (verifier) await redis.del(`pkce:${state}`);
  return verifier;
}

// ── HTML helpers ──────────────────────────────────────────────

export function oauthSuccessHtml(platform: string): string {
  return `<!DOCTYPE html><html><body>
<script>
  window.opener?.postMessage({ success: true, platform: ${JSON.stringify(platform)} }, "*");
  window.close();
</script>
<p>Connected! You can close this window.</p>
</body></html>`;
}

export function oauthErrorHtml(message: string): string {
  return `<!DOCTYPE html><html><body>
<script>
  window.opener?.postMessage({ success: false, error: ${JSON.stringify(message)} }, "*");
  window.close();
</script>
<p>Error: ${message}. You can close this window.</p>
</body></html>`;
}
