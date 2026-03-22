# Handoff: B8 → B9
**For the AI implementing Batch B9**

---

## Project state entering B9

| Batch | Commit | Status |
|---|---|---|
| B1–B2 | scaffold + DB schema | ✅ |
| B3 | Auth API (141 tests) | ✅ `a83e60b` |
| B4 | Platform Sync Engine (174 tests) | ✅ `b19bd02` |
| B5 | Games & Library API (176 tests) | ✅ `dfd9fba` |
| B6 | Stats & Analytics API (211 tests) | ✅ `26f120a` |
| B7 | React App Shell + Auth UI | ✅ `ad62e66` |
| Fix | API dev server startup | ✅ `7168611` |
| B8 | Library Page | ✅ `46e1ec6` |

API: 211/211 tests passing. Worker: 33/33. Frontend: typecheck clean.

---

## Local dev startup

```bash
docker compose up -d postgres redis minio
pnpm db:migrate && pnpm db:seed   # only needed after docker restart
pnpm --filter api run dev         # Terminal A
pnpm --filter web run dev         # Terminal B
```
- API: `http://localhost:3000` · Frontend: `http://localhost:5173`
- Login: `nacim@gamershub.dev` / `password123`

---

## Frontend structure entering B9

```
apps/web/src/
  pages/
    LibraryPage.tsx          ✅ B8 complete — full page
    GameDetailPage.tsx        ← B9 implements this (currently stub)
    PlatformsPage.tsx         ← B10
    StatsPage.tsx             ← B11
    ProfilePage.tsx           ← B8/B11
  components/
    library/
      GameCard.tsx            B8 — card + GameCard.Skeleton
      GameListRow.tsx         B8 — list row
      GamesGrid.tsx           B8 — infinite scroll grid
      FilterBar.tsx           B8 — genre + sort + view toggle
      StatsRow.tsx            B8 — 4 animated stat cards
      RecentlyPlayed.tsx      B8 — horizontal scroll
      PlatformConnections.tsx B8 — per-card SSE sync
  hooks/
    useLibrary.ts             B8 — infinite query
    useLibraryStats.ts        B8
    useRecentlyPlayed.ts      B8
    usePlatforms.ts           B8 — usePlatforms + useTriggerSync
    useIsMobile.ts            B7
    useDebouncedCallback.ts   B1
  lib/
    api/client.ts             B1 — tokenStore + api axios instance
    platforms.ts              B8 — PLATFORMS, getPlatform()
  stores/
    ui.ts                     B1 — useUIStore + useLibraryStore
    toast.ts                  B7 — useToast()
```

---

## CSS variables and utility classes (globals.css) — ground truth

Never hardcode colors. Always use `var(--gh-*)`:
```
--gh-bg / --gh-bg2 / --gh-bg3
--gh-surface / --gh-surface2 / --gh-surface3
--gh-border / --gh-border2 / --gh-border3
--gh-text / --gh-text2 / --gh-text3
--gh-cyan / --gh-cyan-dim / --gh-cyan-glow
--gh-purple / --gh-purple-dim
--gh-pink / --gh-pink-dim
--gh-green / --gh-green-dim
--gh-orange / --gh-orange-dim
--font-display: "Barlow Condensed"   --font-body: "DM Sans"
--sidebar-w: 68px
```

Utility classes available:
```
.font-display  .text-cyan  .text-green  .text-pink  .text-purple  .text-orange
.bg-surface  .bg-surface2  .border-ghost  .border-ghost2
.glow-cyan  .glow-text-cyan
.gh-card  .gh-card-hover
.badge-playing  .badge-completed  .badge-wishlist  .badge-dropped
.progress-track  .progress-fill
.skeleton  .pulse-dot  .page-enter  .hide-scrollbar
```

---

## API endpoints available for B9

### Library entry (UserGame)
```
GET    /api/v1/library/:id           → UserGame (single entry by userGame.id)
PATCH  /api/v1/library/games/:id     → UserGame  body: { status?, userRating?, userNotes?, completionPct? }
DELETE /api/v1/library/games/:id     → 204
POST   /api/v1/library/games         → 201 UserGame  body: { gameId, platform, platformGameId }
```

### Games
```
GET /api/v1/games/:id                → Game
GET /api/v1/games/:id/achievements   → Achievement[]
GET /api/v1/games/search?q=          → Game[] (local + IGDB merged)
```

### Sessions (for a specific game)
```
GET /api/v1/sessions/:userGameId     → { data: PlaySession[], nextCursor }
```

---

## Shared types (packages/types/src/index.ts)

```typescript
UserGame { id, userId, game: Game, platform, platformGameId, status, minutesPlayed,
           hoursPlayed, lastPlayedAt?, completionPct, achievementsEarned, achievementsTotal,
           userRating?, userNotes?, addedAt }
Game { id, igdbId?, title, coverUrl?, backgroundUrl?, genres, platforms, releaseYear?,
       metacritic?, description? }
Achievement { id, userGameId, platformId, title, description?, iconUrl?, earnedAt?,
              rarityPct?, points?, isEarned }
PlaySession { id, userGameId, gameTitle, gameCoverUrl?, platform, startedAt, endedAt?,
              minutes, device? }
GameStatus = "library" | "playing" | "completed" | "wishlist" | "dropped"
```

---

## Key patterns established in B8

### Infinite query pattern
```typescript
useInfiniteQuery({
  queryKey: ["library", filters],
  queryFn: async ({ pageParam }) => { ... },
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  initialPageParam: undefined as string | undefined,
})
```

### exactOptionalPropertyTypes — conditional object build
```typescript
// ✅ Safe
const params = pageParam !== undefined ? { ...filters, cursor: pageParam } : { ...filters };
// ❌ Wrong
const params = { ...filters, cursor: pageParam ?? undefined };
```

### Toast
```typescript
import { useToast } from "../stores/toast.ts";
const { success, error, info, warning } = useToast();
success("Saved!"); error("Failed", 5000);
```

### getPlatform
```typescript
import { getPlatform } from "../lib/platforms.ts";
const meta = getPlatform(game.platform); // { id, name, emoji, color }
```

---

## Files B9 must NOT touch

```
src/lib/auth/AuthProvider.tsx
src/lib/api/client.ts
src/App.tsx
src/stores/ui.ts
src/stores/toast.ts
src/hooks/useDebouncedCallback.ts
src/hooks/useIsMobile.ts
src/pages/LoginPage.tsx
src/pages/RegisterPage.tsx
src/pages/LibraryPage.tsx         B8 complete
src/components/library/*          B8 complete
src/components/layout/*           B7 complete
src/components/ui/*               B7 complete
src/styles/globals.css            append only, never modify existing
src/pages/PlatformsPage.tsx       B10
src/pages/StatsPage.tsx           B11
apps/api/                         B3–B6 complete
apps/worker/                      B4 complete
```
