import { useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { useLibraryStore } from "../../stores/ui.ts";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.ts";

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

export function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  const { filters, setFilter } = useLibraryStore();

  const title = PAGE_TITLES[location.pathname] ?? "GAMERS HUB";
  const isLibrary = location.pathname === "/library";

  const handleSearch = useDebouncedCallback((value: string) => {
    setFilter("search", value || undefined);
  }, 300);

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "GH";

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

      {/* Search */}
      {isLibrary && (
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--gh-text3)",
              fontSize: "14px",
              pointerEvents: "none",
            }}
          >
            ⌕
          </span>
          <input
            type="text"
            placeholder="Search games…"
            defaultValue={filters.search ?? ""}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              background: "var(--gh-surface)",
              border: "1px solid var(--gh-border2)",
              borderRadius: "10px",
              padding: "8px 16px 8px 36px",
              color: "var(--gh-text)",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              width: "220px",
              outline: "none",
              transition: "all var(--transition)",
            }}
          />
        </div>
      )}

      {/* User avatar */}
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--gh-purple), var(--gh-pink))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    </header>
  );
}
