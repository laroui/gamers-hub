// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFastify = import("fastify").FastifyInstance<any, any, any, any, any>;
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { getRedis } from "../db/redis.js";
import { env } from "../config/env.js";

export async function registerPlugins(server: AnyFastify) {
  // ── Security headers ────────────────────────────────────────
  await server.register(helmet, {
    contentSecurityPolicy: false, // handled by nginx in production
  });

  // ── CORS ────────────────────────────────────────────────────
  await server.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        "http://localhost:5173",
        "http://localhost:4173",
        env.APP_URL,
      ].filter(Boolean);
      if (
        allowed.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".railway.app")
      ) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // ── Cookies (for refresh token httpOnly) ────────────────────
  await server.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
    parseOptions: {},
  });

  // ── Multipart (file uploads) ─────────────────────────────────
  await server.register(multipart, {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2 MB
    },
  });

  // ── JWT ─────────────────────────────────────────────────────
  await server.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  });

  // ── Rate limiting (Redis-backed) ────────────────────────────
  await server.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_API_MAX,
    timeWindow: env.RATE_LIMIT_API_WINDOW,
    redis: getRedis(),
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please slow down.",
    }),
  });

  // ── OpenAPI / Swagger ───────────────────────────────────────
  await server.register(swagger, {
    openapi: {
      info: {
        title: "Gamers Hub API",
        description: "REST API for Gamers Hub — unified gaming library platform",
        version: "1.0.0",
      },
      servers: [{ url: "/api/v1" }],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
      tags: [
        { name: "auth", description: "Authentication & user management" },
        { name: "library", description: "Game library & stats" },
        { name: "platforms", description: "Platform connections & sync" },
        { name: "games", description: "Game catalog & metadata" },
        { name: "sessions", description: "Play sessions & analytics" },
        { name: "stats", description: "Statistics & wrapped" },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: false },
  });

  // ── Health check ────────────────────────────────────────────
  server.get("/health", { logLevel: "silent" }, async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));
}
