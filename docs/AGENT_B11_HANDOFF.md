# Handoff: B10 → B11
**For the AI implementing Batch B11**

---

## Project state entering B11

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
| B10 | Platforms Page | ✅ `bb05698` |

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

## Frontend structure entering B11

```
apps/web/src/
  pages/
    LibraryPage.tsx          ✅ B8 complete
    GameDetailPage.tsx       ✅ B9 complete
    PlatformsPage.tsx        ✅ B10 complete
    StatsPage.tsx            ← B11 implements this (currently stub)
    ProfilePage.tsx          ← B11 implements this (currently stub)
  components/
    platforms/
      PlatformCard.tsx       B10 — connected/disconnected card + sync
      SteamConnectModal.tsx  B10 — API key + Steam ID form
      NintendoConnectModal.tsx B10 — session token form
    game/
      CompletionRing.tsx     B9 — SVG ring with spring animation
      StatusSelector.tsx     B9 — 5 status buttons
      StarRating.tsx         B9 — 10-star rating
      AchievementsGrid.tsx   B9 — earned/locked icon grid
      SessionHistory.tsx     B9 — session list + add modal
    library/
      GameCard.tsx           B8 — card + Skeleton
      GameListRow.tsx        B8 — list row
      GamesGrid.tsx          B8 — infinite scroll grid
      FilterBar.tsx          B8 — genre + sort + view toggle
      StatsRow.tsx           B8 — 4 animated stat cards
      RecentlyPlayed.tsx     B8 — horizontal scroll
      PlatformConnections.tsx B8 — per-card SSE sync
  hooks/
    useSyncProgress.ts       B10 — SSE progress hook (fetch + ReadableStream)
    useUserGame.ts           B9 — useUserGame + usePatchUserGame
    useGameAchievements.ts   B9 — useGameAchievements
    usePlaySessions.ts       B9 — usePlaySessions + useLogSession
    useLibrary.ts            B8
    useLibraryStats.ts       B8
    useRecentlyPlayed.ts     B8
    usePlatforms.ts          B8+B10 — usePlatforms, useTriggerSync, useDisconnectPlatform, useConnectPlatform
    useIsMobile.ts           B7
    useDebouncedCallback.ts  B1
  lib/
    api/client.ts            B1 — tokenStore + api axios instance
    platforms.ts             B8+B10 — PLATFORMS (with description+authType), getPlatform()
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

## API endpoints available for B11

### Stats & Analytics (B6)
```
GET  /api/v1/stats/library          → LibraryStats
GET  /api/v1/stats/heatmap          → PlayHeatmap (Record<"YYYY-MM-DD", minutes>)
GET  /api/v1/stats/streaks          → PlayStreaks { current, longest, totalDays }
GET  /api/v1/stats/weekly           → WeeklyPlaytime[]  (last 12 weeks)
GET  /api/v1/stats/wrapped/:year    → GamingWrapped
```

### User / Profile (B3)
```
GET    /api/v1/auth/me              → User
PATCH  /api/v1/auth/me              → User  body: { username?, avatarUrl? }
POST   /api/v1/auth/change-password → 200  body: { currentPassword, newPassword }
```

### Library summary (B5)
```
GET  /api/v1/library/stats          → LibraryStats  (same as /stats/library)
```

---

## Key patterns established in B10

### void pattern for async onClick
```typescript
onClick={() => { void handleConnect(); }}
onClick={() => { void handleSyncAll(); }}
```

### err: unknown cast (not any)
```typescript
} catch (err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
```

### connectionMap — noUncheckedIndexedAccess safe
```typescript
const map = Object.fromEntries(arr.map((c) => [c.key, c])) as Record<Key, typeof arr[number] | undefined>;
// Access: map[key] ?? null  →  T | null ✓
```

---

## Files B11 must NOT touch

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
src/pages/PlatformsPage.tsx       B10 complete
src/components/library/*          B8 complete
src/components/game/*             B9 complete
src/components/platforms/*        B10 complete
src/components/layout/*           B7 complete
src/components/ui/*               B7 complete
src/styles/globals.css            append only, never modify existing
apps/api/                         B3–B6 complete
apps/worker/                      B4 complete
```
