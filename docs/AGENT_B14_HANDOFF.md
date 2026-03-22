# Handoff: B14 → Next
**For whoever picks up this project next**

---

## Project state entering post-B14

| Batch | Commit | Status |
|---|---|---|
| B1–B2 | scaffold + DB schema | ✅ |
| B3 | Auth API (141 tests) | ✅ `a83e60b` |
| B4 | Platform Sync Engine (174 tests) | ✅ `b19bd02` |
| B5 | Games & Library API (176 tests) | ✅ `dfd9fba` |
| B6 | Stats & Analytics API (211 tests) | ✅ `26f120a` |
| B7 | React App Shell + Auth UI | ✅ `ad62e66` |
| B8 | Library Page | ✅ `46e1ec6` |
| B9 | Game Detail Page | ✅ `9f7caa5` |
| B10 | Platforms Page | ✅ `bb05698` |
| Fix | Steam OpenID + server-side key + disconnect bug | ✅ `cd5749a` |
| B11 | Stats Page + Gaming Wrapped + sync engine | ✅ `2a028c8` |
| B12 | PWA + Tauri + Capacitor + prod Docker + CI/CD | ✅ `c9754b5` |
| B13 | Profile Page (avatar, username, password, export) | ✅ `32b3db7` |
| B14 | Global Search & Command Palette (⌘K) | ✅ |

**All pages and features are complete. The application is fully functional.**

---

## Local dev startup

```bash
# Terminal 0 — infrastructure
docker compose up -d postgres redis minio
pnpm db:migrate && pnpm db:seed   # only needed after docker restart

# Terminal A — API
pnpm --filter api run dev

# Terminal B — Web
pnpm --filter web run dev

# Terminal C — Worker (required for platform sync)
pnpm --filter worker run dev
```

- API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Login: `nacim@gamershub.dev` / `password123`

---

## Complete repository structure (post-B14)

```
gamers-hub/
  apps/
    api/                         ✅ fully complete — DO NOT TOUCH
    worker/                      ✅ fully complete — DO NOT TOUCH
    web/
      src/
        App.tsx                  ✅ B14 — useCommandPalette() + <CommandPalette /> always-mounted
        pages/                   ✅ all complete (B7–B13)
        components/
          layout/
            Topbar.tsx           ✅ B14 — universal search trigger button (was library-only)
            AppShell.tsx         ✅ B12
            BottomNav.tsx        ✅ B12
          profile/               ✅ B13 — 6 components
          search/
            CommandPalette.tsx   ✅ B14 — full palette with keyboard nav + sections
          stats/                 ✅ B11 — 6 components
          ui/                    ✅ B7
        hooks/
          useCommandPalette.ts   ✅ B14 — global ⌘K listener
          useGlobalSearch.ts     ✅ B14 — parallel library + catalog search
          useProfile.ts          ✅ B13
          useStats.ts            ✅ B11
          usePlatforms.ts        ✅ B10
          useTauriEvents.ts      ✅ B12
          useDebouncedCallback.ts ✅ B7
        stores/
          search.ts              ✅ B14 — isOpen, query, recentSearches (persisted)
          ui.ts                  ✅ B7 — useLibraryStore (filters.search still works)
          toast.ts               ✅ B7
        lib/
          auth/AuthProvider.tsx  ✅ B13 — refreshUser() in context
          api/client.ts          ✅ B7
          platforms.ts           ✅ B7
        styles/
          globals.css            ✅ append-only — B14 @keyframes paletteIn at end
```

---

## Search architecture

### Stores
- `useSearchStore()` from `src/stores/search.ts` — controls palette open/close + recent searches (localStorage via zustand/persist)
- `useLibraryStore().setFilter("search", ...)` from `src/stores/ui.ts` — still controls the library grid filter (unchanged)

### Search flow
1. User presses ⌘K → `useCommandPalette` listener calls `useSearchStore().open()`
2. `CommandPalette` renders (always mounted, conditional render inside)
3. User types → `setQuery(q)` → `useGlobalSearch(query)` fires when `query.length >= 2`
4. Two parallel requests: `GET /library?search=q&limit=5` + `GET /games/search?q=q`
5. Results rendered in two sections; owned game IDs deduplicated from catalog
6. On select: `addRecentSearch(query)` → `close()` → `navigate(/library/${result.id})`

### Keyboard navigation index mapping
**Empty query mode:**
- Index 0–3: Quick Actions (Library, Platforms, Stats, Profile)
- Index 4+: Recent searches (in order)

**Search mode (query >= 2):**
- Index 0 to `owned.length - 1`: owned/library results
- Index `owned.length` to end: catalog results

---

## Key patterns — unchanged from B13

### void pattern for async onClick
```typescript
onClick={() => { void handleAction(); }}
```

### err: unknown cast
```typescript
} catch (err: unknown) {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
```

### CSS variables — never hardcode colors
```
--gh-bg / --gh-bg2 / --gh-bg3
--gh-surface / --gh-surface2 / --gh-surface3
--gh-cyan / --gh-cyan-dim / --gh-cyan-glow
--gh-purple / --gh-pink / --gh-green / --gh-orange
--gh-text / --gh-text2 / --gh-text3
--gh-border / --gh-border2 / --gh-border3
```

### globals.css — append only, never modify existing rules

### MinIO storage pattern — unchanged from B13
Use `uploadBuffer` from `apps/api/src/services/storage.ts` for any new file uploads.

---

## Possible next steps

The core application is feature-complete. Potential future work:

- **Notifications center** — bell icon in topbar, in-app notification feed (sync complete, achievement unlocked)
- **Multi-user / social features** — friends list, shared library views, leaderboards
- **Xbox / PSN OAuth** — complete the non-Steam platform connections (UI stubs exist in PlatformsPage)
- **Email verification** — send verification on register, gate features on verified flag
- **DELETE /auth/account** — real account deletion (DangerZone UI already scaffolded in B13)
- **IGDB metadata enrichment** — cover art pipeline via MinIO + IGDB API
- **Tauri auto-update** — `tauri-plugin-updater` for desktop OTA updates
- **Push notifications** — Tauri native notifications on sync complete
- **Game recommendations** — "You might like" section based on genre/platform overlap
- **Stripe billing** — premium tier if moving toward SaaS
