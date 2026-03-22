import { useNavigate } from "react-router-dom";
import type { UserGame } from "@gamers-hub/types";
import { getPlatform } from "../../lib/platforms.ts";

export function GameListRow({ game }: { game: UserGame }) {
  const navigate = useNavigate();
  const platform = getPlatform(game.platform);
  const progressColor = getProgressColor(game.completionPct);

  return (
    <div
      className="gh-card gh-card-hover"
      onClick={() => {
        sessionStorage.setItem("library-scroll", String(window.scrollY));
        navigate(`/library/${game.id}`);
      }}
      style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px", cursor: "pointer" }}
    >
      {/* Mini cover */}
      <div
        style={{
          width: "48px",
          height: "64px",
          flexShrink: 0,
          borderRadius: "8px",
          overflow: "hidden",
          background: "var(--gh-surface2)",
        }}
      >
        {game.game.coverUrl ? (
          <img
            src={game.game.coverUrl}
            alt={game.game.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            🎮
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--gh-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {game.game.title}
          </span>
          {getBadgeLabel(game.status) && (
            <span
              className={getBadgeClass(game.status)}
              style={{
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "10px",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "0.5px",
                flexShrink: 0,
              }}
            >
              {getBadgeLabel(game.status)}
            </span>
          )}
          <span style={{ fontSize: "16px", color: platform.color, flexShrink: 0 }}>
            {platform.emoji}
          </span>
        </div>

        <div style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "6px" }}>
          {game.game.genres[0] ?? "—"} • {game.hoursPlayed}h played
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="progress-track" style={{ flex: 1 }}>
            <div
              className="progress-fill"
              style={{ width: `${game.completionPct}%`, background: progressColor }}
            />
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "var(--gh-text3)",
              fontFamily: "var(--font-display)",
              flexShrink: 0,
            }}
          >
            {Math.round(game.completionPct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "var(--gh-green)";
  if (pct >= 60) return "var(--gh-cyan)";
  if (pct >= 30) return "var(--gh-purple)";
  return "var(--gh-pink)";
}

function getBadgeClass(status: UserGame["status"]): string {
  switch (status) {
    case "playing":   return "badge-playing";
    case "completed": return "badge-completed";
    case "wishlist":  return "badge-wishlist";
    case "dropped":   return "badge-dropped";
    default:          return "";
  }
}

function getBadgeLabel(status: UserGame["status"]): string {
  switch (status) {
    case "playing":   return "▶ Playing";
    case "completed": return "✓ Done";
    case "wishlist":  return "♥";
    case "dropped":   return "✕ Dropped";
    default:          return "";
  }
}
