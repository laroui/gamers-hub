# Handoff: B3 → B4 → B5 → B6 → B7 → B8
**For the AI implementing Batch B8**

---

## Project state entering B8

| Batch | Commit | Status |
|---|---|---|
| B1–B2 | scaffold + DB schema | ✅ |
| B3 | Auth API (141 tests) | ✅ `a83e60b` |
| B4 | Platform Sync Engine (174 tests) | ✅ `b19bd02` |
| B5 | Games & Library API (176 tests) | ✅ `dfd9fba` |
| B6 | Stats & Analytics API (211 tests) | ✅ `26f120a` |
| B7 | React App Shell + Auth UI | ✅ `ad62e66` |
| Fix | API dev server startup | ✅ `7168611` |

API: 211/211 tests passing. Worker: 33/33. Frontend: typecheck clean.

---

## Dev environment fixes (commit `7168611`)

Two bugs prevented the API from starting in dev mode — both now fixed:

1. **`tsx` watch arg order** — script was `tsx --env-file=... watch src/index.ts`; tsx v4 treats `watch` as a module path unless it comes first. Fixed to `tsx watch --env-file=../../.env src/index.ts`.
2. **`pino-pretty` not installed** — Fastify crashed on startup trying to load it as a pino transport. Added as devDependency.

### Correct local dev startup sequence

```bash
# 1. Start infrastructure (Postgres, Redis, MinIO)
docker compose up -d postgres redis minio

# 2. Migrate + seed (only needed once or after docker restart)
pnpm db:migrate
pnpm db:seed

# 3. Terminal A — API (hot-reload)
pnpm --filter api run dev

# 4. Terminal B — Frontend (Vite HMR)
pnpm --filter web run dev
```

- API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Vite proxies `/api` → `http://localhost:3000` (already configured)
- Seed login: `nacim@gamershub.dev` / `password123`

**Do NOT run `pnpm docker:up`** for local dev — that starts api/worker/web containers too and requires a full Docker build.

---

## Frontend structure entering B8

```
apps/web/src/
  main.tsx                   <ErrorBoundary> wraps <QueryClientProvider>
  App.tsx                    All routes wired — B1, correct
  lib/
    api/client.ts            Axios + in-memory token + auto-refresh — B1
    auth/
      AuthProvider.tsx       login/register/logout/restoreSession — B1
      ProtectedRoute.tsx     Uses <PageLoader /> — B7
  stores/
    ui.ts                    useUIStore + useLibraryStore (persisted) — B1
    toast.ts                 useToastStore + useToast() — B7
  hooks/
    useDebouncedCallback.ts  300ms debounce — B1
    useIsMobile.ts           MediaQuery hook at 768px — B7
  styles/globals.css         Design tokens + keyframes (spin, toastIn, etc.)
  components/
    ErrorBoundary.tsx        Class component, getDerivedStateFromError — B7
    layout/
      AppShell.tsx           Responsive: Sidebar (desktop) / BottomNav (mobile) — B7
      Sidebar.tsx            Nav + logout — B1
      Topbar.tsx             Title + search + status tabs + avatar dropdown — B7
      BottomNav.tsx          Fixed bottom nav for mobile — B7
    ui/
      Icons.tsx              LibraryIcon, PlatformsIcon, StatsIcon, ProfileIcon, etc. — B7
      Spinner.tsx            CSS spin animation — B7
      PageLoader.tsx         Full-screen loader using Spinner — B7
      Toast.tsx              ToastItem + ToastContainer — B7
  pages/
    LoginPage.tsx            ✅ B7 complete
    RegisterPage.tsx         ✅ B7 complete
    LibraryPage.tsx          ← B8 implements this (currently stub)
    ProfilePage.tsx          ← B8 or B11 (currently stub)
    GameDetailPage.tsx       ← B9
    PlatformsPage.tsx        ← B10
    StatsPage.tsx            ← B11
```

---

## CSS variables (globals.css) — ground truth

Never hardcode colors. Always use `var(--gh-*)`:

```
--gh-bg: #080b12          --gh-bg2: #0d1120         --gh-bg3: #121828
--gh-surface: #161e2e     --gh-surface2: #1c2640    --gh-surface3: #222e4a
--gh-border: rgba(255,255,255,0.07)
--gh-border2: rgba(255,255,255,0.12)
--gh-border3: rgba(255,255,255,0.18)
--gh-text: #e8eaf0        --gh-text2: #8892aa       --gh-text3: #4a5468
--gh-cyan: #00e5ff        --gh-cyan-dim: rgba(0,229,255,0.15)
--gh-purple: #7c4dff      --gh-pink: #ff4081        --gh-pink-dim: rgba(255,64,129,0.15)
--gh-green: #00e676       --gh-green-dim: rgba(0,230,118,0.15)
--gh-orange: #ff9100      --gh-orange-dim: rgba(255,145,0,0.15)
--font-display: "Barlow Condensed"   --font-body: "DM Sans"
--sidebar-w: 68px
```

Utility classes: `.font-display`, `.text-cyan`, `.bg-surface`, `.glow-cyan`, `.gh-card`, `.gh-card-hover`, `.badge-playing`, `.badge-completed`, `.badge-wishlist`, `.badge-dropped`, `.skeleton`, `.pulse-dot`, `.page-enter`

---

## API base URL + auth pattern

