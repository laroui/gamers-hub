// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFastify = import("fastify").FastifyInstance<any, any, any, any, any>;

export async function registerRoutes(server: AnyFastify) {
  // Lazy import each route module — B3+ will fill these in
  const { authRoutes } = await import("./auth.js");
  const { platformRoutes } = await import("./platforms.js");
  const { libraryRoutes } = await import("./library.js");
  const { gamesRoutes } = await import("./games.js");
  const { sessionsRoutes } = await import("./sessions.js");
  const { statsRoutes } = await import("./stats.js");

  await server.register(authRoutes, { prefix: "/api/v1/auth" });
  await server.register(platformRoutes, { prefix: "/api/v1/platforms" });
  await server.register(libraryRoutes, { prefix: "/api/v1/library" });
  await server.register(gamesRoutes, { prefix: "/api/v1/games" });
  await server.register(sessionsRoutes, { prefix: "/api/v1/sessions" });
  await server.register(statsRoutes, { prefix: "/api/v1/stats" });
}
