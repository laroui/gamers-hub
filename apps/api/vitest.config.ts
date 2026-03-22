import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { config } from "dotenv";

// Load root .env so DATABASE_URL, JWT_SECRET etc. are available during tests
config({ path: resolve(process.cwd(), "../../.env") });

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["./src/__tests__/setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/db/**"],
    },
  },
});
