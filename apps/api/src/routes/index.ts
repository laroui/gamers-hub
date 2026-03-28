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
  const { notificationsRoutes } = await import("./notifications.js");
  const { postsRoutes } = await import("./posts.js");
  const { feedRoutes } = await import("./feed.js");

  // Admin routes
  const { adminRoutes } = await import("./admin/index.js");
  const { adminAnalyticsRoutes } = await import("./admin/analytics.js");
  const { adminArticlesRoutes } = await import("./admin/articles.js");
  const { adminSocialRoutes } = await import("./admin/social.js");
  const { adminAIRoutes } = await import("./admin/ai.js");
  const { adminDatabaseRoutes } = await import("./admin/database.js");
  const { adminUsersRoutes } = await import("./admin/users.js");

  await server.register(authRoutes, { prefix: "/api/v1/auth" });
  await server.register(platformRoutes, { prefix: "/api/v1/platforms" });
  await server.register(libraryRoutes, { prefix: "/api/v1/library" });
  await server.register(gamesRoutes, { prefix: "/api/v1/games" });
  await server.register(sessionsRoutes, { prefix: "/api/v1/sessions" });
  await server.register(statsRoutes, { prefix: "/api/v1/stats" });
  await server.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await server.register(postsRoutes, { prefix: "/api/v1/posts" });
  await server.register(feedRoutes, { prefix: "/api/v1/feed" });

  // Admin
  await server.register(adminRoutes, { prefix: "/api/v1/admin" });
  await server.register(adminAnalyticsRoutes, { prefix: "/api/v1/admin/analytics" });
  await server.register(adminArticlesRoutes, { prefix: "/api/v1/admin/articles" });
  await server.register(adminSocialRoutes, { prefix: "/api/v1/admin/social" });
  await server.register(adminAIRoutes, { prefix: "/api/v1/admin/ai" });
  await server.register(adminDatabaseRoutes, { prefix: "/api/v1/admin/db" });
  await server.register(adminUsersRoutes, { prefix: "/api/v1/admin/users" });
}
