FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter "@gamers-hub/types" run build 2>/dev/null || true
RUN pnpm --filter api run build

FROM node:20-alpine AS production
RUN npm install -g pnpm@9.15.0
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY packages/types ./packages/types

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
