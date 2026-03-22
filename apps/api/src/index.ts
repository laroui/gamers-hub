import "dotenv/config";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./routes/index.js";

const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
  requestTimeout: 30000,
  bodyLimit: 1048576, // 1MB
});

async function start() {
  try {
    await registerPlugins(server);
    await registerRoutes(server);

    await server.listen({ port: env.PORT, host: "0.0.0.0" });
    server.log.info(`Gamers Hub API running on port ${env.PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully`);
  await server.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
