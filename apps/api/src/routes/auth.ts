// ============================================================
//  AUTH ROUTES STUB
//  Implemented fully in Batch B3
// ============================================================
import type { FastifyInstance } from "fastify";

export async function authRoutes(server: FastifyInstance) {
  server.post("/register", async () => ({ todo: "B3 — register" }));
  server.post("/login", async () => ({ todo: "B3 — login" }));
  server.post("/logout", async () => ({ todo: "B3 — logout" }));
  server.post("/refresh", async () => ({ todo: "B3 — refresh" }));
  server.get("/me", async () => ({ todo: "B3 — me" }));
  server.patch("/me", async () => ({ todo: "B3 — update me" }));
  server.get("/oauth/:platform", async (req) => ({ todo: `B3 — oauth init: ${(req.params as any).platform}` }));
  server.get("/oauth/:platform/callback", async (req) => ({ todo: `B3 — oauth callback: ${(req.params as any).platform}` }));
}
