import { Client as MinioClient } from "minio";
import { env } from "../config/env.js";
import { getIgdbGame } from "./igdb.js";

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
    // Not cached yet — download and upload
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch cover from ${sourceUrl}: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  await minio.putObject(bucket, objectName, buffer, buffer.length, {
    "Content-Type": "image/jpeg",
  });

  return publicUrl;
}

export async function resolveCoverUrl(game: {
  id: string;
  coverUrl: string | null;
  igdbId: number | null;
  steamAppId?: number | null;
}): Promise<string | null> {
  try {
    if (game.coverUrl?.includes(env.MINIO_ENDPOINT)) return game.coverUrl;

    if (game.igdbId != null) {
      const igdbGame = await getIgdbGame(game.igdbId);
      if (igdbGame?.coverUrl) {
        return await cacheCoverToMinio(igdbGame.coverUrl, game.id);
      }
    }

    if (game.steamAppId != null) {
      const steamUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/library_600x900.jpg`;
      return await cacheCoverToMinio(steamUrl, game.id);
    }

    return null;
  } catch {
    return null;
  }
}
