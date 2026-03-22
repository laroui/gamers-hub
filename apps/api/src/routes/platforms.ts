// Stub — implemented in later batches
import type { FastifyInstance } from "fastify";
export async function platformsRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ todo: "Implemented in later batch", route: "platforms" }));
}
