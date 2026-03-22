# Batch B8 — Library Page
**Commit:** `46e1ec6` · **Branch:** `main`
**Typecheck:** 0 errors

---

## Files created

### Hooks
- **`src/hooks/useLibrary.ts`** — `useInfiniteQuery` with cursor pagination. `queryKey: ["library", filters]` — filter changes auto-refetch from page 1. Uses conditional spread to avoid passing `cursor: undefined`.
- **`src/hooks/useLibraryStats.ts`** — `useQuery` for `/library/stats`, 5min staleTime.
- **`src/hooks/useRecentlyPlayed.ts`** — `useQuery` for `/library/recent?limit=10`, 2min staleTime.
- **`src/hooks/usePlatforms.ts`** — `usePlatforms()` (30s staleTime) + `useTriggerSync()` mutation that invalidates `["platforms"]` on success.

### Lib
- **`src/lib/platforms.ts`** — `PLATFORMS[]`, `PLATFORM_MAP`, `getPlatform(id)`. Fallback for unknown platform IDs.

### Components — `src/components/library/`
- **`GameCard.tsx`** — 3:4 cover image (lazy), status badge top-right, platform emoji bottom-left, title + genre + hours + progress bar. `GameCard.Skeleton` static property for shimmer loading state. Uses `badge-*` utility classes.
- **`GameListRow.tsx`** — 48×64 mini cover, title + badge + platform emoji inline, genre + hours, progress bar with %.
- **`GamesGrid.tsx`** — `IntersectionObserver` sentinel (200px rootMargin) for infinite scroll. 16 skeleton cards while loading. "NO GAMES FOUND" empty state.
- **`FilterBar.tsx`** — 9 genre pills (All + 8 genres), sort `<select>`, grid/list toggle. Reads/writes `useLibraryStore` — no local state.
- **`StatsRow.tsx`** — 4 stat cards (totalGames/currentlyPlaying/completedGames/totalHours). `useCountUp(target, 800ms)` hook: `requestAnimationFrame` + ease-out cubic. Skeleton grid while loading.
- **`RecentlyPlayed.tsx`** — Horizontal scroll row, `scrollbarWidth: none` + `.hide-scrollbar` class. `formatDistanceToNow` from date-fns for "X ago". Returns `null` when empty. Skeleton cards while loading.
- **`PlatformConnections.tsx`** — Shows all connected platforms (all API results). Per-card `PlatformCard` component with own sync state. `useSyncProgress(platform, jobId)` hook opens fetch-based SSE stream (Bearer token via `Authorization` header since EventSource doesn't support custom headers). On `stage === "done"`: toast + invalidate queries. "Sync All" fires mutations sequentially with 500ms delay. Dashed prompt when no platforms connected.

### Page
- **`src/pages/LibraryPage.tsx`** — Replaces stub. Wires: StatsRow → RecentlyPlayed → PlatformConnections → FilterBar → GamesGrid.

### CSS
- **`src/styles/globals.css`** — Appended `.hide-scrollbar::-webkit-scrollbar { display: none; }` inside `@layer utilities`.

---

## Critical implementation details

### exactOptionalPropertyTypes safe patterns
- `useLibrary`: `pageParam !== undefined ? { ...filters, cursor: pageParam } : { ...filters }` — cursor only present when non-undefined
- `FilterBar`: `GENRES` array uses `as const` to narrow types; `setFilter("genre", g.value)` where `g.value: string | undefined` is safe since `LibraryQueryParams["genre"]` is `string | undefined`

### noUncheckedIndexedAccess
- `game.game.genres[0] ?? "—"` everywhere — `genres[0]` is `string | undefined`

### SSE via fetch (not EventSource)
`EventSource` doesn't support custom headers. The SSE stream at `/api/v1/platforms/:platform/sync/progress` requires `Authorization: Bearer <token>`. Solution: `fetch()` with `AbortController` + streaming reader, parses `data: {...}\n\n` chunks manually.

### Per-card sync state
Each `PlatformCard` is its own component with `useState<string | null>(null)` for `jobId`. This allows independent progress tracking per platform. The container's "Sync All" fires mutations sequentially without per-card progress UI.

---

## Definition of Done — verified ✅

- [x] `pnpm --filter web run typecheck` exits 0
- [x] LibraryPage replaces stub text
- [x] GamesGrid: 16 skeletons → real cards, infinite scroll sentinel
- [x] FilterBar: genre pills + sort + view toggle (all via useLibraryStore)
- [x] StatsRow: 4 cards with count-up animation
- [x] RecentlyPlayed: horizontal scroll, timeago, returns null when empty
- [x] PlatformConnections: per-card sync + SSE progress
- [x] .hide-scrollbar appended to globals.css
- [x] No B1–B7 files modified beyond the CSS append
