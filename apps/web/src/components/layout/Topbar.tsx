import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { useLibraryStore } from "../../stores/ui.ts";
import { useSearchStore } from "../../stores/search.ts";

const PAGE_TITLES: Record<string, string> = {
  "/library": "MY LIBRARY",
  "/platforms": "MY PLATFORMS",
  "/stats": "STATISTICS",
  "/profile": "PROFILE",
};

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Playing", value: "playing" },
  { label: "Completed", value: "completed" },
  { label: "Wishlist", value: "wishlist" },
] as const;

function DropdownItem({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px", borderRadius: "8px",
        color: "var(--gh-text2)", fontSize: "13px",
        textDecoration: "none", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--gh-surface3)";
        (e.currentTarget as HTMLElement).style.color = "var(--gh-text)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = "var(--gh-text2)";
      }}
    >
      {children}
    </Link>
  );
}

export function Topbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { filters, setFilter } = useLibraryStore();
  const { open } = useSearchStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = PAGE_TITLES[location.pathname] ?? "GAMERS HUB";
  const isLibrary = location.pathname === "/library";

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "GH";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      style={{
        height: "60px",
        background: "var(--gh-bg2)",
        borderBottom: "1px solid var(--gh-border)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: "16px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Page title */}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "18px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: "var(--gh-text)",
          flex: isLibrary ? "0 0 auto" : "1",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>

      {/* Library status filters */}
      {isLibrary && (
        <div style={{ display: "flex", gap: "6px", flex: 1 }}>
          {STATUS_TABS.map((tab) => {
            const active = filters.status === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => setFilter("status", tab.value)}
                style={{
                  background: active ? "var(--gh-cyan-dim)" : "var(--gh-surface)",
                  border: `1px solid ${active ? "rgba(0,229,255,0.4)" : "var(--gh-border2)"}`,
                  borderRadius: "8px",
                  padding: "5px 14px",
                  color: active ? "var(--gh-cyan)" : "var(--gh-text2)",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all var(--transition)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Universal search trigger */}
      <button
        onClick={open}
        style={{
          background: "var(--gh-surface)",
          border: "1px solid var(--gh-border2)",
          borderRadius: "10px",
          padding: "7px 12px",
          color: "var(--gh-text3)",
          fontFamily: "var(--font-body)",
          fontSize: "13px",
          width: "220px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "all var(--transition)",
        }}
      >
        <span style={{ fontSize: "14px" }}>⌕</span>
        <span style={{ flex: 1, textAlign: "left" }}>Search games…</span>
        <kbd
          style={{
            background: "var(--gh-surface3)",
            border: "1px solid var(--gh-border)",
            borderRadius: "4px",
            padding: "1px 5px",
            fontSize: "11px",
            color: "var(--gh-text3)",
            fontFamily: "var(--font-body)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Notification bell */}
      <div style={{ position: "relative", cursor: "pointer" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="var(--gh-text3)" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>

      {/* Avatar + dropdown */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <div
          onClick={() => setDropdownOpen((prev) => !prev)}
          style={{
            width: "34px", height: "34px", borderRadius: "50%",
            overflow: "hidden",
            background: "linear-gradient(135deg, var(--gh-purple), var(--gh-pink))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700,
            cursor: "pointer", flexShrink: 0, userSelect: "none",
          }}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        {dropdownOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            background: "var(--gh-surface2)",
            border: "1px solid var(--gh-border2)",
            borderRadius: "12px",
            padding: "6px",
            minWidth: "160px",
            zIndex: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--gh-border)" }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--gh-text)" }}>
                {user?.username}
              </div>
              <div style={{ fontSize: "11px", color: "var(--gh-text3)", marginTop: "1px" }}>
                {user?.email}
              </div>
            </div>
            <DropdownItem to="/profile" onClick={() => setDropdownOpen(false)}>
              Profile
            </DropdownItem>
            <button
              onClick={() => { setDropdownOpen(false); void logout(); }}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", borderRadius: "8px",
                padding: "8px 12px", color: "var(--gh-pink)",
                fontFamily: "var(--font-body)", fontSize: "13px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
