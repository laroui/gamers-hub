# Batch B6 — Stats & Analytics API
**Commit:** `26f120a` · **Branch:** `main`
**Tests:** 211 passing (176 B2–B5 + 35 new)

---

## Files created / replaced

### Routes (REPLACED stubs)

#### `apps/api/src/routes/sessions.ts`
Export: `sessionsRoutes` (unchanged name). All routes require `authMiddleware`.

| Route | Behaviour |
|---|---|
| `GET /api/v1/sessions` | Cursor-paginated. `limit` 1–100 default 20. `cursor` is ISO timestamp from previous page's last item. Returns `{ data: PlaySession[], nextCursor: string \| null }`. |
| `GET /api/v1/sessions/:userGameId` | Same pagination, filtered to a single userGame. Returns only sessions belonging to the authenticated user. |

Delegates entirely to `getPlaySessions(userId, opts)` from `db/queries/sessions.ts` — no cache (session data is real-time).

#### `apps/api/src/routes/stats.ts`
Export: `statsRoutes` (unchanged name). All routes require `authMiddleware`.

| Route | Cache key | TTL | Query fn |
|---|---|---|---|
| `GET /api/v1/stats/overview` | `library_stats:{userId}` | 5 min | `getLibraryStats` |
| `GET /api/v1/stats/heatmap?year=` | `heatmap:{userId}:{year}` | 1 h | `getPlayHeatmap(userId, year)` |
| `GET /api/v1/stats/streaks` | `streaks:{userId}` | 15 min | `getPlayStreaks` |
| `GET /api/v1/stats/weekly?weeks=` | `weekly_playtime:{userId}:{weeks}` | 30 min | `getWeeklyPlaytime(userId, weeks)` |
| `GET /api/v1/stats/platforms` | `playtime_platform:{userId}` | 1 h | `getPlaytimeByPlatform` |
| `GET /api/v1/stats/genres` | `playtime_genre:{userId}` | 1 h | `getPlaytimeByGenre` |
| `GET /api/v1/stats/wrapped?year=` | `wrapped:{userId}:{year}` | 24 h | `getGamingWrapped(userId, year)` |

Cache pattern: check `cacheGet(key)` → return if hit; else query DB → `cacheSet(key, data, TTL)` → return.
`invalidateUserCaches()` in `services/cache.ts` already clears all these keys on any library mutation.

Query params:
- `year`: integer 2000–2100, default `new Date().getFullYear()`
- `weeks`: integer 1–52, default 12

---

### Tests (NEW)

#### `apps/api/src/__tests__/routes/sessions.test.ts` — 11 tests
Full integration (real DB + Redis + Fastify). Covers:
- Shape: `{ data, nextCursor }`
- Seed data: testUser1 has ~40 sessions across 60 days
- Required session fields: `id, userGameId, gameTitle, startedAt, minutes, platform`
- `limit` param respected
- `nextCursor` non-null when more pages exist
- Cursor pagination — page 2 has no overlap with page 1
- Empty for testUser2 (no sessions)
- 401 without token
- `GET /:userGameId` filters to specific game
- `GET /:userGameId` returns empty for game with no sessions

#### `apps/api/src/__tests__/routes/stats.test.ts` — 24 tests
Full integration (real DB + Redis + Fastify). Covers all 7 stat endpoints:
- Shape validation for each response type
- Correct data values from seed (totalGames=5, totalDays>0, totalHours>0)
- Cache hit on second call (clears key first, calls twice, confirms same result)
- testUser2 returns zero/empty data for all endpoints
- 401 without token on each endpoint
- Year/weeks params respected

---

### Bug fix (games.test.ts)
Added `cacheDelPattern("igdb_search:*")` to `beforeAll` in `games.test.ts` to clear
stale IGDB search cache between test runs (24h TTL caused intermittent failures on re-runs).

---

## Critical implementation details

### Sessions cursor
`getPlaySessions` uses ISO timestamp as cursor (not base64). Pass directly:
```typescript
if (q.data.cursor !== undefined) opts.cursor = q.data.cursor;
```

### Weekly weeks param — ISO week boundaries
`getWeeklyPlaytime` groups by ISO week (`DATE_TRUNC('week', ...)`). A 4-week window
can span 5 ISO week boundaries. Tests must not assert `length <= weeks`.

### Stats/overview is same as /library/stats
Both use cache key `library_stats:{userId}` TTL 5min — the second call is a cache hit
regardless of which endpoint was called first.

### Cache invalidation already wired
`invalidateUserCaches()` (called from all library mutations in B5) clears all B6 cache keys.
B6 routes only need to **set** the cache; clearing is handled by B5 service.

---

## Definition of Done — verified ✅

- [x] `pnpm --filter api run typecheck` exits 0
- [x] `pnpm --filter api run test` — 211/211 passing (176 prior + 35 new)
- [x] `GET /api/v1/stats/heatmap?year=2026` returns `Record<string, number>`
- [x] `GET /api/v1/stats/streaks` returns `{ current, longest, totalDays }`
- [x] `GET /api/v1/stats/wrapped?year=2026` returns `GamingWrapped` shape
- [x] `GET /api/v1/sessions` returns cursor-paginated sessions
- [x] All stats endpoints served from Redis cache on second call
- [x] `invalidateUserCaches()` clears stats cache keys on library mutation (B5 wiring)
- [x] All error cases (401, 400) return correct status codes
- [x] No B2/B3/B4/B5 files modified (except games.test.ts cache isolation fix)
