import { useLibraryStatsOverview } from "../../hooks/useStats.ts";
import { useCountUp } from "../../hooks/useCountUp.ts";

const CARDS = [
  {
    key: "totalHours" as const,
    label: "Total Hours",
    accent: "var(--gh-cyan)",
    format: (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)),
    sub: (s: any) => {
      const h = Math.round(s.deltaThisWeek.minutesPlayed / 60);
      return h > 0 ? `+${h}h this week` : "lifetime total";
    },
  },
  {
    key: "totalGames" as const,
    label: "Total Games",
    accent: "var(--gh-purple)",
    format: (n: number) => String(n),
    sub: (s: any) =>
      `${s.deltaThisWeek.newGames > 0 ? `+${s.deltaThisWeek.newGames} ` : ""}across all platforms`,
  },
  {
    key: "completionRate" as const,
    label: "Completion Rate",
    accent: "var(--gh-green)",
    format: (n: number) => `${n}%`,
    sub: (s: any) => `${s.completedGames} games finished`,
  },
  {
    key: "currentlyPlaying" as const,
    label: "Playing Now",
    accent: "var(--gh-pink)",
    format: (n: number) => String(n),
    sub: () => "active sessions",
  },
];

function StatCard({
  label,
  value,
  accent,
  sub,
  isLoading,
}: {
  label: string;
  value: number;
  accent: string;
  sub: string;
  isLoading: boolean;
}) {
  const animated = useCountUp(isLoading ? 0 : value);

  if (isLoading) {
    return <div className="gh-card skeleton" style={{ height: "96px" }} />;
  }

  return (
    <div
      className="gh-card"
      style={{
        padding: "20px",
        borderTop: `2px solid ${accent}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "var(--gh-text3)",
          fontFamily: "var(--font-display)",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "36px",
          fontWeight: 800,
          lineHeight: 1,
          color: accent,
          letterSpacing: "-1px",
        }}
      >
        {animated}
      </div>
      <div style={{ fontSize: "11px", color: "var(--gh-text3)", marginTop: "4px" }}>
        {sub}
      </div>
    </div>
  );
}

export function OverviewCards() {
  const { data: stats, isLoading } = useLibraryStatsOverview();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "14px",
        marginBottom: "32px",
      }}
    >
      {CARDS.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          value={stats?.[card.key] ?? 0}
          accent={card.accent}
          sub={stats ? card.sub(stats) : "—"}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
