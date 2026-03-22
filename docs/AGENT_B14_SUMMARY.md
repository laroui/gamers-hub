# AGENT B14 SUMMARY — Global Search & Command Palette

## Batch Goal
Replace the library-only search input in the topbar with a full global command palette triggered by ⌘K / Ctrl+K from any page. The palette searches the user's library and the global game catalog simultaneously, supports keyboard navigation, and persists recent searches to localStorage.

---

## Key Accomplishments

### 1. Search Store (`apps/web/src/stores/search.ts`)
- Zustand store with `persist` middleware keyed as `gh-search`
- State: `isOpen`, `query`, `recentSearches[]` (up to 8 entries)
- Actions: `open()` / `close()` (both reset query), `setQuery()`, `addRecentSearch()`, `clearRecentSearches()`
- Only `recentSearches` is persisted to localStorage — `isOpen` and `query` always reset on page load

### 2. Global Search Hook (`apps/web/src/hooks/useGlobalSearch.ts`)
- React Query hook: `queryKey: ["search", "global", query]`, enabled when `query.length >= 2`
- Fans out to two endpoints in parallel via `Promise.allSettled`:
  - `GET /library?search={q}&limit=5` — user's owned games
  - `GET /games/search?q={q}` — global game catalog
- Deduplicates catalog results: any game already in the library is excluded from catalog section
- Maps `UserGame` fields (id, game.title, game.coverUrl, platform, hoursPlayed, status, etc.) and `Game` fields to a unified `SearchResult` interface
- `staleTime: 30s`, `placeholderData: { owned: [], catalog: [] }` for instant display on re-query

### 3. Command Palette Hook (`apps/web/src/hooks/useCommandPalette.ts`)
- Registers a global `keydown` listener for `Ctrl+K` (Windows/Linux) and `⌘K` (Mac)
- Toggles palette open/close, calls `e.preventDefault()` to block browser default behavior
- Wired into `App.tsx` via `useCommandPalette()` at the top level — always active

### 4. CommandPalette Component (`apps/web/src/components/search/CommandPalette.tsx`)
- Fixed full-screen overlay: `position: fixed`, `inset: 0`, `z-index: 800`, `rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)`
- Click overlay to close (target === currentTarget guard)
- 600px wide palette box, `borderRadius: 16px`, `maxHeight: 70vh`, `paletteIn` entry animation
- **Input row**: 🔍 icon, plain text input (auto-focused after 50ms delay on open), `<Spinner>` while loading, ESC kbd hint
- **Empty query mode** (query < 2):
  - Quick Navigate: 4-up grid (Library / Platforms / Stats / Profile) — click navigates and closes
  - Recent Searches: list of past queries with ⟳ icon, click repopulates input; "Clear" button removes all
- **Search mode** (query >= 2):
  - "Your Library" section: owned results with 32×43px cover thumbnail, platform emoji + hours subtitle, status pill (▶ Playing / ✓ Done / etc.)
  - "Game Catalog" section: catalog results with genre + year + Metacritic subtitle, "Catalog" pill
  - "No results" fallback when both sections are empty and not loading
- **Keyboard navigation**:
  - `activeIndex` state (−1 = none)
  - ArrowDown / ArrowUp move through all selectable items
  - Enter selects the active item (or submits query if activeIndex = −1)
  - Escape closes
  - Mouse hover also sets `activeIndex` (unified highlight)
  - `activeIndex` resets to −1 on every query change
- Index mapping: in empty mode, indices 0–3 = quick actions, 4+ = recent searches; in search mode, 0–(owned.length−1) = owned, owned.length+ = catalog
- **Footer**: ↑↓ navigate / ↵ open / ⌘K close hints using `<kbd>` elements
- On result select: `addRecentSearch(query)` → `close()` → `navigate(/library/${result.id})`

### 5. App.tsx Integration
- `useCommandPalette()` called at component root — registers global ⌘K listener
- `<CommandPalette />` rendered always-mounted inside `AuthProvider`, outside `<Routes>` — palette is accessible from any route

### 6. Topbar — Universal Search Trigger
- Library-only `<input>` replaced with an always-visible `<button>` that calls `useSearchStore().open()`
- Shows "🔍 Search games… ⌘K" with inline `<kbd>` hint
- Styled: `var(--gh-surface)` background, 220px width, hover lightens border/text
- Status tabs and all other topbar content unchanged

### 7. `paletteIn` Keyframe (globals.css — append only)
```css
@keyframes paletteIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

---

## Files Created (4)

```
apps/web/src/stores/search.ts
apps/web/src/hooks/useGlobalSearch.ts
apps/web/src/hooks/useCommandPalette.ts
apps/web/src/components/search/CommandPalette.tsx
```

## Files Modified (3)

```
apps/web/src/App.tsx              useCommandPalette() + <CommandPalette /> always-mounted
apps/web/src/components/layout/Topbar.tsx   Library-only input → universal trigger button
apps/web/src/styles/globals.css   @keyframes paletteIn appended
```

---

## Quality Assurance

- `pnpm --filter web run typecheck` — exit 0 ✅
- ⌘K / Ctrl+K opens palette from any page ✅
- Escape and overlay click close palette ✅
- Quick actions navigate correctly ✅
- Search results from library + catalog in parallel ✅
- Keyboard navigation (↑↓ Enter Escape) ✅
- Recent searches persisted to localStorage ✅
- Topbar trigger button visible on all pages ✅
- No regression on library, game detail, stats, platforms, profile pages ✅

---

*Batch B14 completed. The application now has a full global command palette accessible from any page via ⌘K / Ctrl+K.*
