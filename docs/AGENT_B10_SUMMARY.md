# Batch B10 — Platforms Page
**Commit:** `bb05698` · **Branch:** `main`
**Typecheck:** 0 errors

---

## Files created

### Hooks
- **`src/hooks/useSyncProgress.ts`** — `useSyncProgress(platform, jobId)`: authenticated `fetch()` + `ReadableStream` SSE reader (EventSource can't send Authorization headers). Parses `data: {...}` chunks, sets `{ progress, isActive, error }` state. Auto-aborts prior stream on new `jobId`. Sets `isActive: false` in `finally` block.

### Components — `src/components/platforms/`
- **`PlatformCard.tsx`** — Handles both connected and disconnected states. Connected: icon (colored bg + border), displayName, stats row (gamesCount + last synced / progress label), Sync Now button + Disconnect button. Disconnected: greyed icon, description, Connect button (disabled + "COMING SOON" for `authType === "stub"`). Sync sweep animation: 2px `syncSweep` strip at card top while `isSyncing`. Disconnect confirm modal inline.
- **`SteamConnectModal.tsx`** — Steam API key + Steam 64-bit ID form. POSTs to `/auth/steam-key`, invalidates `["platforms"]`, triggers initial sync, closes.
- **`NintendoConnectModal.tsx`** — Session token textarea with nxapi instructions. POSTs to `/auth/nintendo-token`, same flow.

### Page
- **`src/pages/PlatformsPage.tsx`** — Replaces stub. Header: "MY PLATFORMS" + connected count + "↻ SYNC ALL" button (only shown when any platform connected). Responsive grid: `repeat(auto-fill, minmax(280px, 1fr))`. Skeleton: 6 `gh-card skeleton` tiles while loading. Connect flow branches on `platformId`: steam → `SteamConnectModal`, nintendo → `NintendoConnectModal`, others → OAuth popup with `postMessage` listener + `setInterval` popup-closed cleanup. Sync All: sequential loop with 600ms delay between platforms.

## Files updated

- **`src/lib/platforms.ts`** — Added `description: string` and `authType: "oauth" | "apikey" | "sessiontoken" | "stub"` to `PlatformMeta` interface. All 10 PLATFORMS entries updated. Fallback in `getPlatform()` also updated.
- **`src/hooks/usePlatforms.ts`** — Added `refetchInterval: 10 * 1000` to `usePlatforms`. Updated `useTriggerSync` return type to `{ jobId: string; message: string }`. Added `useDisconnectPlatform` (DELETE `/platforms/:platform/disconnect`) and `useConnectPlatform` (POST `/platforms/:platform/connect` → `{ authUrl, state }`).
- **`src/styles/globals.css`** — Appended `@keyframes syncSweep { 0% { left: -60%; } 100% { left: 100%; } }`.

---

## Critical implementation details

### SSE pattern (useSyncProgress)
```typescript
// err: unknown cast pattern (not any — avoids lint warning)
} catch (err: unknown) {
  if ((err as { name?: string })?.name === "AbortError") return;
  setState({ progress: null, isActive: false, error: "Sync stream disconnected" });
}
```

### async onClick — void pattern (consistent with B9)
```typescript
onClick={() => { void handleSync(); }}
onClick={() => { void handleSyncAll(); }}
onClick={() => { void handleConnect(); }}
```

### connectionMap type — noUncheckedIndexedAccess safe
```typescript
const connectionMap = Object.fromEntries(
  connections.map((c) => [c.platform, c]),
) as Record<PlatformId, (typeof connections)[number] | undefined>;
// Access: connectionMap[meta.id] ?? null → PlatformConnection | null ✓
```

### platforms.ts backward compatible
All B8/B9 components using `getPlatform()` only access `.name`, `.emoji`, `.color` — the new `.description` and `.authType` fields are purely additive.

---

## Definition of Done — verified ✅

- [x] `pnpm --filter web run typecheck` exits 0
- [x] All 10 platform cards render in responsive grid
- [x] Connected platforms show green dot + game count + last synced
- [x] Disconnected platforms show greyed icon + Connect button
- [x] EA / Ubisoft / Battle.net / Game Pass show COMING SOON (disabled)
- [x] Steam modal opens for Steam connect
- [x] Nintendo modal opens for Nintendo connect
- [x] OAuth popup opens for Xbox/PSN/Epic/GOG
- [x] Sync sweep animation on syncing cards
- [x] Disconnect confirmation modal
- [x] Sync All cycles through platforms with X/Y counter
- [x] No B1–B9 files modified beyond platforms.ts, usePlatforms.ts, globals.css (append-only)
