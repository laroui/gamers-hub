import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // MinIO
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin_changeme"),
  MINIO_BUCKET_COVERS: z.string().default("game-covers"),

  // IGDB
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),

  // SteamGridDB
  STEAMGRIDDB_API_KEY: z.string().optional(),

  // Platform keys (optional — features degrade gracefully)
  STEAM_API_KEY: z.string().optional(),
  STEAM_OPENID_CALLBACK: z.string().optional(), // defaults to http://localhost:{PORT}/api/v1/auth/steam-openid/callback
  XBOX_CLIENT_ID: z.string().optional(),
  XBOX_CLIENT_SECRET: z.string().optional(),
  XBOX_REDIRECT_URI: z.string().optional(),
  PSN_CLIENT_ID: z.string().optional(),
  PSN_CLIENT_SECRET: z.string().optional(),
  PSN_REDIRECT_URI: z.string().optional(),
  EPIC_CLIENT_ID: z.string().optional(),
  EPIC_CLIENT_SECRET: z.string().optional(),
  EPIC_REDIRECT_URI: z.string().optional(),
  GOG_CLIENT_ID: z.string().optional(),
  GOG_CLIENT_SECRET: z.string().optional(),
  GOG_REDIRECT_URI: z.string().optional(),
  NINTENDO_SESSION_TOKEN: z.string().optional(),
  EA_CLIENT_ID: z.string().optional(),
  EA_CLIENT_SECRET: z.string().optional(),
  UBISOFT_CLIENT_ID: z.string().optional(),
  UBISOFT_CLIENT_SECRET: z.string().optional(),
  BATTLENET_CLIENT_ID: z.string().optional(),
  BATTLENET_CLIENT_SECRET: z.string().optional(),
  BATTLENET_REGION: z.string().default("eu"),

  // Worker
  WORKER_CONCURRENCY: z.coerce.number().default(3),
  SYNC_JOB_TIMEOUT_MS: z.coerce.number().default(120000),

  // Rate limiting
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_AUTH_WINDOW: z.coerce.number().default(60000),
  RATE_LIMIT_API_MAX: z.coerce.number().default(100),
  RATE_LIMIT_API_WINDOW: z.coerce.number().default(60000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
