import { usePlayStreaks } from "../../hooks/useStats.ts";

const PILLS = [
  { icon: "🔥", key: "current" as const, label: "Current Streak", unit: "days" },
  { icon: "🏆", key: "longest" as const, label: "Longest Streak", unit: "days" },
  { icon: "📅", key: "totalDays" as const, label: "Total Active Days", unit: "days" },
];

export function StreakPills() {
  const { data: streaks, isLoading } = usePlayStreaks();

  if (isLoading) {
    return (
      <div style={{ display: "flex", gap: "12px" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton gh-card" style={{ height: "72px", flex: 1 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {PILLS.map((pill) => {
        const value = streaks?.[pill.key] ?? 0;
        const isCurrentStreak = pill.key === "current" && value > 0;
        return (
          <div
            key={pill.key}
            className="gh-card"
            style={{
              flex: "1 1 140px",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              borderColor: isCurrentStreak ? "rgba(0,229,255,0.3)" : "var(--gh-border)",
            }}
          >
            <span style={{ fontSize: "24px", lineHeight: 1 }}>{pill.icon}</span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "24px",
                  fontWeight: 800,
                  color: isCurrentStreak ? "var(--gh-cyan)" : "var(--gh-text)",
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: "11px", color: "var(--gh-text3)", marginTop: "2px" }}>
                {pill.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
