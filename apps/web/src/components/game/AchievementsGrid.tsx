import type { Achievement } from "@gamers-hub/types";
import { formatDistanceToNow } from "date-fns";

interface AchievementsGridProps {
  achievements: Achievement[];
  earned: number;
  total: number;
  isLoading: boolean;
}

function getRarityStyle(pct: number | null): { label: string; color: string } {
  if (!pct) return { label: "", color: "var(--gh-text3)" };
  if (pct < 5)  return { label: "GOLD",   color: "#ffd700" };
  if (pct < 20) return { label: "SILVER", color: "#c0c0c0" };
  if (pct < 50) return { label: "BRONZE", color: "#cd7f32" };
  return { label: "", color: "var(--gh-text3)" };
}

export function AchievementsGrid({ achievements, earned, total, isLoading }: AchievementsGridProps) {
  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="skeleton" style={{ width: "48px", height: "48px", borderRadius: "10px" }} />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <p style={{ fontSize: "13px", color: "var(--gh-text3)", fontStyle: "italic" }}>
        No achievements data available for this game.
      </p>
    );
  }

  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "12px",
      }}>
        <span style={{ fontSize: "13px", color: "var(--gh-text2)" }}>
          <span style={{ color: "var(--gh-cyan)", fontWeight: 600 }}>{earned}</span>
          {" / "}{total} achievements
        </span>
        <span style={{ fontSize: "12px", color: "var(--gh-text3)" }}>{pct}%</span>
      </div>

      <div className="progress-track" style={{ marginBottom: "16px" }}>
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: pct >= 100 ? "var(--gh-green)" : "var(--gh-cyan)",
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 48px)", gap: "8px" }}>
        {achievements.map((a) => {
          const rarity = getRarityStyle(a.rarityPct);
          const tooltipParts = [
            a.title,
            a.description ?? "",
            a.earnedAt
              ? "Unlocked: " + formatDistanceToNow(new Date(a.earnedAt), { addSuffix: true })
              : "",
            a.rarityPct != null ? "Rarity: " + a.rarityPct.toFixed(1) + "%" : "",
          ].filter(Boolean);
          return (
            <div
              key={a.id}
              title={tooltipParts.join("\n")}
              style={{
                width: "48px", height: "48px",
                borderRadius: "10px",
                overflow: "hidden",
                position: "relative",
                opacity: a.isEarned ? 1 : 0.35,
                filter: a.isEarned ? "none" : "grayscale(100%)",
                cursor: "help",
                background: "var(--gh-surface2)",
                border: a.isEarned ? `1px solid ${rarity.color}33` : "1px solid var(--gh-border)",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {a.iconUrl ? (
                <img
                  src={a.iconUrl}
                  alt={a.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px",
                }}>
                  🏆
                </div>
              )}
              {a.isEarned && rarity.label && (
                <div style={{
                  position: "absolute", bottom: "2px", right: "2px",
                  width: "8px", height: "8px",
                  borderRadius: "50%",
                  background: rarity.color,
                  boxShadow: `0 0 4px ${rarity.color}`,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
