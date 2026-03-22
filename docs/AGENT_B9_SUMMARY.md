# Batch B9 — Game Detail Page
**Commit:** `9f7caa5` · **Branch:** `main`
**Typecheck:** 0 errors

---

## Files created

### Hooks
- **`src/hooks/useUserGame.ts`** — `useUserGame(userGameId)`: GET `/library/:id`, 2min staleTime. `usePatchUserGame(userGameId)`: PATCH `/library/games/:id` with optimistic update — cancels inflight queries, sets cache immediately, reverts on error, invalidates on settled.
- **`src/hooks/useGameAchievements.ts`** — `useGameAchievements(gameId, enabled)`: GET `/games/:id/achievements`, 5min staleTime. `enabled` gate prevents fetching before `userGame` loads.
- **`src/hooks/usePlaySessions.ts`** — `usePlaySessions(userGameId, limit)`: GET `/sessions/:userGameId`, 2min staleTime. `useLogSession()`: POST `/sessions`, invalidates `["sessions"]` and `["library"]` on success.

### Components — `src/components/game/`
- **`CompletionRing.tsx`** — SVG ring, animates `strokeDashoffset` from full (hidden) to target on mount via forced reflow + CSS transition (`cubic-bezier(0.34, 1.56, 0.64, 1)`). Color: green ≥100% / cyan ≥60% / purple ≥30% / pink <30%. Center label shows `Math.round(pct)%`.
- **`StatusSelector.tsx`** — 5 vertical buttons (`library/playing/completed/wishlist/dropped`). Active button shows color+bg+border for that status. Calls `onChange` immediately (optimistic in parent).
- **`StarRating.tsx`** — 10 stars, hover fills up to hovered index, click saves rating. Shows `{value}/10` label when rated. Uses local `hovered` state only; actual value comes from parent.
- **`AchievementsGrid.tsx`** — Skeleton 10 tiles while loading. Progress bar header (earned/total). 5-column icon grid: earned=full color, locked=35% opacity + grayscale. Rarity dot (gold/silver/bronze) bottom-right of earned icons. Tooltip shows title, description, unlock time, rarity%.
- **`SessionHistory.tsx`** — Last 10 sessions as rows (platform emoji, duration, timeago, device, date). "+ ADD" button opens `AddSessionModal` (datetime-local + minutes input → POST /sessions → toast).

### Page
- **`src/pages/GameDetailPage.tsx`** — Replaces stub. Hero banner: blurred+dimmed background art, cover thumbnail, title+genres+metacritic+platform. Two-column grid (`300px 1fr`, collapses to `1fr` on mobile via `useIsMobile`). Left: StatusSelector, StarRating, Notes (debounced 500ms PATCH). Right: CompletionRing + hours stats, SessionHistory, AchievementsGrid (only when achievementsTotal > 0), game description.

### Targeted edits — `src/components/library/`
- **`GameCard.tsx`** — `onClick` now saves `window.scrollY` to `sessionStorage["library-scroll"]` before navigating.
- **`GameListRow.tsx`** — Same scroll save on click.

---

## Critical implementation details

### Optimistic update pattern (usePatchUserGame)
```typescript
onMutate: async (patch) => {
  await queryClient.cancelQueries({ queryKey: ["library", "game", userGameId] });
  const previous = queryClient.getQueryData<UserGame>(["library", "game", userGameId]);
  queryClient.setQueryData<UserGame>(["library", "game", userGameId], (old) =>
    old ? ({ ...old, ...patch } as UserGame) : old,
  );
  return { previous };
},
onError: (_err, _patch, context) => {
  if (context?.previous) {
    queryClient.setQueryData(["library", "game", userGameId], context.previous);
  }
},
```
Cast `{ ...old, ...patch } as UserGame` required because TypeScript widens optional fields in spread.

### Hero background image — exactOptionalPropertyTypes safe
```typescript
// ✅ Safe — game.backgroundUrl ?? game.coverUrl returns string | null
src={(game.backgroundUrl ?? game.coverUrl)!}
// Wrapped in conditional: only rendered when backgroundUrl ?? coverUrl is truthy
```

### Notes textarea — uncontrolled + debounced
`defaultValue={userNotes ?? ""}` (uncontrolled) + `onChange` fires `saveNotes` (500ms debounce). Avoids React re-render on every keystroke.

### Modal submit — floating promise handled
```typescript
onClick={() => { void handleSubmit(); }}
```
`handleSubmit` is async; `void` suppresses the unhandled-promise lint warning without changing behaviour.

### Scroll restoration
- `GameCard` / `GameListRow` `onClick`: `sessionStorage.setItem("library-scroll", String(window.scrollY))`
- `GameDetailPage` `handleBack`: reads key, calls `navigate("/library")`, then `requestAnimationFrame(() => window.scrollTo(0, saved))` — the rAF gives React time to mount the library before scrolling.

---

## Definition of Done — verified ✅

- [x] `pnpm --filter web run typecheck` exits 0
- [x] GameDetailPage replaces stub
- [x] CompletionRing animates on mount
- [x] StatusSelector saves optimistically
- [x] StarRating saves and renders hover state
- [x] Notes debounce 500ms PATCH
- [x] AchievementsGrid earned=color / locked=greyscale
- [x] AddSessionModal submits, toasts, updates session list
- [x] Back button restores scroll
- [x] Two-column → single column on mobile
- [x] No B1–B8 files modified beyond the two GameCard scroll saves
