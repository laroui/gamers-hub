# Handoff: B15 → Next
**For whoever picks up this project next**

---

## Project state entering post-B15

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
| B14 | Global Search & Command Palette (⌘K) | ✅ `6aed9ca` |
| B15 | Notifications Centre (bell drawer + worker hooks) | ✅ |

---

## Local dev startup

```bash
docker compose up -d postgres redis minio
pnpm db:migrate && pnpm db:seed

pnpm --filter api run dev     # Terminal A
pnpm --filter web run dev     # Terminal B
pnpm --filter worker run dev  # Terminal C (required for sync + notifications)
```

- API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Login: `nacim@gamershub.dev` / `password123`

---

## Notification system architecture

### DB
Table `notifications` (migration `0003_notifications.sql`):
- `id` UUID PK, `user_id` FK → users CASCADE, `type` TEXT, `title`, `body`, `payload` JSONB, `read_at` TIMESTAMPTZ nullable, `created_at`
- Indexes on `user_id` and `created_at DESC`

### Notification types
| type | Emitted by | Icon | Color |
|---|---|---|---|
| `sync_complete` | worker after successful sync | ↻ | green |
| `sync_error` | worker after failed sync | ✕ | pink |
| `achievement_unlocked` | (future — worker achievement check) | 🏆 | orange |
| `platform_connected` | (future — platforms route after OAuth) | ✓ | cyan |

### Worker schema mirror
The worker (`apps/worker/`) cannot import from `apps/api/` directly. The `notifications` table definition and `createNotification` function are mirrored inline in:
- `apps/worker/src/db/schema.ts`
- `apps/worker/src/db/queries.ts`

If the notifications schema ever changes, update both locations.

### API surface (additions)
| Method | Path | Auth | Action |
|---|---|---|---|
| GET | /api/v1/notifications | ✓ | Paginated list (limit, cursor) |
| GET | /api/v1/notifications/unread-count | ✓ | `{ count: N }` |
| PATCH | /api/v1/notifications/read | ✓ | Mark all as read |
| PATCH | /api/v1/notifications/:id/read | ✓ | Mark one as read |
| DELETE | /api/v1/notifications/:id | ✓ | Hard delete (optimistic on frontend) |

### Frontend polling
Both `useNotifications` and `useUnreadCount` poll every 60 seconds (`refetchInterval: 60_000`). The unread badge updates automatically without user interaction.

---

## Complete repository structure (post-B15)

```
gamers-hub/
  apps/
    api/
      src/
        db/
          schema.ts              B15 — notifications table appended
          migrations/
            0001_initial.sql
            0002_play_sessions_dedup.sql
            0003_notifications.sql  ✅ B15
          queries/
            notifications.ts     ✅ B15
        routes/
          notifications.ts       ✅ B15
          index.ts               B15 — notificationsRoutes registered
    worker/
      src/
        db/
          schema.ts              B15 — notifications table mirrored
          queries.ts             B15 — createNotification added
        services/
          sync.ts                B15 — emits sync_complete / sync_error
    web/
      src/
        hooks/
          useNotifications.ts    ✅ B15
        components/
          notifications/
            NotificationDrawer.tsx  ✅ B15
          layout/
            Topbar.tsx           B15 — bell button + badge + drawer
  packages/types/src/index.ts    B15 — NotificationType + Notification added
```

---

## Key patterns — unchanged

### void pattern for async in event handlers
```typescript
onClick={() => { void handleAction(); }}
```

### Non-fatal notification emission (worker)
```typescript
try {
  await createNotification({ ... });
} catch { /* non-fatal */ }
```

### CSS variables — never hardcode colors
```
--gh-bg / --gh-bg2 / --gh-bg3
--gh-surface / --gh-surface2
--gh-cyan / --gh-pink / --gh-green / --gh-orange
--gh-text / --gh-text2 / --gh-text3
--gh-border / --gh-border2
```

---

## Possible next steps

- **`achievement_unlocked` notifications** — Wire into the achievement sync loop in the worker; the notification type and drawer UI are already ready
- **`platform_connected` notifications** — Emit from the platforms route after successful OAuth connection
- **WebSocket / SSE** — Replace 60s polling with real-time push for instant notification delivery
- **Notification preferences** — Per-type opt-in/out settings in the profile page
- **Email notifications** — SMTP integration for digest emails
- **Xbox / PSN OAuth** — Complete non-Steam platform connections (UI stubs exist)
- **DELETE /auth/account** — Real account deletion (DangerZone UI already scaffolded)
- **Multi-user / social** — Friends, shared library views, leaderboards
