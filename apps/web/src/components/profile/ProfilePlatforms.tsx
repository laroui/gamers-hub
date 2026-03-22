import { useNavigate } from "react-router-dom";
import { usePlatforms } from "../../hooks/usePlatforms.ts";
import type { PlatformConnection } from "@gamers-hub/types";

const PLATFORM_LABELS: Record<string, string> = {
  steam: "Steam",
  psn: "PlayStation",
  xbox: "Xbox",
  epic: "Epic Games",
  gog: "GOG",
  nintendo: "Nintendo",
  ea: "EA App",
  ubisoft: "Ubisoft",
  battlenet: "Battle.net",
  gamepass: "Game Pass",
};

export function ProfilePlatforms() {
  const navigate = useNavigate();
  const { data: platforms, isLoading } = usePlatforms();

  const connected = (platforms ?? []) as unknown as Array<PlatformConnection & { gamesCount: number }>;

  return (
    <div className="gh-card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "1px",
            color: "var(--gh-text2)",
            textTransform: "uppercase",
          }}
        >
          Connected Platforms
        </h3>
        <button
          onClick={() => navigate("/platforms")}
          style={{
            background: "none",
            border: "1px solid var(--gh-border2)",
            borderRadius: "8px",
            padding: "4px 10px",
            color: "var(--gh-cyan)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
          }}
        >
          Manage
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
          ))}
        </div>
      ) : connected.length === 0 ? (
        <p style={{ color: "var(--gh-text3)", fontSize: "13px" }}>
          No platforms connected yet.{" "}
          <span
            style={{ color: "var(--gh-cyan)", cursor: "pointer" }}
            onClick={() => navigate("/platforms")}
          >
            Connect one
          </span>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {connected.map((p) => (
            <div
              key={p.platform}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--gh-surface2)",
                borderRadius: "8px",
                border: "1px solid var(--gh-border)",
              }}
            >
              <span style={{ color: "var(--gh-text)", fontSize: "13px", fontWeight: 500 }}>
                {PLATFORM_LABELS[p.platform] ?? p.platform}
              </span>
              <span style={{ color: "var(--gh-text3)", fontSize: "12px" }}>
                {p.gamesCount ?? 0} games
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
