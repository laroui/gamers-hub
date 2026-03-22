# Gamers Hub — Complete Setup Guide

This guide takes you from zero to a fully running local dev environment.
Follow every step in order. Nothing is assumed to be pre-installed.

---

## Prerequisites

### 1. Node.js 20+

```bash
# Option A: via nvm (recommended — lets you switch versions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 20
nvm use 20
node --version   # should print v20.x.x

# Option B: direct download
# → https://nodejs.org/en/download  (LTS version)
```

### 2. pnpm 9

```bash
npm install -g pnpm@9.15.0
pnpm --version   # should print 9.15.0
```

### 3. Docker + Docker Compose

```bash
# macOS → Install Docker Desktop: https://docs.docker.com/desktop/mac/install/

# Ubuntu/Debian:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version          # Docker version 25+
docker compose version    # Docker Compose version 2.x
```

### 4. Git

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt install git -y

git --version
```

---

## First-Time Setup

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/gamers-hub.git
cd gamers-hub
```

### Step 2 — Create your .env file

```bash
cp .env.example .env
```

Now open `.env` and fill in the minimum required values for local dev:

```env
# These are the ONLY vars required to boot locally.
# Platform API keys are optional — features degrade gracefully.

JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate another one the same way>

# Leave everything else as-is for local Docker defaults
```

**Generate secrets quickly:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run twice — paste first output into JWT_SECRET, second into JWT_REFRESH_SECRET
```

### Step 3 — Install dependencies

```bash
pnpm install
```

### Step 4 — Start infrastructure (Postgres + Redis + MinIO)

```bash
pnpm docker:up
```

Wait ~15 seconds for all services to be healthy:

```bash
docker compose ps
# All services should show "healthy" or "running"
```

You now have:
- **PostgreSQL** at `localhost:5432`
- **Redis** at `localhost:6379`
- **MinIO** at `localhost:9000` (S3 API) and `localhost:9001` (web console)

### Step 5 — Run database migrations

```bash
pnpm db:migrate
```

### Step 6 — Seed the database

```bash
pnpm db:seed
```

This creates:
- Two users: `nacim@gamershub.dev` and `demo@gamershub.dev`
- Password for both: `password123`
- 20 games, platform connections, 90 days of play history

### Step 7 — Start the development servers

```bash
pnpm dev
```

This starts all apps in parallel via Turborepo:
- **Web** → http://localhost:5173
- **API** → http://localhost:3000
- **API Docs** → http://localhost:3000/docs
- **Worker** → background process (no port)

---

## Platform API Keys Setup (Optional — do before B4)

Each platform is optional. The app runs without any keys — games synced
from that platform just won't appear until the key is configured.

### Steam (Free)

1. Go to https://steamcommunity.com/dev/apikey
2. Enter your domain (use `localhost` for dev)
3. Copy the key into `.env` → `STEAM_API_KEY`

### Xbox Live / Microsoft (Free Azure App)

1. Go to https://portal.azure.com
2. Search "App registrations" → New registration
3. Name: `Gamers Hub Dev`
4. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: `http://localhost:3000/api/v1/auth/oauth/xbox/callback`
6. Go to "Certificates & secrets" → New client secret → copy value
7. Copy App (client) ID → `XBOX_CLIENT_ID`
8. Copy secret value → `XBOX_CLIENT_SECRET`

### PlayStation Network (Free)

1. Go to https://partners.api.playstation.com
2. Create a developer account
3. Register a new application
4. Redirect URI: `http://localhost:3000/api/v1/auth/oauth/psn/callback`
5. Copy client ID/secret into `.env`

### IGDB / Twitch (Free — for game covers & metadata)

1. Go to https://dev.twitch.tv/console
2. Register a new application
3. Name: `Gamers Hub`, Category: `Application Integration`
4. OAuth Redirect URL: `http://localhost:3000`
5. Copy **Client ID** → `IGDB_CLIENT_ID`
6. Generate a **New Secret** → `IGDB_CLIENT_SECRET`

> IGDB uses Twitch OAuth2 for auth. Your Client ID/Secret are valid for both.

### SteamGridDB (Free — custom cover art)

1. Go to https://www.steamgriddb.com/profile/preferences/api
2. Click "Generate API Key"
3. Copy into `.env` → `STEAMGRIDDB_API_KEY`

### Nintendo Switch Online (Unofficial)

Nintendo doesn't have an official API. We use `nxapi` to extract a session token:

```bash
# Install nxapi
npm install -g nxapi

# Login with your Nintendo account
nxapi nso auth

# Extract your session token
nxapi nso token
```

