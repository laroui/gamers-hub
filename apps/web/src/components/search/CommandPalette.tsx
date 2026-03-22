import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "../../stores/search.ts";
import { useGlobalSearch, type SearchResult } from "../../hooks/useGlobalSearch.ts";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.ts";
import { Spinner } from "../ui/Spinner.tsx";
import { getPlatform } from "../../lib/platforms.ts";

const QUICK_ACTIONS = [
  { label: "Library", icon: "📚", path: "/library" },
  { label: "Platforms", icon: "🎮", path: "/platforms" },
  { label: "Stats", icon: "📊", path: "/stats" },
  { label: "Profile", icon: "👤", path: "/profile" },
] as const;

function StatusPill({ status }: { status: string }) {
  const styleMap: Record<string, { bg: string; color: string; border: string }> = {
    playing: {
      bg: "var(--gh-cyan-dim)",
      color: "var(--gh-cyan)",
      border: "rgba(0,229,255,0.3)",
    },
    completed: {
      bg: "var(--gh-green-dim)",
      color: "var(--gh-green)",
      border: "rgba(0,230,118,0.3)",
    },
    wishlist: {
      bg: "var(--gh-pink-dim)",
      color: "var(--gh-pink)",
      border: "rgba(255,64,129,0.3)",
    },
    dropped: {
      bg: "rgba(74,84,104,0.2)",
      color: "var(--gh-text3)",
      border: "var(--gh-border)",
    },
    library: {
      bg: "var(--gh-purple-dim)",
      color: "var(--gh-purple)",
      border: "rgba(124,77,255,0.3)",
    },
  };

  const s = styleMap[status] ?? styleMap["library"]!;

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function CatalogPill() {
  return (
    <span
      style={{
        background: "var(--gh-surface3)",
        color: "var(--gh-text2)",
        border: "1px solid var(--gh-border2)",
        borderRadius: "6px",
        padding: "2px 8px",
        fontSize: "10px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      Catalog
    </span>
  );
}

interface ResultRowProps {
  result: SearchResult;
  active: boolean;
  onHover: () => void;
  onClick: () => void;
}

function ResultRow({ result, active, onHover, onClick }: ResultRowProps) {
  const platform = result.platform ? getPlatform(result.platform) : null;

  let subtitle = "";
  if (result.type === "owned") {
    const parts: string[] = [];
    if (platform) parts.push(`${platform.emoji} ${platform.name}`);
    if (result.hoursPlayed !== undefined) parts.push(`${Math.round(result.hoursPlayed)}h`);
    subtitle = parts.join(" · ");
  } else {
    const parts: string[] = [];
    const firstGenre = result.genres[0];
    if (firstGenre) parts.push(firstGenre);
    if (result.releaseYear) parts.push(String(result.releaseYear));
    if (result.metacritic != null) parts.push(`MC ${result.metacritic}`);
    subtitle = parts.join(" · ");
  }

  return (
    <div
      onMouseEnter={onHover}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        cursor: "pointer",
        background: active ? "var(--gh-surface2)" : "transparent",
        transition: "background var(--transition)",
        borderRadius: "8px",
        margin: "0 8px",
      }}
    >
      {/* Cover thumbnail */}
      <div
        style={{
          width: "32px",
          height: "43px",
          borderRadius: "4px",
          overflow: "hidden",
          background: "var(--gh-surface3)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          "🎮"
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--gh-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {result.title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--gh-text3)",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Badge */}
      {result.type === "owned" && result.status ? (
        <StatusPill status={result.status} />
      ) : (
        <CatalogPill />
      )}
    </div>
  );
}

export function CommandPalette() {
  const { isOpen, query, setQuery, close, addRecentSearch, recentSearches, clearRecentSearches } =
    useSearchStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  const updateDebouncedQuery = useDebouncedCallback((q: string) => {
    setDebouncedQuery(q);
  }, 300);

  const { data, isFetching } = useGlobalSearch(debouncedQuery);

  const owned = data?.owned ?? [];
  const catalog = data?.catalog ?? [];
  const hasResults = owned.length > 0 || catalog.length > 0;
  const isSearching = query.length >= 2;

  // Auto-focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setActiveIndex(-1);
    }
  }, [isOpen]);

  const handleQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      updateDebouncedQuery(q);
      setActiveIndex(-1);
    },
    [setQuery, updateDebouncedQuery],
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      close();
      navigate(`/library/${result.id}`);
    },
    [addRecentSearch, close, navigate, query],
  );

  const handleQuickAction = useCallback(
    (path: string) => {
      close();
      navigate(path);
    },
    [close, navigate],
  );

  const handleRecentClick = useCallback(
    (search: string) => {
      setQuery(search);
      updateDebouncedQuery(search);
      setActiveIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    [setQuery, updateDebouncedQuery],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (!isSearching) {
        // Empty query mode: 0-3 = quick actions, 4+ = recent searches
        const total = QUICK_ACTIONS.length + recentSearches.length;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % total);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + total) % total);
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < QUICK_ACTIONS.length) {
            const action = QUICK_ACTIONS[activeIndex];
            if (action) handleQuickAction(action.path);
          } else if (activeIndex >= QUICK_ACTIONS.length) {
            const recentIdx = activeIndex - QUICK_ACTIONS.length;
            const recent = recentSearches[recentIdx];
            if (recent) handleRecentClick(recent);
          }
        }
      } else {
        // Search mode
        const allResults = [...owned, ...catalog];
        const total = allResults.length;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % Math.max(total, 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < allResults.length) {
            const selected = allResults[activeIndex];
            if (selected) handleSelect(selected);
          }
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isOpen,
    isSearching,
    activeIndex,
    owned,
    catalog,
    recentSearches,
    close,
    handleQuickAction,
    handleRecentClick,
    handleSelect,
  ]);

  if (!isOpen) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "80px",
      }}
    >
      {/* Palette box */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "600px",
          maxWidth: "calc(100vw - 32px)",
          borderRadius: "16px",
          background: "var(--gh-surface2)",
          border: "1px solid var(--gh-border2)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          maxHeight: "70vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "paletteIn 0.18s ease forwards",
        }}
      >
        {/* Search input row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px",
            borderBottom: "1px solid var(--gh-border)",
          }}
        >
          <span style={{ fontSize: "18px", flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search games…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--gh-text)",
              fontFamily: "var(--font-body)",
              fontSize: "16px",
            }}
          />
          {isFetching ? (
            <Spinner size={18} />
          ) : (
            <kbd
              style={{
                background: "var(--gh-surface3)",
                border: "1px solid var(--gh-border2)",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "11px",
                color: "var(--gh-text3)",
                fontFamily: "var(--font-body)",
                flexShrink: 0,
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Scrollable results area */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {!isSearching ? (
            <>
              {/* Quick Navigate grid */}
              <div style={{ padding: "4px 16px 8px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    color: "var(--gh-text3)",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  Quick Navigate
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                  }}
                >
                  {QUICK_ACTIONS.map((action, i) => (
                    <button
                      key={action.path}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => handleQuickAction(action.path)}
                      style={{
                        background: activeIndex === i ? "var(--gh-surface3)" : "var(--gh-surface)",
                        border: `1px solid ${activeIndex === i ? "var(--gh-border2)" : "var(--gh-border)"}`,
                        borderRadius: "10px",
                        padding: "12px 8px",
                        color: "var(--gh-text2)",
                        fontFamily: "var(--font-body)",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all var(--transition)",
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div style={{ padding: "4px 16px 4px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        color: "var(--gh-text3)",
                        textTransform: "uppercase",
                      }}
                    >
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--gh-text3)",
                        fontFamily: "var(--font-body)",
                        fontSize: "11px",
                        cursor: "pointer",
                        padding: "0",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((search, i) => {
                    const idx = QUICK_ACTIONS.length + i;
                    return (
                      <div
                        key={search}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleRecentClick(search)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 8px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: activeIndex === idx ? "var(--gh-surface3)" : "transparent",
                          transition: "background var(--transition)",
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "var(--gh-text3)" }}>⟳</span>
                        <span style={{ fontSize: "13px", color: "var(--gh-text2)" }}>{search}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Your library section */}
              {owned.length > 0 && (
                <div style={{ marginBottom: "4px" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "var(--gh-text3)",
                      textTransform: "uppercase",
                      padding: "4px 16px 6px",
                    }}
                  >
                    Your Library
                  </div>
                  {owned.map((result, i) => (
                    <ResultRow
                      key={result.id}
                      result={result}
                      active={activeIndex === i}
                      onHover={() => setActiveIndex(i)}
                      onClick={() => handleSelect(result)}
                    />
                  ))}
                </div>
              )}

              {/* Game catalog section */}
              {catalog.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "var(--gh-text3)",
                      textTransform: "uppercase",
                      padding: "4px 16px 6px",
                    }}
                  >
                    Game Catalog
                  </div>
                  {catalog.map((result, i) => (
                    <ResultRow
                      key={result.id}
                      result={result}
                      active={activeIndex === owned.length + i}
                      onHover={() => setActiveIndex(owned.length + i)}
                      onClick={() => handleSelect(result)}
                    />
                  ))}
                </div>
              )}

              {/* No results fallback */}
              {!isFetching && !hasResults && debouncedQuery.length >= 2 && (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--gh-text3)",
                    fontSize: "13px",
                  }}
                >
                  No results for "{debouncedQuery}"
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid var(--gh-border)",
            padding: "8px 16px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
          }}
        >
          {[
            { keys: ["↑", "↓"], label: "navigate" },
            { keys: ["↵"], label: "select" },
            { keys: ["⌘", "K"], label: "close" },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {keys.map((k) => (
                <kbd
                  key={k}
                  style={{
                    background: "var(--gh-surface3)",
                    border: "1px solid var(--gh-border2)",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "11px",
                    color: "var(--gh-text3)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {k}
                </kbd>
              ))}
              <span style={{ fontSize: "11px", color: "var(--gh-text3)", marginLeft: "4px" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
