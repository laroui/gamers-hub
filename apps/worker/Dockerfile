FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS development
COPY . .
CMD ["pnpm", "--filter", "worker", "run", "dev"]

FROM deps AS builder
COPY . .
RUN pnpm --filter worker run build

FROM node:20-alpine AS production
RUN npm install -g pnpm@9.15.0
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY packages/types ./packages/types

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "apps/worker/dist/index.js"]
