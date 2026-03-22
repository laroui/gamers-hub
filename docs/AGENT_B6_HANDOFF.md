# Handoff: B3 → B4 → B5 → B6
**For the AI implementing Batch B6 — Stats & Analytics API**

---

## Project state entering B6

| Batch | Commit | Status |
|---|---|---|
| B1 | scaffold | ✅ |
| B2 | DB schema + seed queries | ✅ |
| B3 | Auth API (141 tests) | ✅ `a83e60b` |
| B4 | Platform Sync Engine (174 tests) | ✅ `b19bd02` |
| B5 | Games & Library API (176 tests) | ✅ `dfd9fba` |

Running test count entering B6: **176** (141 API + 35 B5 new).
Worker tests are separate: `pnpm --filter worker run test` → 33/33.

---

## Monorepo structure (what matters for B6)

```
apps/
  api/
    src/
      config/env.ts          JWT_SECRET required; IGDB_CLIENT_ID optional
      db/
        client.ts            export { db, closeDb }
        schema.ts            all Drizzle tables (see below)
        queries/
          index.ts           re-exports all query functions
          library.ts         getUserLibrary, upsertUserGame, updateUserGame, deleteUserGame, getRecentlyPlayed, getUserGameById
          stats.ts           getLibraryStats, getPlayHeatmap, getPlayStreaks, getWeeklyPlaytime, getPlaytimeByPlatform, getPlaytimeByGenre, getGamingWrapped
          games.ts           searchGames, upsertGame, getGameById, findGameByIgdbId, findGameBySteamId
          sessions.ts        getPlaySessions, insertPlaySession, bulkInsertSessions
          platforms.ts       getUserConnections, getConnection, upsertConnection, updateSyncStatus, deleteConnection
      middleware/auth.ts     authMiddleware → sets req.user.userId
      plugins/index.ts       registerPlugins
      routes/
        index.ts             registerRoutes — imports all route modules
        auth.ts              ✅ B3 complete — DO NOT TOUCH
        platforms.ts         ✅ B4 complete — DO NOT TOUCH
        library.ts           ✅ B5 complete — DO NOT TOUCH
        games.ts             ✅ B5 complete — DO NOT TOUCH
        sessions.ts          ← STUB — B6 implements this
        stats.ts             ← STUB — B6 implements this
      services/
        auth.ts              issueTokenPair, blacklistToken, etc.
        oauth.ts             getOAuthConfig, PKCE helpers
        igdb.ts              searchIgdb, getIgdbGame (B5)
        cover.ts             resolveCoverUrl (B5)
        cache.ts             invalidateUserCaches (B5)
      __tests__/
        setup.ts             beforeAll seed — see below
        db/                  B2 tests
        routes/
          auth.test.ts       B3 tests
          library.test.ts    B5 tests
          games.test.ts      B5 tests
  worker/                    B4 — DO NOT TOUCH
  web/                       React frontend — LoginPage, RegisterPage, LibraryPage stubs
packages/
  types/src/index.ts         ALL shared interfaces — read before writing routes
  platform-sdk/              PlatformAdapter interface (B4)
```

---

## Database schema (tables B6 will query)

All in `apps/api/src/db/schema.ts`:

```
users              id(uuid), email, username, passwordHash, avatarUrl, createdAt, updatedAt
platformConnections id, userId(fk), platform, accessToken, refreshToken, tokenExpiresAt,
                    platformUid, displayName, lastSyncedAt, syncStatus, createdAt
games              id(uuid), igdbId(int unique), steamAppId(int unique), title, coverUrl,
                    backgroundUrl, genres(text[]), platforms(text[]), releaseYear,
                    metacritic, description, createdAt
userGames          id(uuid), userId(fk), gameId(fk), platform, platformGameId,
                    status, minutesPlayed(int), lastPlayedAt, completionPct(real),
                    achievementsEarned, achievementsTotal, userRating, userNotes, addedAt
playSessions       id(uuid), userId(fk), userGameId(fk), startedAt, endedAt,
                    minutes(int), platform, device
achievements       id(uuid), userGameId(fk), platformId, title, description,
                    iconUrl, earnedAt, rarityPct(real), points
tokenBlacklist     id, tokenHash, expiresAt, createdAt
```

---

## Query functions already available (do NOT rewrite)

