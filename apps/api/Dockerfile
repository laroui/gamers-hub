# ============================================================
#  GAMERS HUB — API Dockerfile (multi-stage)
# ============================================================

FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ── Development (hot reload via tsx watch) ────────────────────
FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "api", "run", "dev"]

# ── Builder ───────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm --filter "@gamers-hub/types" run build 2>/dev/null || true
RUN pnpm --filter api run build

# ── Production ────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
