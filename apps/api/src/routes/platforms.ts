import type { FastifyInstance } from "fastify";
import { Queue, QueueEvents } from "bullmq";
import type { PlatformId, SyncJobPayload, SyncJobProgress } from "@gamers-hub/types";
import { authMiddleware } from "../middleware/auth.js";
import { getRedis } from "../db/redis.js";
import { getUserConnections, getConnection, deleteConnection } from "../db/queries/platforms.js";
import { getOAuthConfig, generateCodeVerifier, computeCodeChallenge, storeOAuthState, storePkceVerifier } from "../services/oauth.js";
import { randomBytes } from "node:crypto";

const QUEUE_NAME = "platform-sync";

const ALL_PLATFORMS: PlatformId[] = [
  "steam", "psn", "xbox", "epic", "gog", "nintendo", "ea", "ubisoft", "battlenet", "gamepass",
];

const DISPLAY_NAMES: Record<PlatformId, string> = {
  steam: "Steam",
  psn: "PlayStation Network",
  xbox: "Xbox Live",
  epic: "Epic Games",
  gog: "GOG",
  nintendo: "Nintendo Switch Online",
  ea: "EA App",
  ubisoft: "Ubisoft Connect",
  battlenet: "Battle.net",
  gamepass: "Xbox Game Pass",
};

// Use API key instead of OAuth (handled by dedicated endpoints)
const NON_OAUTH_PLATFORMS = new Set<PlatformId>(["steam", "nintendo", "gamepass"]);

