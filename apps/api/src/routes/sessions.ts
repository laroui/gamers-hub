// Stub — implemented in later batches
import type { FastifyInstance } from "fastify";
export async function sessionsRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ todo: "Implemented in later batch", route: "sessions" }));
}
