# ============================================================
#  GAMERS HUB — API Dockerfile (multi-stage)
# ============================================================

FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
RUN pnpm install --frozen-lockfile

# ── Builder ───────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm --filter "@gamers-hub/types" run build 2>/dev/null || true
RUN pnpm --filter api run build
# pnpm deploy: copies dist + resolves all production node_modules
# without workspace symlinks — fully self-contained
RUN pnpm deploy --filter api --prod /standalone

# ── Production ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /standalone .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
