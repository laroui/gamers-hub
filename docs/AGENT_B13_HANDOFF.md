# Handoff: B13 → Next
**For whoever picks up this project next**

---

## Project state entering post-B13

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
| B13 | Profile Page (avatar, username, password, export) | ✅ |

**Every page is now fully implemented. There are no remaining stubs.**

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

---

## Complete repository structure (post-B13)

```
gamers-hub/
  apps/
    api/
      src/
        routes/
          auth.ts              ✅ B3+B13 — all endpoints complete (register, login, me, avatar, change-password)
          library.ts           ✅ B5
          games.ts             ✅ B5
          platforms.ts         ✅ B4/B10
          sessions.ts          ✅ B6
          stats.ts             ✅ B6+B11
        services/
          auth.ts              ✅ B3 — token logic, DO NOT TOUCH
          cover.ts             ✅ B9, updated B13 to import from storage.ts
          storage.ts           ✅ B13 — shared MinIO client + uploadBuffer helper
        plugins/
          index.ts             ✅ B13 — @fastify/multipart registered (2 MB limit)
        db/
          schema.ts            ✅ B1 — DO NOT TOUCH
          migrations/          ✅ 0001 initial, 0002 play_sessions dedup unique constraint
    worker/
      src/
        index.ts               ✅ BullMQ worker — DO NOT TOUCH
        adapters/steam.ts      ✅ fixed B11 — uses playtime_2weeks for session minutes
    web/
      src/
        pages/
          LibraryPage.tsx      ✅ B8
          GameDetailPage.tsx   ✅ B9
          PlatformsPage.tsx    ✅ B10
          StatsPage.tsx        ✅ B11 — year selector controls all 5 charts
          ProfilePage.tsx      ✅ B13 — full two-column profile management page
        components/
          layout/
            Topbar.tsx         ✅ B13 — shows avatarUrl <img> when set
            AppShell.tsx       ✅ B12
            BottomNav.tsx      ✅ B12
          profile/             ✅ B13 — all 6 components
            AvatarCard.tsx
            ProfileStats.tsx
            ProfilePlatforms.tsx
            ChangePassword.tsx
            ShareProfile.tsx
            DangerZone.tsx
          stats/               ✅ B11 — all 6 stat components (WeeklyChart, PlatformDonut, GenreChart, PlayHeatmap, StreakPills, WrappedCard)
          ui/                  ✅ B7
        hooks/
          useProfile.ts        ✅ B13
          useStats.ts          ✅ B11 — all year-parameterized
          usePlatforms.ts      ✅ B10
          useTauriEvents.ts    ✅ B12
        lib/
          auth/AuthProvider.tsx  ✅ B13 — refreshUser() added to context
          api/client.ts          ✅ B7 — Axios + JWT interceptors
        styles/
          globals.css          ✅ append-only — B12 safe-area block at bottom
        stores/
          toast.ts             ✅ B7 — DO NOT TOUCH
          ui.ts                ✅ B7
      public/                  ✅ B12 — all PWA icons
      src-tauri/               ✅ B12 — Tauri v2 scaffold
      android/                 ✅ B12 — Capacitor Android
      ios/                     ✅ B12 — Capacitor iOS
      capacitor.config.ts      ✅ B12
  packages/types/src/index.ts  ✅ B1 — shared interfaces
  infra/
    scripts/                   ✅ B12 — deploy.sh, backup.sh, setup-server.sh
    monitoring/                ✅ B12 — Grafana + Loki + Promtail
    caddy/                     ✅ B12 — automatic HTTPS
  docker-compose.yml           ✅ B12 hardened
  docker-compose.prod.yml      ✅ B12
  .github/workflows/ci.yml     ✅ B12 — SSH deploy
```

---

## API surface (complete)

| Method | Path | Auth | Added |
|---|---|---|---|
| POST | /api/v1/auth/register | — | B3 |
| POST | /api/v1/auth/login | — | B3 |
| POST | /api/v1/auth/refresh | — | B3 |
| POST | /api/v1/auth/logout | ✓ | B3 |
| GET | /api/v1/auth/me | ✓ | B3 |
| PATCH | /api/v1/auth/me | ✓ | B13 |
| POST | /api/v1/auth/avatar | ✓ | B13 |
| POST | /api/v1/auth/change-password | ✓ | B13 |
| GET | /api/v1/library | ✓ | B5 |
| GET | /api/v1/library/stats | ✓ | B5 |
| GET | /api/v1/games | ✓ | B5 |
| GET | /api/v1/games/:id | ✓ | B5 |
| GET | /api/v1/platforms | ✓ | B4 |
| GET | /api/v1/platforms/:id/sync | ✓ | B4 |
| DELETE | /api/v1/platforms/:id | ✓ | B10 Fix |
| GET | /api/v1/stats/heatmap | ✓ | B6 |
| GET | /api/v1/stats/streaks | ✓ | B6 |
| GET | /api/v1/stats/weekly?year= | ✓ | B11 |
| GET | /api/v1/stats/platforms?year= | ✓ | B11 |
| GET | /api/v1/stats/genres?year= | ✓ | B11 |
| GET | /api/v1/stats/wrapped?year= | ✓ | B6 |

---

## Critical patterns — unchanged from B11/B12

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
--gh-text / --gh-text2 / --gh-text3
```

### globals.css — append only, never modify existing rules

### MinIO avatar storage
- Object path: `avatars/{userId}.{ext}` in the same bucket as covers (`MINIO_BUCKET_COVERS`)
- Public URL: `http://{MINIO_ENDPOINT}:{MINIO_PORT}/{MINIO_BUCKET_COVERS}/avatars/{userId}.{ext}`
- Use `uploadBuffer` from `apps/api/src/services/storage.ts` for any new file uploads

### refreshUser pattern
After any mutation that updates the user record, call `refreshUser()` from `useAuth()` context so the Topbar and any other consumer of the auth context reflects changes immediately.

---

## Stats page — year selector

All five charts accept a `year` prop and fetch year-filtered data:
- `WeeklyChart` / `PlatformDonut` / `GenreChart` / `PlayHeatmap` / `WrappedCard`
- API routes `/stats/weekly`, `/stats/platforms`, `/stats/genres` all accept `?year=` and cache per `userId:year`
- React Query keys include year: `["stats", "weekly", year]` etc.

---

## Possible next steps

The project is fully feature-complete. Potential future work:

- **Multi-user / social features**: friends, library sharing, leaderboards
- **Push notifications**: Tauri native notifications on sync complete
- **Xbox / PSN OAuth**: complete the non-Steam platform connections (UI stubs exist)
- **Email verification**: send verification email on register, gate login on verified flag
- **DELETE /auth/account**: real account deletion with email confirmation (DangerZone UI is already scaffolded)
- **IGDB metadata enrichment**: cover art pipeline via MinIO + IGDB API
- **Tauri auto-update**: `tauri-plugin-updater` for desktop OTA updates
- **Stripe billing**: premium tier if moving toward SaaS
