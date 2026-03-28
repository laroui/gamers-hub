import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthProvider.tsx";
import { Toaster } from "react-hot-toast";
import { AdminCommandPalette } from "../components/admin/CommandPalette.tsx";
import { useAdminCommandPalette } from "../components/admin/CommandPalette.tsx";

const NAV_ITEMS = [
  { path: "/admin/dashboard",  label: "Dashboard",         icon: "▦" },
  { path: "/admin/posts",      label: "Posts",             icon: "✎" },
  { path: "/admin/social",     label: "Social Publisher",  icon: "⟁" },
  { path: "/admin/ai-content", label: "AI Content",        icon: "◈" },
  { path: "/admin/database",   label: "Database",          icon: "⊞" },
  { path: "/admin/users",      label: "Users",             icon: "⊙" },
];

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  useAdminCommandPalette();

  if (isLoading) return null;

  if (!user || user.role !== "admin") {
    const adminPath = (import.meta.env["VITE_ADMIN_PATH"] as string | undefined) ?? "/admin-access";
    return <Navigate to={adminPath} replace />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#18181b", color: "#fafafa", border: "1px solid #27272a", fontSize: 13 },
        }}
      />
      <AdminCommandPalette />

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        borderRight: "1px solid #1c1c1f",
        padding: "24px 0",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Brand */}
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #1c1c1f" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#fff",
            }}>GH</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#fafafa" }}>Admin Panel</p>
              <p style={{ fontSize: 11, color: "#52525b", margin: 0 }}>Gamers Hub</p>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 10, color: "#22c55e" }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block",
              animation: "pulse 2s infinite",
            }} />
            Live
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV_ITEMS.map(({ path, label, icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 6, marginBottom: 2,
                  textDecoration: "none",
                  background: active ? "#18181b" : "transparent",
                  color: active ? "#fafafa" : "#71717a",
                  fontSize: 13, fontWeight: active ? 500 : 400,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.7 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1c1c1f" }}>
          <p style={{ fontSize: 11, color: "#3f3f46", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </p>
          <p style={{ fontSize: 10, color: "#3f3f46", margin: "0 0 8px" }}>
            ⌘K for commands
          </p>
          <Link to="/" style={{ fontSize: 11, color: "#71717a", textDecoration: "none" }}>← Back to site</Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", minHeight: "100vh" }}>
        <Outlet />
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