```typescript
import api from "../lib/api/client.ts";
// api is Axios with baseURL="/api/v1", withCredentials=true
// Auth: Bearer token auto-attached via interceptor
// 401 auto-refresh → retry → if fails, redirect to /login

// All protected endpoints return 401 if token missing/invalid
```

## Toast system

```typescript
import { useToast } from "../stores/toast.ts";
const { success, error, info, warning } = useToast();
success("Game added!");
error("Something went wrong", 5000); // custom duration ms
```

## exactOptionalPropertyTypes: true (web tsconfig too)

Never construct object literals that include `undefined` for optional fields:
```typescript
// ❌ Wrong
const params = { platform: filter.platform }; // if platform is string|undefined

// ✅ Correct
const params: LibraryQueryParams = {};
if (filter.platform !== undefined) params.platform = filter.platform;
```

---

## Key API endpoints available for B8

### Library
```
GET    /api/v1/library                 → { data: UserGame[], nextCursor, total }
GET    /api/v1/library?platform=steam&status=playing&genre=RPG&search=q&sort=hours&limit=40&cursor=...
GET    /api/v1/library/stats           → LibraryStats
GET    /api/v1/library/recent          → UserGame[] (limit 1–20)
POST   /api/v1/library/games           → 201 UserGame  body: { gameId, platform, platformGameId }
PATCH  /api/v1/library/games/:id       → UserGame  body: { status?, userRating?, userNotes?, completionPct? }
DELETE /api/v1/library/games/:id       → 204
```

### Games
```
GET /api/v1/games/search?q=           → Game[] (local + IGDB merged)
GET /api/v1/games/:id                 → Game
GET /api/v1/games/:id/achievements    → Achievement[]
```

### Stats
```
GET /api/v1/stats/overview            → LibraryStats
GET /api/v1/stats/heatmap?year=       → Record<"YYYY-MM-DD", number>
GET /api/v1/stats/streaks             → { current, longest, totalDays }
GET /api/v1/stats/weekly?weeks=       → { week, minutes, games }[]
GET /api/v1/stats/platforms           → { platform, minutes, games }[]
GET /api/v1/stats/genres              → { genre, minutes, games }[]
GET /api/v1/stats/wrapped?year=       → GamingWrapped
```

### Sessions
```
GET /api/v1/sessions                  → { data: PlaySession[], nextCursor }
GET /api/v1/sessions/:userGameId      → { data: PlaySession[], nextCursor }
```

---

## Shared types (packages/types/src/index.ts)

```typescript
User { id, email, username, avatarUrl, createdAt }
Game { id, igdbId?, steamAppId?, title, coverUrl?, backgroundUrl?, genres, platforms, releaseYear?, metacritic?, description? }
UserGame { id, userId, gameId, platform, platformGameId, status, minutesPlayed, lastPlayedAt?, completionPct, achievementsEarned, achievementsTotal, userRating?, userNotes?, addedAt, game: Game }
LibraryStats { totalGames, totalMinutes, totalHours, completedGames, currentlyPlaying, completionRate, platformBreakdown, genreBreakdown, deltaThisWeek }
PlaySession { id, userGameId, gameTitle, gameCoverUrl?, platform, startedAt, endedAt?, minutes, device? }
Achievement { id, userGameId, platformId, title, description?, iconUrl?, earnedAt?, rarityPct?, points?, isEarned }
GamingWrapped { year, totalHours, totalGames, newGames, completedGames, topGame, topGenre, topPlatform, longestSession, favoriteDay, lateNightGamer }
PlatformId = "steam" | "psn" | "xbox" | "epic" | "gog" | "nintendo" | "ea" | "ubisoft" | "battlenet" | "gamepass"
GameStatus = "library" | "playing" | "completed" | "wishlist" | "dropped"
```

---

## useLibraryStore (src/stores/ui.ts)

```typescript
const { filters, setFilter, viewMode, setViewMode } = useLibraryStore();
// filters: { platform?, genre?, status?, search?, sort: "recent"|"alpha"|"hours"|"progress"|"rating", limit: number }
// viewMode: "grid" | "list"
// setFilter("platform", "steam") / setFilter("search", undefined)
```

---

## What B8 must NOT touch

```
src/lib/auth/AuthProvider.tsx         B1
src/lib/api/client.ts                 B1
src/App.tsx                           B1
src/stores/ui.ts                      B1
src/hooks/useDebouncedCallback.ts     B1
src/pages/LoginPage.tsx               B7
src/pages/RegisterPage.tsx            B7
src/components/ErrorBoundary.tsx      B7
src/components/layout/AppShell.tsx    B7 (add imports if needed, but keep structure)
src/components/layout/Sidebar.tsx     B1
src/components/layout/Topbar.tsx      B7
src/components/layout/BottomNav.tsx   B7
src/components/ui/Icons.tsx           B7
src/components/ui/Spinner.tsx         B7
src/components/ui/PageLoader.tsx      B7
src/components/ui/Toast.tsx           B7
src/stores/toast.ts                   B7
src/styles/globals.css                B1+B7 — append only, never modify existing
src/pages/GameDetailPage.tsx          B9
src/pages/PlatformsPage.tsx           B10
src/pages/StatsPage.tsx               B11
apps/api/                             B3–B6 complete
apps/worker/                          B4 complete
```