export async function platformRoutes(server: FastifyInstance) {

  // ── GET /platforms — list all platforms with connection status ──

  server.get("/", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { userId } = req.user;
      const connections = await getUserConnections(userId);
      const connMap = new Map(connections.map((c) => [c.platform, c]));

      const result = ALL_PLATFORMS.map((platform) => {
        const conn = connMap.get(platform);
        return {
          platform,
          displayName: DISPLAY_NAMES[platform],
          connected: !!conn,
          gamesCount: conn?.gamesCount ?? 0,
          lastSynced: conn?.lastSynced ?? null,
          syncStatus: conn?.syncStatus ?? "idle",
        };
      });

      return reply.send(result);
    },
  });

  // ── POST /platforms/:platform/connect — start OAuth flow ──

  server.post<{ Params: { platform: string } }>("/:platform/connect", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { platform } = req.params;
      const { userId } = req.user;

      if (!ALL_PLATFORMS.includes(platform as PlatformId)) {
        return reply.code(400).send({ error: "InvalidPlatform", message: `Unknown platform: ${platform}` });
      }

      if (NON_OAUTH_PLATFORMS.has(platform as PlatformId)) {
        return reply.code(422).send({
          error: "NotOAuthPlatform",
          message:
            platform === "steam"
              ? "Steam uses an API key. Use POST /api/v1/auth/steam-key instead."
              : platform === "nintendo"
              ? "Nintendo uses a session token. Use POST /api/v1/auth/nintendo-token instead."
              : "This platform cannot be connected via OAuth.",
        });
      }

      const config = getOAuthConfig(platform as PlatformId);
      if (!config) {
        return reply.code(503).send({
          error: "PlatformNotConfigured",
          message: `${DISPLAY_NAMES[platform as PlatformId] ?? platform} OAuth credentials are not configured on this server.`,
        });
      }

      const state = randomBytes(16).toString("hex");
      await storeOAuthState(state, userId);

      const params: Record<string, string> = {
        client_id: config.clientId,
        response_type: "code",
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(" "),
        state,
      };

      if (config.usePKCE) {
        const verifier = generateCodeVerifier();
        const challenge = computeCodeChallenge(verifier);
        await storePkceVerifier(state, verifier);
        params["code_challenge"] = challenge;
        params["code_challenge_method"] = "S256";
      }

      const authUrl = `${config.authUrl}?${new URLSearchParams(params)}`;
      return reply.send({ authUrl, state });
    },
  });

  // ── DELETE /platforms/:platform — disconnect a platform ──

  server.delete<{ Params: { platform: string } }>("/:platform", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { platform } = req.params;
      const { userId } = req.user;

      if (!ALL_PLATFORMS.includes(platform as PlatformId)) {
        return reply.code(400).send({ error: "InvalidPlatform", message: `Unknown platform: ${platform}` });
      }

      await deleteConnection(userId, platform);
      return reply.code(204).send();
    },
  });

  // ── POST /platforms/:platform/sync — trigger manual sync ──

  server.post<{ Params: { platform: string } }>("/:platform/sync", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { platform } = req.params;
      const { userId } = req.user;

      if (!ALL_PLATFORMS.includes(platform as PlatformId)) {
        return reply.code(400).send({ error: "InvalidPlatform", message: `Unknown platform: ${platform}` });
      }

      const conn = await getConnection(userId, platform);
      if (!conn) {
        return reply.code(404).send({
          error: "NotConnected",
          message: `No ${DISPLAY_NAMES[platform as PlatformId] ?? platform} connection found. Connect the platform first.`,
        });
      }

      const queue = new Queue<SyncJobPayload>(QUEUE_NAME, {
        connection: getRedis(),
        defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
      });
      const jobId = `${userId}:${platform}:${Date.now()}`;
      await queue.add("sync", { userId, platform: platform as PlatformId, triggeredBy: "manual" }, { jobId });
      await queue.close();

      return reply.send({ jobId, message: "Sync queued" });
    },
  });

  // ── GET /platforms/:platform/status — connection status ──

  server.get<{ Params: { platform: string } }>("/:platform/status", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { platform } = req.params;
      const { userId } = req.user;

      if (!ALL_PLATFORMS.includes(platform as PlatformId)) {
        return reply.code(400).send({ error: "InvalidPlatform", message: `Unknown platform: ${platform}` });
      }

      const conn = await getConnection(userId, platform);
      if (!conn) {
        return reply.code(404).send({
          error: "NotConnected",
          message: `No ${DISPLAY_NAMES[platform as PlatformId] ?? platform} connection found.`,
        });
      }

      return reply.send({
        platform,
        displayName: DISPLAY_NAMES[platform as PlatformId] ?? platform,
        syncStatus: conn.syncStatus,
        lastSyncedAt: conn.lastSyncedAt?.toISOString() ?? null,
        platformUid: conn.platformUid,
        displayNameOnPlatform: conn.displayName,
      });
    },
  });

  // ── GET /platforms/:platform/sync/progress — SSE stream ──

  server.get<{ Params: { platform: string } }>("/:platform/sync/progress", {
    preHandler: authMiddleware,
    handler: async (req, reply) => {
      const { platform } = req.params;
      const { userId } = req.user;

      // SSE headers
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders();

      const sendEvent = (data: SyncJobProgress) => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const queueEvents = new QueueEvents(QUEUE_NAME, { connection: getRedis() });

      const timeout = setTimeout(() => {
        sendEvent({ stage: "done", processed: 0, total: 0, message: "Timed out waiting for sync" });
        reply.raw.end();
        queueEvents.close();
      }, 120000);

      const prefix = `${userId}:${platform}:`;

      queueEvents.on("progress", ({ jobId, data }: { jobId: string; data: unknown }) => {
        if (jobId.startsWith(prefix)) {
          sendEvent(data as SyncJobProgress);
        }
      });

      queueEvents.on("completed", ({ jobId }: { jobId: string }) => {
        if (jobId.startsWith(prefix)) {
          sendEvent({ stage: "done", processed: 0, total: 0, message: "Sync complete" });
          clearTimeout(timeout);
          reply.raw.end();
          queueEvents.close();
        }
      });

      queueEvents.on("failed", ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        if (jobId.startsWith(prefix)) {
          sendEvent({ stage: "done", processed: 0, total: 0, message: `Sync failed: ${failedReason}` });
          clearTimeout(timeout);
          reply.raw.end();
          queueEvents.close();
        }
      });

      // Hijack — Fastify must not try to serialise the response
      reply.hijack();
    },
  });
}
