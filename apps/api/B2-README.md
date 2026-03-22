# Batch B2 — Database Layer

Full database layer for the Gamers Hub API: migration, query helpers, enhanced seed, Vitest config, and integration tests.

---

## Migration

### `src/db/migrations/0001_initial_schema.sql`

Added on top of the tables created by `0000_wild_nomad.sql`:

- **Extensions**: `pgcrypto`, `pg_trgm`
- **GIN trigram index**: `games_title_trgm_idx` on `games.title` (enables fuzzy search)
- **Check constraint**: `user_games.user_rating BETWEEN 1 AND 10`
- **Check constraint**: `play_sessions.minutes > 0`
- **Unique index**: `achievements(user_game_id, platform_id)`
- **Index**: `token_blacklist(expires_at)` for TTL cleanup
- **Trigger function**: `update_updated_at()` + attached to `users` table
- Idempotent — uses `IF NOT EXISTS` and `DO $$ BEGIN...END $$` guards

---

## Query Functions

All helpers live in `src/db/queries/`. Import from the barrel: `src/db/queries/index.ts`.

---

### `queries/library.ts`

#### `getUserLibrary(userId, params: LibraryQueryParams)`

Returns `{ data: UserGame[], nextCursor: string | null, total: number }`.

Keyset cursor pagination (base64url-encoded JSON). Supported filters: `platform`, `status`, `genre` (array contains), `search` (ILIKE). Sort modes: `recent` (lastPlayedAt desc), `alpha` (title asc), `hours` (minutesPlayed desc), `progress` (completionPct desc), `rating` (userRating desc). Max limit: 100.

#### `getRecentlyPlayed(userId, limit?)`

Returns up to `limit` (default 10) `UserGame[]` ordered by `lastPlayedAt` descending. Only includes games with `minutesPlayed > 0`.

#### `getUserGameById(userId, userGameId)`

Returns `UserGame | null` with the nested `game` object. Scoped to `userId` for authorization safety.

#### `upsertUserGame(userId, gameId, data)`

Returns `string` (id). ON CONFLICT on `(user_id, platform, platform_game_id)`:
- `minutesPlayed` → `GREATEST(existing, new)`
- `lastPlayedAt` → `GREATEST(existing, new)`
- `completionPct` → `GREATEST(existing, new)`
- `achievementsEarned` → `GREATEST(existing, new)`
- `achievementsTotal` → `GREATEST(existing, new)`
- `userRating` → `COALESCE(new, existing)` — never overwrite with null
- `userNotes` → `COALESCE(new, existing)` — never overwrite with null

#### `updateUserGame(userId, userGameId, patch)`

Returns `UserGame | null`. Partial update; returns null if record not found or belongs to a different user.

#### `deleteUserGame(userId, userGameId)`

Returns `boolean`. Deletes and returns `true` if the row existed and belonged to `userId`.

---

### `queries/stats.ts`

#### `getLibraryStats(userId)`

Returns `LibraryStats`:
- `totalGames`, `totalMinutes`, `totalHours`
- `completedGames`, `currentlyPlaying`, `completionRate` (%)
- `platformBreakdown`: `Record<PlatformId, number>` — count of library entries per platform
- `genreBreakdown`: `Record<string, number>` — unnested genres from joined games
- `deltaThisWeek.newGames` — entries added in last 7 days
- `deltaThisWeek.minutesPlayed` — session minutes in last 7 days

#### `getPlayHeatmap(userId, year)`

Returns `PlayHeatmap` (`Record<"YYYY-MM-DD", minutes>`). Aggregates session minutes by UTC day for the given calendar year.

#### `getPlayStreaks(userId)`

Returns `PlayStreaks { current, longest, totalDays }`. Computes consecutive-day streaks from distinct play days. Current streak is 0 if last play day is more than 1 day ago.

#### `getWeeklyPlaytime(userId, weeks?)`

Returns `WeeklyPlaytime[]` (default last 12 weeks). Each entry: `{ week: "YYYY-Www", minutes, games }`. Week label uses ISO week numbering (`IW`).

#### `getPlaytimeByPlatform(userId)`

Returns `{ platform: string, minutes: number, games: number }[]` ordered by minutes descending.

#### `getPlaytimeByGenre(userId)`

Returns `{ genre: string, minutes: number, games: number }[]` ordered by minutes descending. Unnests `games.genres` array.

#### `getGamingWrapped(userId, year)`

Returns `GamingWrapped` — annual summary for the given year:
- `totalHours`, `totalGames`, `newGames`, `completedGames`
- `topGame: { title, coverUrl, hours } | null`
- `topGenre: string | null`
- `topPlatform: PlatformId | null`
- `longestSession: { gameTitle, hours, date } | null`
- `favoriteDay: string | null` (e.g. "Saturday")
- `lateNightGamer: boolean` — true if >20% of sessions started between 00:00–04:00 UTC

