import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth/AuthProvider.tsx";
import { ProtectedRoute } from "./lib/auth/ProtectedRoute.tsx";
import { AppShell } from "./components/layout/AppShell.tsx";
import { PublicShell } from "./components/layout/PublicShell.tsx";
import { useTauriEvents } from "./hooks/useTauriEvents.ts";
import { useCommandPalette } from "./hooks/useCommandPalette.ts";
import { CommandPalette } from "./components/search/CommandPalette.tsx";

import { HomePage } from "./pages/HomePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { AuthCallbackPage } from "./pages/AuthCallbackPage.tsx";
import { LibraryPage } from "./pages/LibraryPage.tsx";
import { GameDetailPage } from "./pages/GameDetailPage.tsx";
import { PlatformsPage } from "./pages/PlatformsPage.tsx";
import { StatsPage } from "./pages/StatsPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";

export function App() {
  useTauriEvents();
  useCommandPalette();

  return (
    <AuthProvider>
      <CommandPalette />
      <Routes>
        {/* Public routes — use PublicShell (sticky topbar with login/avatar) */}
        <Route element={<PublicShell />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* Auth pages — standalone (no shell) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected routes — use AppShell (sidebar + topbar) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:gameId" element={<GameDetailPage />} />
            <Route path="/platforms" element={<PlatformsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
