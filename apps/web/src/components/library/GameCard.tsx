import { useNavigate } from "react-router-dom";
import type { UserGame } from "@gamers-hub/types";
import { getPlatform } from "../../lib/platforms.ts";
import clsx from "clsx";

interface GameCardProps {
  game: UserGame;
}

export function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate();
  const platform = getPlatform(game.platform);
  const progressColor = getProgressColor(game.completionPct);
  const badgeClass = getBadgeClass(game.status);
  const badgeLabel = getBadgeLabel(game.status);

  return (
    <div
      className="gh-card gh-card-hover"
      onClick={() => navigate(`/library/${game.id}`)}
      style={{ cursor: "pointer", overflow: "hidden" }}
    >
      {/* Cover */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "3/4",
            background: game.game.coverUrl
              ? undefined
              : "linear-gradient(145deg, var(--gh-surface2), var(--gh-bg))",
            overflow: "hidden",
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
                fontSize: "40px",
              }}
            >
              🎮
            </div>
          )}
        </div>

        {/* Status badge — top right */}
        {badgeLabel && (
          <div
            className={clsx(badgeClass)}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              padding: "3px 8px",
              borderRadius: "6px",
              fontSize: "10px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            {badgeLabel}
          </div>
        )}

        {/* Platform badge — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            color: platform.color,
            backdropFilter: "blur(4px)",
          }}
        >
          {platform.emoji}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "12px 12px 10px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.3px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "4px",
            color: "var(--gh-text)",
          }}
        >
          {game.game.title}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "10px",
              color: "var(--gh-text3)",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {game.game.genres[0] ?? "—"}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "var(--gh-text2)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
            }}
          >
            {game.hoursPlayed}h
          </span>
        </div>

        {/* Progress bar */}
        <div className="progress-track" style={{ marginTop: "8px" }}>
          <div
            className="progress-fill"
            style={{ width: `${game.completionPct}%`, background: progressColor }}
          />
        </div>
      </div>
    </div>
  );
}

GameCard.Skeleton = function GameCardSkeleton() {
  return (
    <div className="gh-card" style={{ overflow: "hidden" }}>
      <div className="skeleton" style={{ aspectRatio: "3/4", width: "100%" }} />
      <div style={{ padding: "12px 12px 10px" }}>
        <div
          className="skeleton"
          style={{ height: "14px", borderRadius: "4px", marginBottom: "6px", width: "80%" }}
        />
        <div className="skeleton" style={{ height: "11px", borderRadius: "4px", width: "50%" }} />
        <div
          className="skeleton"
          style={{ height: "3px", borderRadius: "2px", marginTop: "8px", width: "100%" }}
        />
      </div>
    </div>
  );
};

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
