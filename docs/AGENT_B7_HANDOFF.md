# Handoff: B3 → B4 → B5 → B6 → B7
**For the AI implementing Batch B7**

---

## Project state entering B7

| Batch | Commit | Status |
|---|---|---|
| B1 | scaffold | ✅ |
| B2 | DB schema + seed queries | ✅ |
| B3 | Auth API (141 tests) | ✅ `a83e60b` |
| B4 | Platform Sync Engine (174 tests) | ✅ `b19bd02` |
| B5 | Games & Library API (176 tests) | ✅ `dfd9fba` |
| B6 | Stats & Analytics API (211 tests) | ✅ `26f120a` |

Running test count entering B7: **211** (all API). Worker: 33/33 (unchanged).

---

## Monorepo structure (what matters for B7)

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
        sessions.ts          ✅ B6 complete — DO NOT TOUCH
        stats.ts             ✅ B6 complete — DO NOT TOUCH
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
          games.test.ts      B5 tests (+ B6 cache fix)
          sessions.test.ts   B6 tests
          stats.test.ts      B6 tests
  worker/                    B4 — DO NOT TOUCH
  web/                       React frontend — LoginPage, RegisterPage, LibraryPage stubs
packages/
  types/src/index.ts         ALL shared interfaces — read before writing routes
  platform-sdk/              PlatformAdapter interface (B4)
```

---

## Database schema (all tables)

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

## All implemented API routes (do NOT re-implement)

### Auth (`/api/v1/auth`)
- `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me`

### Platforms (`/api/v1/platforms`)
- `GET /`, `GET /connect/:platform`, `GET /callback/:platform`, `DELETE /:platform`
- `POST /:platform/sync`, `GET /:platform/sync/status` (SSE)

### Library (`/api/v1/library`)
- `GET /`, `GET /stats`, `GET /recent`
- `POST /games`, `PATCH /games/:id`, `DELETE /games/:id`

### Games (`/api/v1/games`)
- `GET /search?q=`, `GET /:id`, `GET /:id/achievements`

### Sessions (`/api/v1/sessions`)
- `GET /`, `GET /:userGameId`

### Stats (`/api/v1/stats`)
- `GET /overview`, `GET /heatmap?year=`, `GET /streaks`
- `GET /weekly?weeks=`, `GET /platforms`, `GET /genres`, `GET /wrapped?year=`

---

## Cache key registry (complete — all TTLs set)

| Key pattern | TTL | Set by | Cleared by |
|---|---|---|---|
| `igdb:token` | `expires_in - 60s` | B5 igdb.ts | auto |
| `igdb_search:{sha256(q)}` | 24h | B5 games route | auto |
| `igdb_game:{igdbId}` | 7d | B5 igdb.ts | auto |
| `library_stats:{userId}` | 5min | B5 library route + B6 stats/overview | `invalidateUserCaches` |
| `heatmap:{userId}:{year}` | 1h | B6 stats route | `invalidateUserCaches` |
| `streaks:{userId}` | 15min | B6 stats route | `invalidateUserCaches` |
| `playtime_platform:{userId}` | 1h | B6 stats route | `invalidateUserCaches` |
| `playtime_genre:{userId}` | 1h | B6 stats route | `invalidateUserCaches` |
| `weekly_playtime:{userId}:{weeks}` | 30min | B6 stats route | `invalidateUserCaches` |
| `wrapped:{userId}:{year}` | 24h | B6 stats route | `invalidateUserCaches` |

---

## Critical patterns — read before writing any route

### `req.user.userId` (NOT `.id`)
FastifyJWT augmentation in `middleware/auth.ts`:
```typescript
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}
```

### `exactOptionalPropertyTypes: true`
The API tsconfig enables this. NEVER spread Zod output directly:
```typescript
// ❌ Wrong
const params = { ...zodOutput };

// ✅ Correct
const params: SomeType = { required: d.required };
if (d.optional !== undefined) params.optional = d.optional;
// For nullable DB fields: use ?? null, NOT ?? undefined
```

### Test setup fixtures (`apps/api/src/__tests__/setup.ts`)
Seeded once per test run (setupFiles, singleFork). NEVER MODIFY:
- `testUserId` — user with 5 games + ~40 sessions across 60 days
- `testUserId2` — user with 0 games, 0 sessions
- `testGameIds[0..4]` — 5 game UUIDs
- `testUserGameIds[0..4]` — 5 user_game UUIDs

Game data:
```
[0] Test Game Alpha   — steam,    playing,    3600 min, rating 9, genres: [RPG, Action]
[1] Test Game Beta    — steam,    completed,  1800 min, rating 8, genres: [FPS, Action]
[2] Test Game Gamma   — psn,      library,     120 min,           genres: [Strategy, RTS]
[3] Test Game Delta   — nintendo, wishlist,      0 min,           genres: [RPG, Adventure]
[4] Test Game Epsilon — xbox,     dropped,      60 min, rating 5, genres: [Sandbox, Survival]
```
Sessions: ~40 days out of 60 have sessions (day % 3 !== 2), varying 30–180 min.
Sessions are within the current calendar year (important for wrapped/heatmap tests).

### Test pattern to follow
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
token = res.body.accessToken as string;

// 3. Close in afterAll
await app.close();
await closeRedis();
```

---

## B3 critical details

- `POST /login` revokes ALL existing refresh tokens (single-session)
- Rate limits disabled in `NODE_ENV === "test"` via Fastify plugin config
- `jti` nonce in refresh token payload
- `gamepass` platform always returns 503 in OAuth

## B4 critical details

- Worker has its OWN `apps/worker/src/db/` — never import from `apps/api/src/db/` in worker
- Queue name: `"platform-sync"` (hardcoded string in both API and worker)
- SSE endpoint uses `reply.hijack()` — preserve if touching platforms.ts

## B5 critical details

- `upsertGame` uses `ON CONFLICT (igdb_id)` — games without `igdbId` may create duplicate rows
- IGDB search cache: `igdb_search:{sha256(q)}` 24h — clear in test `beforeAll` if mocking IGDB

## B6 critical details

- Sessions cursor is a plain ISO timestamp string (not base64)
- `weeks=4` returns ≤5 ISO week buckets (4 weeks can span 5 week boundaries)
- `/stats/overview` and `/library/stats` share the same cache key `library_stats:{userId}`

---

## What B7 must NOT touch

```
apps/api/src/routes/auth.ts          B3 complete
apps/api/src/routes/platforms.ts     B4 complete (SSE + hijack)
apps/api/src/routes/library.ts       B5 complete
apps/api/src/routes/games.ts         B5 complete
apps/api/src/routes/sessions.ts      B6 complete
apps/api/src/routes/stats.ts         B6 complete
apps/api/src/services/igdb.ts        B5
apps/api/src/services/cover.ts       B5
apps/api/src/services/cache.ts       B5
apps/api/src/db/queries/             B2 — import, never edit
apps/api/src/__tests__/setup.ts      B2 fixtures — never modify
apps/worker/                         B4 complete
```
