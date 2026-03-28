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

// Admin
import AdminLoginPage from "./pages/admin/AdminLoginPage.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminPosts from "./pages/admin/AdminPosts.tsx";
import AdminSocial from "./pages/admin/AdminSocial.tsx";
import AdminAIContent from "./pages/admin/AdminAIContent.tsx";
import AdminDatabase from "./pages/admin/AdminDatabase.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";

export function App() {
  useTauriEvents();
  useCommandPalette();

  const adminPath = (import.meta.env["VITE_ADMIN_PATH"] as string | undefined) ?? "/admin-access";

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

        {/* Admin login — secret URI */}
        <Route path={adminPath} element={<AdminLoginPage />} />

        {/* Admin panel — protected by AdminLayout (checks role === 'admin') */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="social" element={<AdminSocial />} />
          <Route path="ai-content" element={<AdminAIContent />} />
          <Route path="database" element={<AdminDatabase />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

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