---

### `queries/games.ts`

#### `findGameByIgdbId(igdbId)`

Returns `Game | null`. Lookup by unique `igdb_id` column.

#### `findGameBySteamId(steamAppId)`

Returns `Game | null`. Lookup by unique `steam_app_id` column.

#### `searchGames(query, limit?)`

Returns `Game[]` (default limit 20). Uses ILIKE for matching and orders by pg_trgm `similarity()` score descending.

#### `upsertGame(data)`

Returns `Game`. ON CONFLICT on `igdb_id`:
- `coverUrl` / `backgroundUrl` → `COALESCE(new, existing)` — never overwrite with null
- `genres` / `platforms` → kept if new array is non-empty, otherwise preserved
- `releaseYear`, `metacritic`, `description`, `steamAppId` → `COALESCE(new, existing)`

#### `getGameById(id)`

Returns `Game | null`. Lookup by primary key UUID.

---

### `queries/sessions.ts`

#### `getPlaySessions(userId, opts?)`

Returns `{ data: PlaySession[], nextCursor: string | null }`. Cursor is an ISO timestamp string (startedAt). Sorted descending by `startedAt`. Optional filter: `userGameId`. Each `PlaySession` includes `gameTitle` and `gameCoverUrl` from the joined game.

#### `insertPlaySession(data)`

Returns `string` (id). Runs in a transaction:
1. Inserts the play session row
2. Atomically increments `user_games.minutes_played` by `data.minutes`
3. Atomically updates `user_games.last_played_at` via `GREATEST()`

#### `bulkInsertSessions(sessions[])`

Returns `number` (count of actually inserted rows). Uses `ON CONFLICT DO NOTHING`. Safe for re-import scenarios. Returns 0 for empty input without hitting the DB.

---

### `queries/platforms.ts`

#### `getUserConnections(userId)`

Returns `PlatformConnection[]`. Each connection includes `gamesCount` (live count of `user_games` for that platform).

#### `getConnection(userId, platform)`

Returns the raw DB row (`typeof platformConnections.$inferSelect`) or `null`. Used internally by auth/sync code that needs access tokens.

#### `upsertConnection(data)`

Returns `void`. ON CONFLICT on `(user_id, platform)` — full overwrite of all provided fields.

#### `updateSyncStatus(userId, platform, status, lastSyncedAt?)`

Returns `void`. Partial update: sets `sync_status` and optionally `last_synced_at`.

#### `deleteConnection(userId, platform)`

Returns `boolean`. Returns `true` if the connection was found and deleted.

---

## Seed

`src/db/seed.ts` is fully idempotent:
- All inserts use `.onConflictDoNothing()`
- If users already exist, fetches them and continues
- If games already exist, fetches them from DB
- 20 games with `steamAppId` populated for Steam titles
- 90 days of realistic play sessions (60% day probability, 1–3 sessions/day, 30–240 min each)
- Prints a summary table at the end

---

## Tests

108 integration tests across 3 files. All run against a real PostgreSQL database (no mocking).

| File | Tests | Coverage |
|------|-------|----------|
| `library.test.ts` | 28 | getUserLibrary (11), getRecentlyPlayed (5), getUserGameById (4), upsertUserGame (3), updateUserGame (4), deleteUserGame (3) |
| `stats.test.ts` | 35 | getLibraryStats (11), getPlayHeatmap (6), getPlayStreaks (5), getWeeklyPlaytime (6), getPlaytimeByPlatform (4), getPlaytimeByGenre (4), getGamingWrapped (8) |
| `games-sessions.test.ts` | 45 | findGameByIgdbId (2), findGameBySteamId (2), searchGames (4), upsertGame (3), getGameById (2), getPlaySessions (7), insertPlaySession (1), bulkInsertSessions (2), getUserConnections (1), upsertConnection+getConnection (3), updateSyncStatus (2), deleteConnection (2) |

**Setup** (`src/__tests__/setup.ts`):
- Truncates all tables before the suite (dependency order: achievements → play_sessions → user_games → platform_connections → token_blacklist → users → games)
- Inserts 2 users, 5 games, 5 user_games for user 1, 60 days of sessions
- Uses bcrypt rounds=4 for speed
- Exports: `testUserId`, `testUserId2`, `testGameIds[]`, `testUserGameIds[]`
- Calls `closeDb()` in `afterAll`

---

## Running

```bash
# Migrate (includes 0001 with extensions + indexes)
pnpm db:migrate

# Seed (idempotent)
pnpm db:seed

# Type check
pnpm --filter api typecheck

# Tests (real DB, no mocking)
pnpm --filter api test
```
