# Handoff: B9 → B10
**For the AI implementing Batch B10**

---

## Project state entering B10

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
| B9 | Game Detail Page | ✅ `9f7caa5` |

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

## Frontend structure entering B10

```
apps/web/src/
  pages/
    LibraryPage.tsx          ✅ B8 complete
    GameDetailPage.tsx       ✅ B9 complete
    PlatformsPage.tsx        ← B10 implements this (currently stub)
    StatsPage.tsx            ← B11
    ProfilePage.tsx          ← B11
  components/
    game/
      CompletionRing.tsx     B9 — SVG ring with spring animation
      StatusSelector.tsx     B9 — 5 status buttons
      StarRating.tsx         B9 — 10-star rating
      AchievementsGrid.tsx   B9 — earned/locked icon grid
      SessionHistory.tsx     B9 — session list + add modal
    library/
      GameCard.tsx           B8 — card + Skeleton (scroll save added B9)
      GameListRow.tsx        B8 — list row (scroll save added B9)
      GamesGrid.tsx          B8 — infinite scroll grid
      FilterBar.tsx          B8 — genre + sort + view toggle
      StatsRow.tsx           B8 — 4 animated stat cards
      RecentlyPlayed.tsx     B8 — horizontal scroll
      PlatformConnections.tsx B8 — per-card SSE sync
  hooks/
    useUserGame.ts           B9 — useUserGame + usePatchUserGame
    useGameAchievements.ts   B9 — useGameAchievements
    usePlaySessions.ts       B9 — usePlaySessions + useLogSession
    useLibrary.ts            B8
    useLibraryStats.ts       B8
    useRecentlyPlayed.ts     B8
    usePlatforms.ts          B8
    useIsMobile.ts           B7
    useDebouncedCallback.ts  B1
  lib/
    api/client.ts            B1 — tokenStore + api axios instance
    platforms.ts             B8 — PLATFORMS, getPlatform()
  stores/
    ui.ts                    B1 — useUIStore + useLibraryStore
    toast.ts                 B7 — useToast()
```

---

## CSS variables and utility classes — ground truth

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

Utility classes:
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

## API endpoints available for B10

### Platform connections
```
GET    /api/v1/platforms                         → PlatformConnection[]
POST   /api/v1/platforms/:platform/connect       → PlatformConnection  body: { platformUid, displayName }
DELETE /api/v1/platforms/:platform/disconnect    → 204
POST   /api/v1/platforms/:platform/sync          → { jobId: string }
GET    /api/v1/platforms/:platform/sync/progress → SSE stream (SyncJobProgress events)
```

### SSE note
EventSource does not support custom headers. Use `fetch()` + `ReadableStream` reader + `AbortController` with `Authorization: Bearer <token>`. See `PlatformConnections.tsx` (B8) for the established pattern.

---

## Key patterns established in B9

### Optimistic update mutation
```typescript
onMutate: async (patch) => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, (old) => old ? ({ ...old, ...patch } as T) : old);
  return { previous };
},
onError: (_err, _patch, context) => {
  if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
},
onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
```

### Scroll save (B9 pattern)
```typescript
// On card click (GameCard / GameListRow):
sessionStorage.setItem("library-scroll", String(window.scrollY));
navigate(`/library/${game.id}`);

// On back button:
const saved = sessionStorage.getItem("library-scroll");
navigate("/library");
if (saved) requestAnimationFrame(() => {
  window.scrollTo(0, Number(saved));
  sessionStorage.removeItem("library-scroll");
});
```

### Async button handler — void pattern
```typescript
onClick={() => { void handleSubmit(); }}
// handleSubmit is async; void suppresses unhandled-promise lint warning
```

---

## Files B10 must NOT touch

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
src/pages/GameDetailPage.tsx      B9 complete
src/components/library/*          B8 complete
src/components/game/*             B9 complete
src/components/layout/*           B7 complete
src/components/ui/*               B7 complete
src/styles/globals.css            append only, never modify existing
src/pages/StatsPage.tsx           B11
src/pages/ProfilePage.tsx         B11
apps/api/                         B3–B6 complete
apps/worker/                      B4 complete
```
