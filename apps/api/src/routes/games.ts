// Stub — implemented in later batches
import type { FastifyInstance } from "fastify";
export async function gamesRoutes(server: FastifyInstance) {
  server.get("/", async () => ({ todo: "Implemented in later batch", route: "games" }));
}
