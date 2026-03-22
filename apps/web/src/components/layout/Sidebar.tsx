import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";

const NAV_ITEMS = [
  {
    to: "/library",
    label: "Library",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="7" height="9" /><rect x="9" y="3" width="7" height="9" />
        <rect x="2" y="14" width="7" height="7" /><rect x="9" y="14" width="7" height="7" />
        <rect x="17" y="3" width="5" height="18" />
      </svg>
    ),
  },
  {
    to: "/platforms",
    label: "Platforms",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    to: "/stats",
    label: "Stats",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { logout } = useAuth();

  return (
    <nav
      style={{
        position: "fixed",
        left: 0, top: 0, bottom: 0,
        width: "var(--sidebar-w)",
        background: "var(--gh-bg2)",
        borderRight: "1px solid var(--gh-border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 0",
        gap: "4px",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px",
          fontWeight: 800,
          letterSpacing: "2px",
          color: "var(--gh-cyan)",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          marginBottom: "24px",
          textShadow: "0 0 20px var(--gh-cyan-glow)",
        }}
      >
        GH
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          style={({ isActive }) => ({
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isActive ? "var(--gh-cyan)" : "var(--gh-text3)",
            background: isActive ? "var(--gh-surface)" : "transparent",
            transition: "all var(--transition)",
            position: "relative",
          })}
        >
          {({ isActive }) => (
            <>
              {item.icon}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    right: "-9px",
                    width: "3px",
                    height: "24px",
                    background: "var(--gh-cyan)",
                    borderRadius: "2px",
                    boxShadow: "0 0 8px var(--gh-cyan)",
                  }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Logout */}
      <button
        onClick={logout}
        title="Sign out"
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--gh-text3)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          transition: "all var(--transition)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--gh-pink)";
          (e.currentTarget as HTMLElement).style.background = "var(--gh-surface)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--gh-text3)";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </nav>
  );
}
