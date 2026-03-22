import { useLibraryStore } from "../../stores/ui.ts";

const GENRES = [
  { label: "All",        value: undefined },
  { label: "RPG",        value: "RPG" },
  { label: "Action",     value: "Action" },
  { label: "FPS",        value: "FPS" },
  { label: "Strategy",   value: "Strategy" },
  { label: "Sports",     value: "Sports" },
  { label: "Adventure",  value: "Adventure" },
  { label: "Simulation", value: "Simulation" },
  { label: "Platform",   value: "Platform" },
] as const;

const SORT_OPTIONS = [
  { label: "Recent",      value: "recent" as const },
  { label: "A–Z",         value: "alpha" as const },
  { label: "Most Played", value: "hours" as const },
  { label: "Progress",    value: "progress" as const },
];

export function FilterBar() {
  const { filters, viewMode, setFilter, setViewMode } = useLibraryStore();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "20px",
        flexWrap: "wrap",
      }}
    >
      {/* Genre pills */}
      {GENRES.map((g) => {
        const active = filters.genre === g.value;
        return (
          <button
            key={g.label}
            onClick={() => setFilter("genre", g.value)}
            style={{
              background: active ? "var(--gh-cyan-dim)" : "var(--gh-surface)",
              border: `1px solid ${active ? "rgba(0,229,255,0.4)" : "var(--gh-border)"}`,
              borderRadius: "8px",
              padding: "6px 14px",
              color: active ? "var(--gh-cyan)" : "var(--gh-text2)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {g.label}
          </button>
        );
      })}

      {/* Sort dropdown */}
      <select
        value={filters.sort ?? "recent"}
        onChange={(e) =>
          setFilter("sort", e.target.value as "recent" | "alpha" | "hours" | "progress")
        }
        style={{
          marginLeft: "auto",
          background: "var(--gh-surface)",
          border: "1px solid var(--gh-border2)",
          borderRadius: "8px",
          padding: "7px 12px",
          color: "var(--gh-text2)",
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* View toggle */}
      <div
        style={{
          display: "flex",
          background: "var(--gh-surface)",
          border: "1px solid var(--gh-border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {(["grid", "list"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "7px 12px",
              background: viewMode === mode ? "var(--gh-surface2)" : "transparent",
              color: viewMode === mode ? "var(--gh-cyan)" : "var(--gh-text3)",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.15s",
            }}
          >
            {mode === "grid" ? "⊞" : "☰"}
          </button>
        ))}
      </div>
    </div>
  );
}
