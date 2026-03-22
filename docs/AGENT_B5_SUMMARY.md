# Batch B5 — Games & Library API
**Commit:** `dfd9fba` · **Branch:** `main`
**Tests:** 176 passing (141 B2–B3 + 33 B4 worker + 35 new)

---

## Files created / replaced

### Services (NEW)

#### `apps/api/src/services/igdb.ts`
IGDB (Twitch) game database integration.

- **`getIgdbToken()`** — Client-credentials OAuth to `id.twitch.tv`. Cached in Redis at key `igdb:token`, TTL = `expires_in - 60s`.
- **`searchIgdb(query, limit = 10)`** — POSTs to `api.igdb.com/v4/games`. Cache key: `igdb_search:${sha256(query)}`, TTL 24h. Returns `Game[]`. 401 auto-retries once (clears token cache, re-fetches).
- **`getIgdbGame(igdbId)`** — Single game lookup. Cache key: `igdb_game:{igdbId}`, TTL 7 days. Returns `(Game & { screenshotUrls?: string[] }) | null`.
- **URL normalization:** `t_thumb` → `t_cover_big` (search) / `t_screenshot_big` (screenshots). `//` prefix → `https:`.
- **Graceful degradation:** all functions return `[]` / `null` on error — never crash a route.

#### `apps/api/src/services/cover.ts`
MinIO cover art caching pipeline.

- **`resolveCoverUrl(game)`** — Accepts `{ id, coverUrl, igdbId, steamAppId? }`. Priority:
  1. Already a MinIO URL → return as-is
  2. Has `igdbId` → call `getIgdbGame()` → cache cover to MinIO
  3. Has `steamAppId` → `cdn.akamai.steamstatic.com/steam/apps/{id}/library_600x900.jpg` → cache to MinIO
  4. Return `null`
- **`cacheCoverToMinio(sourceUrl, gameId)`** — `statObject` check before re-uploading. Object key: `covers/{gameId}.jpg`. Public URL: `http://{MINIO_ENDPOINT}:{MINIO_PORT}/{BUCKET}/{objectName}`.
- Non-fatal: entire `resolveCoverUrl` is wrapped in try/catch → returns `null` on any failure.

#### `apps/api/src/services/cache.ts`
Central cache invalidation. Called from all library mutation routes and (optionally) after sync.

```typescript
invalidateUserCaches(userId: string): Promise<void>
// Clears: library_stats:{userId}, heatmap:{userId}:*, streaks:{userId},
//         playtime_platform:{userId}, playtime_genre:{userId},
//         weekly_playtime:{userId}:*, wrapped:{userId}:*
```

---

### Routes (REPLACED stubs)

#### `apps/api/src/routes/library.ts`
Export: `libraryRoutes` (unchanged name). All routes require `authMiddleware`.

| Route | Behaviour |
|---|---|
| `GET /api/v1/library` | Cursor-paginated. Zod validates 5 filters (`platform`, `genre`, `status`, `search`, `sort`) + `limit` (1–100, default 40). Returns `{ data, nextCursor, total }`. |
| `GET /api/v1/library/stats` | Redis cache `library_stats:{userId}`, TTL 5 min. |
| `GET /api/v1/library/recent` | `limit` clamped 1–20, default 10. |
| `POST /api/v1/library/games` | Body: `{ gameId (UUID), platform, platformGameId }`. 404 if game not in catalog. 201 with full `UserGame`. |
| `PATCH /api/v1/library/games/:id` | Body: any of `{ status, userRating (1–10\|null), userNotes, completionPct }`. Zod refine rejects empty `{}`. 404 if not owned. |
| `DELETE /api/v1/library/games/:id` | 204 on success, 404 if not found. |

All mutations call `invalidateUserCaches(userId)`.

#### `apps/api/src/routes/games.ts`
Export: `gamesRoutes` (unchanged name). All routes require `authMiddleware`.
Route order matters — `/search` registered before `/:id` (Fastify handles this correctly).

| Route | Behaviour |
|---|---|
| `GET /api/v1/games/search?q=` | Min 2 chars. Route-level cache `igdb_search:${sha256(q)}`, 24h. Merges local + IGDB; deduplicates by `igdbId` then lowercase title. Upserts new IGDB games to catalog. IGDB failure is non-fatal. |
| `GET /api/v1/games/:id` | Lazy cover resolution (queries raw steamAppId when needed). Lazy IGDB description enrichment if `description` is null. Both non-fatal. |
| `GET /api/v1/games/:id/achievements` | Returns `[]` when game not in user's library. Maps DB rows to `Achievement` interface with `isEarned: earnedAt !== null`. |

---

### Tests (NEW)

#### `apps/api/src/__tests__/routes/library.test.ts` — 23 tests
Full integration — real DB + Redis + Fastify app. Logs in as `testuser1` / `testuser2`.

#### `apps/api/src/__tests__/routes/games.test.ts` — 12 tests
Mocks `../../services/igdb.js` and `../../services/cover.js` via `vi.mock` (hoisted). Tests IGDB fallback, dedup, caching, lazy cover, achievements.

---

## Critical implementation details

### `exactOptionalPropertyTypes: true` (strict TS config)
The API tsconfig enables this. When passing Zod-parsed objects to functions:
- **DO NOT** spread Zod output directly if the function expects exact optional types.
- **DO** construct the target object with explicit conditional assignment:
  ```typescript
  const params: LibraryQueryParams = { sort, limit };
  if (d.platform !== undefined) params.platform = d.platform;
  ```
- For `upsertGame`, use `?? null` (not `?? undefined`) for optional nullable fields.

### `upsertGame` conflict targets
`upsertGame` in `apps/api/src/db/queries/games.ts` uses `ON CONFLICT (igdb_id)` as the conflict target. Games without `igdbId` (e.g. GOG) can create duplicate catalog rows — B6 enrichment / dedup is out of scope.

### Cache key registry (all keys used in B5)
| Key pattern | TTL | Cleared by |
|---|---|---|
| `igdb:token` | `expires_in - 60s` | auto-expiry |
| `igdb_search:{sha256(q)}` | 24h | auto-expiry |
| `igdb_game:{igdbId}` | 7d | auto-expiry |
| `library_stats:{userId}` | 5min | `invalidateUserCaches` |
| `heatmap:{userId}:*` | set by B6 | `invalidateUserCaches` |
| `streaks:{userId}` | set by B6 | `invalidateUserCaches` |
| `playtime_platform:{userId}` | set by B6 | `invalidateUserCaches` |
| `playtime_genre:{userId}` | set by B6 | `invalidateUserCaches` |
| `weekly_playtime:{userId}:*` | set by B6 | `invalidateUserCaches` |
| `wrapped:{userId}:*` | set by B6 | `invalidateUserCaches` |

---

## Definition of Done — verified ✅

- [x] `pnpm --filter api run typecheck` exits 0
- [x] `pnpm --filter api run test` — 176/176 passing
- [x] `GET /api/v1/library` returns `{ data, nextCursor, total }`
- [x] `GET /api/v1/library/stats` returns `LibraryStats` shape
- [x] `PATCH /api/v1/library/games/:id` persists status + rating
- [x] `GET /api/v1/games/search` merges local + IGDB, deduplicates
- [x] `GET /api/v1/games/:id` triggers lazy cover resolution
- [x] Cache served on second `/library/stats` call
- [x] All error cases return correct status codes
- [x] No B2/B3/B4 files modified
