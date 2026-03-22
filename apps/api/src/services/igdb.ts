import { createHash } from "node:crypto";
import type { Game } from "@gamers-hub/types";
import { cacheGet, cacheSet, cacheDel } from "../db/redis.js";
import { env } from "../config/env.js";

const IGDB_TOKEN_CACHE_KEY = "igdb:token";
const IGDB_SEARCH_TTL = 60 * 60 * 24; // 24 hours
const IGDB_GAME_TTL = 60 * 60 * 24 * 7; // 7 days

interface IgdbGame {
  id: number;
  name: string;
  cover?: { url: string };
  genres?: { name: string }[];
  first_release_date?: number; // Unix timestamp
  aggregated_rating?: number;
  summary?: string;
  screenshots?: { url: string }[];
}

function sha256(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

function fixIgdbUrl(url: string, size: string): string {
  let fixed = url.replace("t_thumb", size);
  if (fixed.startsWith("//")) fixed = "https:" + fixed;
  return fixed;
}

function igdbToGame(raw: IgdbGame): Game {
  const coverUrl = raw.cover?.url ? fixIgdbUrl(raw.cover.url, "t_cover_big") : null;
  return {
    id: String(raw.id),
    igdbId: raw.id,
    title: raw.name,
    coverUrl,
    backgroundUrl: null,
    genres: raw.genres?.map((g) => g.name) ?? [],
    platforms: [],
    releaseYear: raw.first_release_date
      ? new Date(raw.first_release_date * 1000).getFullYear()
      : null,
    metacritic:
      raw.aggregated_rating != null ? Math.round(raw.aggregated_rating) || null : null,
    description: raw.summary ?? null,
    screenshotUrls: raw.screenshots?.map((s) => fixIgdbUrl(s.url, "t_screenshot_big")) ?? [],
  };
}

export async function getIgdbToken(): Promise<string> {
  const cached = await cacheGet<string>(IGDB_TOKEN_CACHE_KEY);
  if (cached) return cached;

  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    throw new Error("IGDB credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: env.IGDB_CLIENT_ID,
    client_secret: env.IGDB_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: "POST" });
  if (!res.ok) throw new Error(`IGDB token fetch failed: ${res.status}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  await cacheSet(IGDB_TOKEN_CACHE_KEY, data.access_token, data.expires_in - 60);
  return data.access_token;
}

async function igdbPost(body: string, token: string): Promise<IgdbGame[]> {
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": env.IGDB_CLIENT_ID ?? "",
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!res.ok) throw new Error(`IGDB API error: ${res.status}`);
  return res.json() as Promise<IgdbGame[]>;
}

export async function searchIgdb(query: string, limit = 10): Promise<Game[]> {
  const cacheKey = `igdb_search:${sha256(query)}`;
  const cached = await cacheGet<Game[]>(cacheKey);
  if (cached) return cached;

  let token: string;
  try {
    token = await getIgdbToken();
  } catch {
    return [];
  }

  const body =
    `fields id,name,cover.url,genres.name,first_release_date,aggregated_rating,summary;\n` +
    `search "${query}";\n` +
    `limit ${limit};\n` +
    `where version_parent = null;`;

  let rawGames: IgdbGame[];
  try {
    rawGames = await igdbPost(body, token);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("401")) {
      await cacheDel(IGDB_TOKEN_CACHE_KEY);
      try {
        token = await getIgdbToken();
        rawGames = await igdbPost(body, token);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  const games = rawGames.map(igdbToGame);
  await cacheSet(cacheKey, games, IGDB_SEARCH_TTL);
  return games;
}

export async function getIgdbGame(
  igdbId: number,
): Promise<(Game & { screenshotUrls?: string[] }) | null> {
  const cacheKey = `igdb_game:${igdbId}`;
  const cached = await cacheGet<Game & { screenshotUrls?: string[] }>(cacheKey);
  if (cached) return cached;

  let token: string;
  try {
    token = await getIgdbToken();
  } catch {
    return null;
  }

  const body =
    `fields id,name,cover.url,genres.name,first_release_date,aggregated_rating,summary,screenshots.url;\n` +
    `where id = ${igdbId};`;

  let rawGames: IgdbGame[];
  try {
    rawGames = await igdbPost(body, token);
  } catch {
    return null;
  }

  const raw = rawGames[0];
  if (!raw) return null;

  const game = igdbToGame(raw);
  const screenshotUrls = raw.screenshots?.map((s) => fixIgdbUrl(s.url, "t_screenshot_big")) ?? [];
  const result = { ...game, screenshotUrls };

  await cacheSet(cacheKey, result, IGDB_GAME_TTL);
  return result;
}
