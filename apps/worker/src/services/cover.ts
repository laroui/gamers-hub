import { Client as MinioClient } from "minio";
import { env } from "../config/env.js";
import { getIgdbGame, searchIgdb } from "./igdb.js";

const minio = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

async function cacheCoverToMinio(sourceUrl: string, gameId: string): Promise<string> {
  const objectName = `covers/${gameId}.jpg`;
  const bucket = env.MINIO_BUCKET_COVERS;
  const publicUrl = `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${bucket}/${objectName}`;

  try {
    await minio.statObject(bucket, objectName);
    return publicUrl; // already cached
  } catch {
    // Not cached yet
  }

  console.log(`      ⬇️  Fetching from: ${sourceUrl}`);
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    console.error(`      ⚠️  Fetch failed: ${res.status} ${res.statusText}`);
    throw new Error(`Failed to fetch cover from ${sourceUrl}: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  try {
    console.log(`      ⬆️  Uploading to MinIO: ${bucket}/${objectName}...`);
    await minio.putObject(bucket, objectName, buffer, buffer.length, {
      "Content-Type": "image/jpeg",
    });
    console.log(`      ✅  Upload success.`);
  } catch (err) {
    console.error(`      ❌  MinIO upload failed:`, err);
    throw err;
  }

  return publicUrl;
}

export interface EnrichmentResult {
  igdbId?: number;
  coverUrl?: string;
  screenshotUrls?: string[];
  description?: string;
  genres?: string[];
}

export async function enrichGame(game: {
  id: string;
  title: string;
  coverUrl: string | null;
  igdbId: number | null;
  steamAppId?: number | null;
}): Promise<EnrichmentResult | null> {
  const result: EnrichmentResult = {};
  let currentIgdbId = game.igdbId;

  // 1. If no IGDB ID, try searching it
  if (currentIgdbId == null) {
      console.log(`      🔍 Searching IGDB for: "${game.title}"...`);
      try {
          const searchResults = await searchIgdb(game.title, 1);
          if (searchResults && searchResults[0]) {
              currentIgdbId = searchResults[0].igdbId ?? null;
              if (currentIgdbId) {
                result.igdbId = currentIgdbId;
                console.log(`      🎯 Matched to IGDB ID: ${currentIgdbId}`);
              }
          }
      } catch (err) {
          console.error(`      ⚠️  IGDB Search failed:`, err);
      }
  }

  // 2. Fetch full metadata from IGDB
  if (currentIgdbId != null) {
    try {
      const igdbGame = await getIgdbGame(currentIgdbId);
      if (igdbGame) {
        if (igdbGame.coverUrl) {
          result.coverUrl = await cacheCoverToMinio(igdbGame.coverUrl, game.id);
        }
        if (igdbGame.screenshotUrls && igdbGame.screenshotUrls.length > 0) {
          result.screenshotUrls = igdbGame.screenshotUrls;
        }
        if (igdbGame.description) {
          result.description = igdbGame.description;
        }
        if (igdbGame.genres && igdbGame.genres.length > 0) {
          result.genres = igdbGame.genres;
        }
      }
    } catch {
      // ignore IGDB failure
    }
  }

  // 3. Fallback for cover if still missing (Steam CDN)
  if (!result.coverUrl && !game.coverUrl?.includes(env.MINIO_ENDPOINT)) {
    if (game.steamAppId != null) {
      try {
        const steamUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/library_600x900.jpg`;
        result.coverUrl = await cacheCoverToMinio(steamUrl, game.id);
      } catch {
        // ignore Steam failure
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

// Deprecated alias for backward compatibility
export async function resolveCoverUrl(game: any) {
  const res = await enrichGame(game);
  return res?.coverUrl ?? null;
}
