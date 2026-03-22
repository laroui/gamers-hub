# Handoff: B12 → Next
**For whoever picks up this project next**

---

## Project state entering post-B12

| Batch | Commit | Status |
|---|---|---|
| B1–B2 | scaffold + DB schema | ✅ |
| B3 | Auth API (141 tests) | ✅ `a83e60b` |
| B4 | Platform Sync Engine (174 tests) | ✅ `b19bd02` |
| B5 | Games & Library API (176 tests) | ✅ `dfd9fba` |
| B6 | Stats & Analytics API (211 tests) | ✅ `26f120a` |
| B7 | React App Shell + Auth UI | ✅ `ad62e66` |
| B8 | Library Page | ✅ `46e1ec6` |
| B9 | Game Detail Page | ✅ `9f7caa5` |
| B10 | Platforms Page | ✅ `bb05698` |
| Fix | Steam OpenID + server-side key + disconnect bug | ✅ `cd5749a` |
| B11 | Stats Page + Gaming Wrapped + sync engine | ✅ `2a028c8` |
| B12 | PWA + Tauri + Capacitor + prod Docker + CI/CD | ✅ `c9754b5` |

**The application is feature-complete and production-deployable.**

---

## Local dev startup

```bash
# Terminal 0 — infrastructure
docker compose up -d postgres redis minio
pnpm db:migrate && pnpm db:seed   # only needed after docker restart

# Terminal A — API
pnpm --filter api run dev

# Terminal B — Web
pnpm --filter web run dev

# Terminal C — Worker (required for platform sync jobs to process)
pnpm --filter worker run dev
```

- API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Login: `nacim@gamershub.dev` / `password123`

**The worker (Terminal C) must be running for Steam/platform library syncs to complete.**

---

## Production deployment

```bash
# First-time server setup (Ubuntu 22.04+)
bash infra/scripts/setup-server.sh

# Deploy (run after git pull on server)
bash infra/scripts/deploy.sh

# Full production stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Database backup (run daily via cron)
bash infra/scripts/backup.sh
```

GitHub Actions auto-deploys on push to `main` via `appleboy/ssh-action`.
Required repository secrets: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `SERVER_PORT`.
See `SETUP.md` → "GitHub Actions Secrets" for full instructions.

---

## Desktop & mobile build commands

```bash
# Desktop (requires Rust — see SETUP.md)
pnpm dev:desktop      # dev mode with hot reload
pnpm build:desktop    # produces platform installer in src-tauri/target/release/bundle/

# Mobile (requires Android Studio / Xcode)
pnpm build:mobile     # builds web + syncs to native projects
pnpm open:android     # open in Android Studio
pnpm open:ios         # open in Xcode (macOS only)
```

---

## Complete repository structure

```
gamers-hub/
  apps/
    api/                     ✅ Fastify REST API (B3–B6) — DO NOT TOUCH
    worker/                  ✅ BullMQ sync worker (B4, B11 additions) — DO NOT TOUCH
    web/
      src/
        pages/               ✅ All pages complete (B7–B11) — DO NOT TOUCH
        components/          ✅ All components complete — DO NOT TOUCH
        hooks/
          useTauriEvents.ts  B12 — Tauri tray event bridge
          [all others]       B7–B11 complete
        styles/
          globals.css        append-only — safe-area CSS added B12
        vite-env.d.ts        B12 — Window.__TAURI__ type
        App.tsx              useTauriEvents() added B12
      public/
        favicon.svg          B12
        offline.html         B12
        pwa-192x192.png      B12
        pwa-512x512.png      B12
        apple-touch-icon.png B12
        favicon-32x32.png    B12
        favicon-16x16.png    B12
      src-tauri/             B12 — Tauri v2 scaffold (requires Rust to build)
        tauri.conf.json
        src/main.rs          system tray + sync event
        Cargo.toml
        build.rs
        capabilities/default.json
        icons/               copied from PWA PNGs
      android/               B12 — Capacitor Android project
      ios/                   B12 — Capacitor iOS/Xcode project
      capacitor.config.ts    B12
      vite.config.ts         B12 — navigateFallback added
      index.html             B12 — full PWA meta tags
  infra/
    nginx/                   existing Nginx config
    scripts/
      deploy.sh              B12 — production deploy
      backup.sh              B12 — DB backup (keeps 7 days)
      setup-server.sh        B12 — first-time Ubuntu server setup
      generate-icons.mjs     B12 — icon generation script (dev only)
    monitoring/
      docker-compose.monitoring.yml   B12 — Grafana + Loki + Promtail
      promtail-config.yml             B12 — Docker log scraping
    caddy/
      Caddyfile              B12 — automatic HTTPS (alternative to Nginx)
  docker-compose.yml         hardened B12 (logging + POSTGRES_INITDB_ARGS)
  docker-compose.prod.yml    B12 — production overrides (ports, memory limits)
  docker-compose.dev.yml     dev override — DO NOT TOUCH
  .github/workflows/ci.yml   B12 — SSH deploy step wired
  SETUP.md                   B12 — Tauri prereqs + CI secrets + monitoring appended
  package.json               B12 — build:desktop, build:mobile, open:ios, open:android
```

---

## What still requires system tools

These B12 items are scaffolded but need platform-specific tools to fully build:

| Feature | Requires | Status |
|---|---|---|
| Desktop app (`pnpm build:desktop`) | Rust + platform C++ build tools | Scaffold ✅, build needs Rust |
| iOS app (`pnpm open:ios`) | macOS + Xcode | Project ✅, requires macOS |
| Android app (`pnpm open:android`) | Android Studio + JDK | Project ✅, requires Android Studio |
| Tauri icon.icns / icon.ico | platform tools | PNGs present, .icns/.ico skipped |

---

## Key patterns — unchanged from B10/B11

### void pattern for async onClick
```typescript
onClick={() => { void handleAction(); }}
```

### err: unknown cast
```typescript
} catch (err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
```

### CSS variables — never hardcode colors
```
--gh-bg / --gh-bg2 / --gh-bg3
--gh-surface / --gh-surface2 / --gh-surface3
--gh-cyan / --gh-cyan-dim / --gh-cyan-glow
--gh-purple / --gh-pink / --gh-green / --gh-orange
```

### globals.css — append only, never modify existing rules

---

## Possible next steps

This project has no planned B13. Potential future work:
- **Multi-user / social features**: friends, library sharing, leaderboards
- **Push notifications**: Tauri native notifications on sync complete
- **IGDB metadata enrichment**: cover art pipeline via MinIO + IGDB API
- **Xbox / PSN OAuth**: complete the non-Steam platform connections
- **Tauri auto-update**: `tauri-plugin-updater` for desktop app OTA updates
- **Stripe billing**: premium tier if the project moves toward a SaaS model
