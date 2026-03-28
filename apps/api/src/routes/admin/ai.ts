import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../../db/client.js";
import { articles } from "../../db/schema.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { env } from "../../config/env.js";
function makeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export async function adminAIRoutes(server: FastifyInstance) {
  // ── POST /generate ────────────────────────────────────────────────
  server.post("/generate", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const body = req.body as { topic: string; type?: string; tone?: string; length?: string };

      const wordCounts: Record<string, number> = { short: 150, medium: 300, long: 600 };
      const targetWords = wordCounts[body.length ?? "medium"] ?? 300;

      try {
        const client = getClient();

        const message = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          system: `You are a gaming journalist writing for Gamers Hub, a premium gaming platform. Write engaging, factual gaming content. Never fabricate specific facts, dates, or quotes. Format: plain text, no markdown headers. Start directly with the content. Target length: ~${targetWords} words.`,
          messages: [{
            role: "user",
            content: `Write a ${body.type ?? "news brief"} about: "${body.topic}"\nTone: ${body.tone ?? "analytical"}\nInclude: what gamers need to know, why it matters, engaging hook.`,
          }],
        });

        const content = (message.content[0] as { text: string }).text;

        // Generate title + summary
        const metaMessage = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: `Given this article content, respond with JSON only (no markdown): {"title": "...", "summary": "..."}\nTitle: compelling, max 60 chars.\nSummary: 1-2 sentences, max 120 chars.\n\nArticle: ${content.slice(0, 500)}...`,
          }],
        });

        let meta = { title: body.topic, summary: "" };
        try {
          meta = JSON.parse((metaMessage.content[0] as { text: string }).text) as typeof meta;
        } catch { /* use defaults */ }

        return reply.send({ content, title: meta.title, summary: meta.summary });
      } catch (e: unknown) {
        return reply.status(500).send({ error: e instanceof Error ? e.message : String(e) });
      }
    },
  });

  // ── GET /webhook-url ──────────────────────────────────────────────
  server.get("/webhook-url", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      return reply.send({
        url: `${process.env["APP_URL"] ?? ""}/api/v1/admin/ai/webhook`,
        secret: "Set X-Webhook-Secret header with your WEBHOOK_SECRET env var",
        method: "POST",
        body: {
          title: "string (required)",
          content: "string (required)",
          summary: "string (optional)",
          tag: "news | review | release",
          autoPublish: "boolean (default: false)",
          coverImageUrl: "string (optional)",
        },
      });
    },
  });

  // ── POST /webhook — receive from n8n/Make/external ────────────────
  server.post("/webhook", {
    handler: async (req, reply) => {
      const webhookSecret = (req.headers as Record<string, string>)["x-webhook-secret"];
      if (!env.WEBHOOK_SECRET || webhookSecret !== env.WEBHOOK_SECRET) {
        return reply.status(403).send({ error: "Invalid webhook secret" });
      }

      const body = req.body as {
        title?: string;
        content?: string;
        summary?: string;
        tag?: string;
        autoPublish?: boolean;
        coverImageUrl?: string;
      };

      if (!body.title || !body.content) {
        return reply.status(400).send({ error: "title and content required" });
      }

      const adminUserId = env.ADMIN_USER_ID;
      if (!adminUserId) return reply.status(503).send({ error: "ADMIN_USER_ID not configured" });

      const slug = makeSlug(body.title) + "-" + Date.now().toString(36);

      const [post] = await db.insert(articles).values({
        authorId: adminUserId,
        title: body.title,
        slug,
        summary: body.summary ?? body.content.slice(0, 120) + "...",
        content: body.content,
        coverImageUrl: body.coverImageUrl ?? null,
        tag: body.tag ?? "news",
        status: body.autoPublish ? "published" : "draft",
        publishedAt: body.autoPublish ? new Date() : null,
        aiGenerated: true,
      }).returning();

      return reply.send({ ok: true, postId: post!.id, status: post!.status });
    },
  });
}