Everything in `apps/api/src/db/queries/stats.ts` — import from `../db/queries/index.js`:

```typescript
getLibraryStats(userId)        → LibraryStats
getPlayHeatmap(userId, year)   → PlayHeatmap  (Record<"YYYY-MM-DD", minutes>)
getPlayStreaks(userId)          → PlayStreaks  { current, longest, totalDays }
getWeeklyPlaytime(userId, weeks=12) → WeeklyPlaytime[]  { week: "YYYY-WNN", minutes, games }
getPlaytimeByPlatform(userId)  → { platform, minutes, games }[]
getPlaytimeByGenre(userId)     → { genre, minutes, games }[]
getGamingWrapped(userId, year) → GamingWrapped
```

Also from `sessions.ts`:
```typescript
getPlaySessions(userId, opts?) → { data: PlaySession[], nextCursor: string | null }
insertPlaySession(data)        → string (id)
```

---

## Shared types (packages/types/src/index.ts) — relevant to B6

```typescript
LibraryStats {
  totalGames, totalMinutes, totalHours, completedGames, currentlyPlaying,
  completionRate, platformBreakdown: Record<PlatformId, number>,
  genreBreakdown: Record<string, number>, deltaThisWeek: { newGames, minutesPlayed }
}
PlayHeatmap = Record<string, number>   // "YYYY-MM-DD" → minutes
PlayStreaks { current: number, longest: number, totalDays: number }
WeeklyPlaytime { week: string, minutes: number, games: number }
GamingWrapped { year, totalHours, totalGames, newGames, completedGames,
  topGame, topGenre, topPlatform, longestSession, favoriteDay, lateNightGamer }
PlaySession { id, userGameId, gameTitle, gameCoverUrl, platform,
              startedAt, endedAt, minutes, device }
Achievement { id, userGameId, platformId, title, description, iconUrl,
              earnedAt, rarityPct, points, isEarned }
```

---

## B3 critical details — read before touching auth

- `req.user.userId` (NOT `.id`) — FastifyJWT augmentation in `middleware/auth.ts`
- `POST /login` revokes ALL existing refresh tokens for the user (single-session)
- Rate limits disabled in `NODE_ENV === "test"` via Fastify plugin config
- Refresh token cookie: path `/api/v1/auth/refresh`, `httpOnly`, `sameSite: strict`
- `gamepass` platform always returns 503 in OAuth — used as sentinel in B3 tests
- `jti` nonce in refresh token payload — do not revert

---

## B4 critical details — platform sync

- Worker has its OWN `apps/worker/src/db/` (schema + queries + client) — never import from `apps/api/src/db/` in worker code
- Queue name: `"platform-sync"` (hardcoded string in both API routes/platforms.ts and worker/src/index.ts)
- JobId format: `${userId}:${platform}:${Date.now()}`
- SSE endpoint uses `reply.hijack()` — if touching platforms.ts preserve this
- `getAllConnectedPlatforms()` only returns connections with `syncStatus = "success"` for auto-sync

---

## B5 critical details — games & library

### `exactOptionalPropertyTypes: true` (TS strict config — affects ALL routes)
When passing Zod-parsed output to typed functions, NEVER spread directly. Construct explicitly:
```typescript
const params: LibraryQueryParams = { sort: d.sort, limit: d.limit };
if (d.platform !== undefined) params.platform = d.platform;
```
For nullable DB fields use `?? null`, NOT `?? undefined`.

### Cache key registry (what's already cached)
| Key | TTL | Invalidated by |
|---|---|---|
| `igdb:token` | `expires_in - 60s` | auto |
| `igdb_search:{sha256(q)}` | 24h | auto |
| `igdb_game:{igdbId}` | 7d | auto |
| `library_stats:{userId}` | 5min | `invalidateUserCaches()` |

B6 should set TTLs for:
| Key | Suggested TTL |
|---|---|
| `heatmap:{userId}:{year}` | 1h |
| `streaks:{userId}` | 15min |
| `playtime_platform:{userId}` | 1h |
| `playtime_genre:{userId}` | 1h |
| `weekly_playtime:{userId}:{weeks}` | 30min |
| `wrapped:{userId}:{year}` | 24h |

