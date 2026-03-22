import { eq, ilike, sql } from "drizzle-orm";
import type { Game } from "@gamers-hub/types";
import { db } from "../client.js";
import { games } from "../schema.js";

// ── Row → domain type mapper ──────────────────────────────────

type RawGameRow = typeof games.$inferSelect;

function toGame(row: RawGameRow): Game {
  return {
    id: row.id,
    igdbId: row.igdbId,
    title: row.title,
    coverUrl: row.coverUrl,
    backgroundUrl: row.backgroundUrl,
    genres: row.genres,
    platforms: row.platforms,
    releaseYear: row.releaseYear,
    metacritic: row.metacritic,
    description: row.description,
  };
}

// ── findGameByIgdbId ──────────────────────────────────────────

export async function findGameByIgdbId(igdbId: number): Promise<Game | null> {
  const [row] = await db
    .select()
    .from(games)
    .where(eq(games.igdbId, igdbId))
    .limit(1);

  return row ? toGame(row) : null;
}

// ── findGameBySteamId ─────────────────────────────────────────

export async function findGameBySteamId(steamAppId: number): Promise<Game | null> {
  const [row] = await db
    .select()
    .from(games)
    .where(eq(games.steamAppId, steamAppId))
    .limit(1);

  return row ? toGame(row) : null;
}

// ── searchGames ───────────────────────────────────────────────

export async function searchGames(query: string, limit = 20): Promise<Game[]> {
  const rows = await db
    .select()
    .from(games)
    .where(ilike(games.title, `%${query}%`))
    .orderBy(
      // rank by trigram similarity if pg_trgm is available, fallback to title
      sql`similarity(${games.title}, ${query}) DESC`,
    )
    .limit(limit);

  return rows.map(toGame);
}

// ── upsertGame ────────────────────────────────────────────────

export async function upsertGame(data: {
  igdbId?: number | null;
  steamAppId?: number | null;
  title: string;
  coverUrl?: string | null;
  backgroundUrl?: string | null;
  genres?: string[];
  platforms?: string[];
  releaseYear?: number | null;
  metacritic?: number | null;
  description?: string | null;
}): Promise<Game> {
  const [row] = await db
    .insert(games)
    .values({
      igdbId: data.igdbId ?? null,
      steamAppId: data.steamAppId ?? null,
      title: data.title,
      coverUrl: data.coverUrl ?? null,
      backgroundUrl: data.backgroundUrl ?? null,
      genres: data.genres ?? [],
      platforms: data.platforms ?? [],
      releaseYear: data.releaseYear ?? null,
      metacritic: data.metacritic ?? null,
      description: data.description ?? null,
    })
    .onConflictDoUpdate({
      target: games.igdbId,
      set: {
        title: sql`EXCLUDED.title`,
        // COALESCE: never overwrite good cover with null
        coverUrl: sql`COALESCE(EXCLUDED.cover_url, games.cover_url)`,
        backgroundUrl: sql`COALESCE(EXCLUDED.background_url, games.background_url)`,
        genres: sql`CASE WHEN array_length(EXCLUDED.genres, 1) > 0 THEN EXCLUDED.genres ELSE games.genres END`,
        platforms: sql`CASE WHEN array_length(EXCLUDED.platforms, 1) > 0 THEN EXCLUDED.platforms ELSE games.platforms END`,
        releaseYear: sql`COALESCE(EXCLUDED.release_year, games.release_year)`,
        metacritic: sql`COALESCE(EXCLUDED.metacritic, games.metacritic)`,
        description: sql`COALESCE(EXCLUDED.description, games.description)`,
        steamAppId: sql`COALESCE(EXCLUDED.steam_app_id, games.steam_app_id)`,
      },
    })
    .returning();

  return toGame(row!);
}

// ── getGameById ───────────────────────────────────────────────

export async function getGameById(id: string): Promise<Game | null> {
  const [row] = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return row ? toGame(row) : null;
}
