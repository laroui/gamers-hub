import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  XBOX_CLIENT_ID: z.string().optional(),
  XBOX_CLIENT_SECRET: z.string().optional(),
  EPIC_CLIENT_ID: z.string().optional(),
  EPIC_CLIENT_SECRET: z.string().optional(),
  PSN_CLIENT_ID: z.string().optional(),
  PSN_CLIENT_SECRET: z.string().optional(),
  GOG_CLIENT_ID: z.string().optional(),
  GOG_CLIENT_SECRET: z.string().optional(),
  NINTENDO_SESSION_TOKEN: z.string().optional(),
  EA_CLIENT_ID: z.string().optional(),
  EA_CLIENT_SECRET: z.string().optional(),
  UBISOFT_CLIENT_ID: z.string().optional(),
  UBISOFT_CLIENT_SECRET: z.string().optional(),
  BATTLENET_CLIENT_ID: z.string().optional(),
  BATTLENET_CLIENT_SECRET: z.string().optional(),
  BATTLENET_REGION: z.string().default("eu"),
  WORKER_CONCURRENCY: z.coerce.number().default(3),
  SYNC_JOB_TIMEOUT_MS: z.coerce.number().default(120000),
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // MinIO
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.preprocess((v) => v === "true" || v === "1", z.boolean()).default(false),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin_changeme"),
  MINIO_BUCKET_COVERS: z.string().default("game-covers"),

  // IGDB
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Worker env validation failed:", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
