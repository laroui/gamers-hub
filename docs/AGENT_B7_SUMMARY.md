# Batch B7 — React App Shell + Auth UI
**Commit:** `ad62e66` · **Branch:** `main`
**Typecheck:** 0 errors

---

## Files created

### Hooks
- **`src/hooks/useIsMobile.ts`** — `useIsMobile(breakpoint=768)`: uses `window.matchMedia` + resize listener. Returns `true` below breakpoint. No SSR guard needed (Vite SPA).

### Stores
- **`src/stores/toast.ts`** — Zustand toast store. `useToastStore` with `toasts[]`, `add()`, `remove()`. `add()` auto-dismisses via `setTimeout`. `useToast()` convenience hook: `.success()`, `.error()`, `.info()`, `.warning()`. Fixed `exactOptionalPropertyTypes` by constructing the toast object explicitly and conditionally assigning `duration`.

### Components — UI
- **`src/components/ui/Icons.tsx`** — Named icon components: `LibraryIcon`, `PlatformsIcon`, `StatsIcon`, `ProfileIcon`, `PlusIcon`, `LogoutIcon`, `BellIcon`. All accept `{ size?: number }`.
- **`src/components/ui/Spinner.tsx`** — CSS `spin` keyframe spinner. Props: `size`, `color`.
- **`src/components/ui/PageLoader.tsx`** — Full-screen fixed overlay with `<Spinner size={40} />` + "LOADING..." text.
- **`src/components/ui/Toast.tsx`** — `ToastItem` + `ToastContainer`. 4 variants (success/error/info/warning) with distinct colors. Click to dismiss. `toastIn` keyframe animation.

### Components — Layout
- **`src/components/layout/BottomNav.tsx`** — Fixed bottom nav for mobile. 4 NavLinks (library/platforms/stats/profile) using Icons. `zIndex: 100`, `paddingBottom: env(safe-area-inset-bottom)`.
- **`src/components/ErrorBoundary.tsx`** — Class component. `getDerivedStateFromError` sets state. Renders error card with RELOAD button. Wraps entire app in `main.tsx`.

---

## Files replaced

### Pages
- **`src/pages/LoginPage.tsx`** — react-hook-form + zod. GH logo + "GAMERS HUB" above card. Fields: email, password. onFocus/onBlur border highlight. API error banner. On success: navigate to `from` or `/library`, fires `success("Welcome back!")` toast.
- **`src/pages/RegisterPage.tsx`** — react-hook-form + zod. Fields: email, username, password, confirmPassword. `refine` checks passwords match. On API 409: `setError("email"/"username")` for EmailTaken/UsernameTaken. On success: navigate to `/library`.

---

## Files modified

### `src/main.tsx`
Wrapped `<QueryClientProvider>` in `<ErrorBoundary>`. Changed `error: any` → `error: unknown` with explicit cast in retry callback to fix strict TS.

### `src/components/layout/AppShell.tsx`
Added `useIsMobile()`. Conditionally renders `<Sidebar />` (desktop) or `<BottomNav />` (mobile). Adjusts `marginLeft` and `paddingBottom`. Renders `<ToastContainer />`.

### `src/components/layout/Topbar.tsx`
Added `dropdownOpen` state + `dropdownRef` for outside-click detection. Avatar div toggles dropdown. Dropdown shows: username header, "Profile" NavLink, "Sign out" button. Bell icon added left of avatar. `DropdownItem` helper component defined inline.

### `src/lib/auth/ProtectedRoute.tsx`
Swapped inline loading div for `<PageLoader />`.

### `src/styles/globals.css`
Appended `@keyframes spin` and `@keyframes toastIn` inside `@layer utilities`.

---

## Critical implementation details

### `exactOptionalPropertyTypes: true` (web tsconfig)
Applies to the frontend too. The `useToast` helper constructs toast objects explicitly:
```typescript
const t: Omit<Toast, "id"> = { message, variant };
if (duration !== undefined) t.duration = duration;
```

### Toast system usage
```typescript
const { success, error } = useToast();
success("Welcome back!");   // auto-dismisses after 3s
error("Something failed");  // click to dismiss early
```

### useIsMobile hook
```typescript
const isMobile = useIsMobile(); // 768px breakpoint
const isMobile = useIsMobile(1024); // custom breakpoint
```

### ErrorBoundary placement
Wraps `<QueryClientProvider>` in `main.tsx` — catches errors from any React component in the tree, including auth state errors.

---

## Definition of Done — verified ✅

- [x] `pnpm --filter web run typecheck` exits 0
- [x] `LoginPage` renders GH logo + card with email/password + zod validation
- [x] `RegisterPage` renders all 4 fields + confirmPassword match validation
- [x] Avatar dropdown: shows username/email, Profile link, Sign out button
- [x] Bell icon rendered left of avatar
- [x] `useIsMobile` switches sidebar ↔ BottomNav at 768px
- [x] `ToastContainer` rendered in AppShell
- [x] "Welcome back!" toast fired on successful login
- [x] `ErrorBoundary` wraps app with RELOAD fallback
- [x] `PageLoader` replaces inline loading div in ProtectedRoute
- [x] `spin` + `toastIn` keyframes appended to globals.css
- [x] No B1–B6 files modified beyond targeted edits listed in spec