Copy the `session_token` value → `.env` → `NINTENDO_SESSION_TOKEN`

> Note: Nintendo session tokens expire. Re-run `nxapi nso auth` when sync fails.

---

## Useful Commands

```bash
# Dev
pnpm dev                  # Start all services (hot reload)
pnpm dev --filter web     # Start only the web app
pnpm dev --filter api     # Start only the API

# Database
pnpm db:generate          # Generate new migration from schema changes
pnpm db:migrate           # Apply pending migrations
pnpm db:seed              # Seed with dev data
pnpm db:studio            # Open Drizzle Studio (visual DB browser) at localhost:4983

# Docker
pnpm docker:up            # Start Postgres + Redis + MinIO
pnpm docker:down          # Stop all containers
pnpm docker:logs          # Follow all container logs
pnpm docker:reset         # Wipe volumes and restart fresh (destroys all data)

# Quality
pnpm lint                 # ESLint all packages
pnpm typecheck            # TypeScript check all packages
pnpm test                 # Run all tests
pnpm format               # Prettier format all files

# Build
pnpm build                # Production build all packages
pnpm build --filter web   # Build only the web app
```

---

## Project Structure Reference

```
gamers-hub/
├── apps/
│   ├── web/              React 19 + Vite frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── layout/   AppShell, Sidebar, Topbar
│   │   │   ├── pages/        One file per route
│   │   │   ├── hooks/        Custom React hooks
│   │   │   ├── stores/       Zustand state
│   │   │   ├── lib/
│   │   │   │   ├── api/      Axios client + interceptors
│   │   │   │   └── auth/     AuthProvider, ProtectedRoute
│   │   │   ├── styles/       globals.css (design tokens)
│   │   │   └── types/        Frontend-only types
│   │   ├── vite.config.ts
│   │   └── Dockerfile
│   │
│   ├── api/              Fastify REST API
│   │   ├── src/
│   │   │   ├── config/   env.ts (Zod-validated)
│   │   │   ├── db/       schema, client, migrate, seed, redis
│   │   │   ├── middleware/ auth.ts
│   │   │   ├── plugins/  cors, jwt, helmet, swagger, ratelimit
│   │   │   ├── routes/   one file per resource
│   │   │   └── services/ business logic (added in B3+)
│   │   ├── drizzle.config.ts
│   │   └── Dockerfile
│   │
│   └── worker/           BullMQ job processor
│       ├── src/
│       │   ├── jobs/     sync-steam.ts, sync-psn.ts, etc.
│       │   ├── queues.ts
│       │   ├── redis.ts
│       │   └── index.ts
│       └── Dockerfile
│
├── packages/
│   ├── types/            Shared TypeScript interfaces
│   ├── ui/               Shared component library (B7+)
│   └── platform-sdk/     Platform adapter interfaces (B4+)
│
├── infra/
│   ├── docker/postgres/  init.sql
│   └── nginx/            nginx.conf
│
├── .github/workflows/    CI/CD
├── docker-compose.yml    Production stack
├── docker-compose.dev.yml Dev overrides
├── .env.example          All env vars documented
├── turbo.json            Turborepo pipeline
└── pnpm-workspace.yaml   Workspace definition
```

---

## Accessing Local Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Web App | http://localhost:5173 | — |
| API | http://localhost:3000 | — |
| API Docs (Swagger) | http://localhost:3000/docs | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin_changeme |
| Drizzle Studio | http://localhost:4983 | — (run `pnpm db:studio`) |
| Postgres | localhost:5432 | gamers_hub / changeme_in_production |
| Redis | localhost:6379 | — |

---

## Troubleshooting

**`pnpm install` fails with peer dependency errors**
```bash
pnpm install --shamefully-hoist
```

**Postgres won't start / port 5432 already in use**
```bash
# Check what's using the port
lsof -i :5432
# Stop local postgres if running
sudo service postgresql stop  # Linux
brew services stop postgresql # macOS
```

**`pnpm db:migrate` fails with "relation does not exist"**
```bash
# Reset and try again
pnpm docker:reset
pnpm db:migrate
pnpm db:seed
```

**API crashes with "Invalid environment variables"**
Make sure `.env` exists and `JWT_SECRET` + `JWT_REFRESH_SECRET` are set (min 32 chars each).

**MinIO bucket not found**
The `minio-init` container creates the bucket on first run.
If it failed, run manually:
```bash
docker compose run --rm minio-init
```

**`pnpm dev` — web app shows blank page**
Check the browser console. If it's a CORS error, make sure the API
is running (`pnpm dev --filter api`) and `APP_URL` in `.env` matches
your frontend URL exactly.