`invalidateUserCaches()` in `services/cache.ts` already handles all the above patterns — B6 just needs to **set** them.

### Test setup fixtures (apps/api/src/__tests__/setup.ts)
Seeded once per test run (setupFiles, singleFork):
- `testUserId` — user with 5 games (steam ×2, psn ×1, nintendo ×1, xbox ×1) + 60d of sessions
- `testUserId2` — user with 0 games, 0 sessions
- `testGameIds[0..4]` — 5 game UUIDs
- `testUserGameIds[0..4]` — 5 user_game UUIDs

Game data for testUser1:
```
[0] Test Game Alpha   — steam,  playing,    3600 min, rating 9, genres: [RPG, Action]
[1] Test Game Beta    — steam,  completed,  1800 min, rating 8, genres: [FPS, Action]
[2] Test Game Gamma   — psn,    library,     120 min,           genres: [Strategy, RTS]
[3] Test Game Delta   — nintendo, wishlist,    0 min,           genres: [RPG, Adventure]
[4] Test Game Epsilon — xbox,   dropped,      60 min, rating 5, genres: [Sandbox, Survival]
```
Sessions: ~40 days out of 60 have sessions (day % 3 !== 2), varying 30–180 min.

---

## Route stubs B6 must replace

### `apps/api/src/routes/sessions.ts`
Current export: `sessionsRoutes` — preserve this name.

Suggested routes:
```
GET /api/v1/sessions               → getPlaySessions paginated (cursor by startedAt)
GET /api/v1/sessions/:userGameId   → sessions for a specific game
```

### `apps/api/src/routes/stats.ts`
Current export: `statsRoutes` — preserve this name.

Suggested routes:
```
GET /api/v1/stats/overview         → getLibraryStats (alias with cache)
GET /api/v1/stats/heatmap?year=    → getPlayHeatmap (Redis cache)
GET /api/v1/stats/streaks          → getPlayStreaks (Redis cache)
GET /api/v1/stats/weekly?weeks=    → getWeeklyPlaytime (Redis cache)
GET /api/v1/stats/platforms        → getPlaytimeByPlatform (Redis cache)
GET /api/v1/stats/genres           → getPlaytimeByGenre (Redis cache)
GET /api/v1/stats/wrapped?year=    → getGamingWrapped (Redis cache, 24h TTL)
```

---

## Test infrastructure to follow

Same pattern as `library.test.ts` and `games.test.ts`:
```typescript
// 1. Build Fastify app in beforeAll
app = Fastify({ logger: false });
await registerPlugins(app);
await registerRoutes(app);
await app.ready();

// 2. Login as testuser1 to get token
const res = await Supertest(app.server)
  .post("/api/v1/auth/login")
  .send({ email: "testuser1@test.com", password: "testpassword" });
token = res.body.accessToken;

// 3. Close in afterAll
await app.close();
await closeRedis();
```

Minimum B6 test count: **20 tests** across sessions + stats routes.

---

## What B6 must NOT touch

```
apps/api/src/routes/auth.ts          B3 complete
apps/api/src/routes/platforms.ts     B4 complete (SSE + hijack)
apps/api/src/routes/library.ts       B5 complete
apps/api/src/routes/games.ts         B5 complete
apps/api/src/services/igdb.ts        B5
apps/api/src/services/cover.ts       B5
apps/api/src/services/cache.ts       B5 (add new cache keys here if needed)
apps/api/src/db/queries/             B2 — import, never edit
apps/api/src/__tests__/setup.ts      B2 fixtures — never modify
apps/worker/                         B4 complete
```

---

## Definition of Done for B6

- [ ] `pnpm --filter api run typecheck` exits 0
- [ ] `pnpm --filter api run test` — all prior 176 + ≥20 new passing
- [ ] `GET /api/v1/stats/heatmap?year=2026` returns `Record<string, number>`
- [ ] `GET /api/v1/stats/streaks` returns `{ current, longest, totalDays }`
- [ ] `GET /api/v1/stats/wrapped?year=2025` returns `GamingWrapped` shape
- [ ] `GET /api/v1/sessions` returns cursor-paginated sessions
- [ ] All stats endpoints served from Redis cache on second call
- [ ] `invalidateUserCaches()` clears stats cache keys on library mutation
- [ ] All error cases (401, 400, 404) return correct status codes
