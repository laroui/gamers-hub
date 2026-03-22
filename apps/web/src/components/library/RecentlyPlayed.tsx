import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { UserGame } from "@gamers-hub/types";
import { useRecentlyPlayed } from "../../hooks/useRecentlyPlayed.ts";
import { getPlatform } from "../../lib/platforms.ts";

function getProgressColor(pct: number): string {
  if (pct >= 100) return "var(--gh-green)";
  if (pct >= 60) return "var(--gh-cyan)";
  if (pct >= 30) return "var(--gh-purple)";
  return "var(--gh-pink)";
}

function RecentCard({ game }: { game: UserGame }) {
  const navigate = useNavigate();
  const platform = getPlatform(game.platform);
  const progressColor = getProgressColor(game.completionPct);
  const timeAgo = game.lastPlayedAt
    ? formatDistanceToNow(new Date(game.lastPlayedAt), { addSuffix: true })
    : "never";

  return (
    <div
      className="gh-card gh-card-hover"
      onClick={() => navigate(`/library/${game.id}`)}
      style={{
        width: "300px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px",
        cursor: "pointer",
      }}
    >
      {/* Cover */}
      <div
        style={{
          width: "54px",
          height: "72px",
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
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--gh-text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "4px",
          }}
        >
          {game.game.title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--gh-text3)", marginBottom: "8px" }}>
          {platform.emoji} {platform.name} · {timeAgo}
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${game.completionPct}%`, background: progressColor }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "5px",
            fontSize: "11px",
            color: "var(--gh-text3)",
            fontFamily: "var(--font-display)",
          }}
        >
          <span>{game.hoursPlayed}h</span>
          <span>{Math.round(game.completionPct)}%</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="gh-card"
      style={{
        width: "300px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px",
      }}
    >
      <div className="skeleton" style={{ width: "54px", height: "72px", borderRadius: "8px", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: "14px", borderRadius: "4px", marginBottom: "6px", width: "80%" }} />
        <div className="skeleton" style={{ height: "11px", borderRadius: "4px", marginBottom: "12px", width: "60%" }} />
        <div className="skeleton" style={{ height: "3px", borderRadius: "2px", width: "100%" }} />
      </div>
    </div>
  );
}

export function RecentlyPlayed() {
  const { data, isLoading } = useRecentlyPlayed(10);

  if (isLoading) {
    return (
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-display)",
            letterSpacing: "1px",
            color: "var(--gh-text3)",
            marginBottom: "12px",
          }}
        >
          RECENTLY PLAYED
        </div>
        <div
          className="hide-scrollbar"
          style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none" }}
        >
          {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        style={{
          fontSize: "11px",
          fontFamily: "var(--font-display)",
          letterSpacing: "1px",
          color: "var(--gh-text3)",
          marginBottom: "12px",
        }}
      >
        RECENTLY PLAYED
      </div>
      <div
        className="hide-scrollbar"
        style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none" }}
      >
        {data.map((game) => (
          <RecentCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
