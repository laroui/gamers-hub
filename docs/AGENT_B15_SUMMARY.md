# AGENT B15 SUMMARY — Notifications Centre

## Batch Goal
Make the topbar bell icon functional with a full notification system: a `notifications` DB table, REST API, worker hooks that emit events after sync, and a slide-in drawer on the frontend with unread badge, auto-mark-read, and optimistic dismiss.

---

## Key Accomplishments

### 1. DB Schema — `notifications` table (`apps/api/src/db/schema.ts`)
- Appended `notifications` table: `id` (uuid PK), `userId` (FK → users, cascade), `type` (text), `title`, `body`, `payload` (jsonb), `readAt` (nullable timestamp), `createdAt`
- Two indexes: `notifications_user_id_idx` on userId, `notifications_created_at_idx` on createdAt
- `jsonb` and `index` were already imported — no new imports needed

### 2. Migration (`apps/api/src/db/migrations/0003_notifications.sql`)
- Named `0003` because `0002_play_sessions_dedup.sql` already existed
- `CREATE TABLE IF NOT EXISTS notifications` with all columns, CASCADE on user delete
- Two `CREATE INDEX IF NOT EXISTS` statements
- Ran successfully via `pnpm db:migrate`

### 3. Notification Query Functions (`apps/api/src/db/queries/notifications.ts`)
- `createNotification(data)` — inserts a new notification row
- `getUserNotifications(userId, opts)` — keyset cursor pagination (newest first, max 50 per page)
- `getUnreadCount(userId)` — counts rows where `readAt IS NULL`
- `markAllRead(userId)` — sets `readAt = now()` for all unread rows
- `markOneRead(userId, notificationId)` — sets `readAt` for a single row
- `deleteNotification(userId, notificationId)` — hard deletes (userId scoped for security)

### 4. Notifications API Route (`apps/api/src/routes/notifications.ts`)
All routes guarded by `authMiddleware`:
| Method | Path | Action |
|---|---|---|
| GET | /api/v1/notifications | Paginated list (limit + cursor query params) |
| GET | /api/v1/notifications/unread-count | `{ count: N }` |
| PATCH | /api/v1/notifications/read | Mark all as read |
| PATCH | /api/v1/notifications/:id/read | Mark one as read |
| DELETE | /api/v1/notifications/:id | Dismiss (hard delete) |

Registered in `apps/api/src/routes/index.ts` at prefix `/api/v1/notifications`.

### 5. Shared Types (`packages/types/src/index.ts`)
```typescript
type NotificationType = "sync_complete" | "sync_error" | "achievement_unlocked" | "platform_connected";

interface Notification {
  id: string; userId: string; type: NotificationType;
  title: string; body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null; createdAt: string; isRead: boolean;
}
```

### 6. Worker — Notification Emission

**`apps/worker/src/db/schema.ts`** — `notifications` table definition mirrored inline (worker cannot import from the API app directly).

**`apps/worker/src/db/queries.ts`** — Added inline `createNotification` using the worker's db client.

**`apps/worker/src/services/sync.ts`** — After `updateSyncStatus("success")`:
```typescript
// Non-fatal — wrapped in try/catch
await createNotification({
  userId, type: "sync_complete",
  title: `${platform} sync complete`,
  body: `${rawGames.length} games synced${newGamesCount > 0 ? `, ${newGamesCount} new` : ""}`,
  payload: { platform, gamesCount: rawGames.length, newGames: newGamesCount },
});
```
In the catch block (before re-throw):
```typescript
await createNotification({
  userId, type: "sync_error",
  title: `${platform} sync failed`,
  body: error instanceof Error ? error.message : "Unknown error during sync",
  payload: { platform, error: String(error) },
});
```

### 7. Frontend Hooks (`apps/web/src/hooks/useNotifications.ts`)
- `useNotifications()` — `GET /notifications`, polls every 60s, staleTime 30s
- `useUnreadCount()` — `GET /notifications/unread-count`, polls every 60s
- `useMarkAllRead()` — `PATCH /notifications/read`, invalidates notifications cache on success
- `useDismissNotification()` — `DELETE /notifications/:id`, optimistic removal with rollback on error

### 8. NotificationDrawer Component (`apps/web/src/components/notifications/NotificationDrawer.tsx`)
- Fixed panel: `top: 60px`, `right: 0`, `width: 360px`, `height: calc(100vh - 60px)`, `z-index: 200`
- Slide animation: `transform: translateX(100%)` → `translateX(0)`, `transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1)`
- Box shadow when open: `-8px 0 32px rgba(0,0,0,0.4)`
- Click-outside close (100ms delayed listener to avoid immediate close on bell click)
- Auto-mark-all-read after 1500ms when opened (useEffect on isOpen)
- `TYPE_META` map for 4 notification types: icon + color per type
  - `sync_complete` → ↻ green, `sync_error` → ✕ pink, `achievement_unlocked` → 🏆 orange, `platform_connected` → ✓ cyan
- `NotificationItem`: 32px icon circle, title (bold if unread), body, `formatDistanceToNow` timestamp, × dismiss button, cyan unread dot
- Skeleton: 4 gray bars while loading
- Empty state: bell emoji + "No notifications yet" + "Sync a platform to get started"
- Header: "NOTIFICATIONS" title + "Mark all read" button (shown only when unread exist) + × close
- Footer: "Showing last N notifications" (shown when list non-empty)

### 9. Topbar — Bell Button (`apps/web/src/components/layout/Topbar.tsx`)
- Replaced static bell div with interactive `<button>`
- `drawerOpen` state toggles on click
- Active state when open: surface2 background, border2 border, text color
- Unread badge: pink circle (16px), `9+` format for counts over 9, pink glow shadow
- `<NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />` rendered inside the bell wrapper

---

## Files Created (5)

```
apps/api/src/db/migrations/0003_notifications.sql
apps/api/src/db/queries/notifications.ts
apps/api/src/routes/notifications.ts
apps/web/src/hooks/useNotifications.ts
apps/web/src/components/notifications/NotificationDrawer.tsx
```

## Files Modified (7)

```
apps/api/src/db/schema.ts                notifications table appended
apps/api/src/routes/index.ts             notificationsRoutes registered
apps/worker/src/db/schema.ts             notifications table mirrored inline
apps/worker/src/db/queries.ts            createNotification added
apps/worker/src/services/sync.ts         sync_complete + sync_error notifications emitted
packages/types/src/index.ts              NotificationType + Notification added
apps/web/src/components/layout/Topbar.tsx  bell → interactive button with badge + drawer
```

---

## Quality Assurance

- `pnpm --filter api run typecheck` — exit 0 ✅
- `pnpm --filter web run typecheck` — exit 0 ✅
- `pnpm db:migrate` — 0003_notifications.sql applied ✅
- Bell button interactive (was static) ✅
- Drawer slides in/out with animation ✅
- Empty state on first load ✅
- sync_complete notification emitted after Steam sync ✅
- Optimistic dismiss with rollback ✅

---

*Batch B15 completed. The bell icon is now fully functional with real-time notification polling, unread badge, and a slide-in drawer.*
