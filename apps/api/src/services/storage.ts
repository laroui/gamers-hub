import { Client as MinioClient } from "minio";
import { env } from "../config/env.js";

export const storage = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export function getPublicUrl(objectName: string): string {
  const protocol = env.MINIO_USE_SSL ? "https" : "http";
  return `${protocol}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${env.MINIO_BUCKET_COVERS}/${objectName}`;
}

export async function uploadBuffer(
  objectName: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await storage.putObject(
    env.MINIO_BUCKET_COVERS,
    objectName,
    buffer,
    buffer.length,
    { "Content-Type": contentType },
  );
  return getPublicUrl(objectName);
}
