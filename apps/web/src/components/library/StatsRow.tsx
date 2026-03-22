import { useState, useEffect } from "react";
import type { LibraryStats } from "@gamers-hub/types";
import { useLibraryStats } from "../../hooks/useLibraryStats.ts";

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

interface StatCardDef {
  key: keyof Pick<LibraryStats, "totalGames" | "currentlyPlaying" | "completedGames" | "totalHours">;
  label: string;
  accent: string;
  format: (n: number) => string;
  delta: (s: LibraryStats) => string;
}

const STAT_CARDS: StatCardDef[] = [
  {
    key: "totalGames",
    label: "Total Games",
    accent: "var(--gh-cyan)",
    format: (n) => n.toString(),
    delta: (s) =>
      s.deltaThisWeek.newGames > 0
        ? `+${s.deltaThisWeek.newGames} this week`
        : "across all platforms",
  },
  {
    key: "currentlyPlaying",
    label: "Playing Now",
    accent: "var(--gh-purple)",
    format: (n) => n.toString(),
    delta: () => "active sessions",
  },
  {
    key: "completedGames",
    label: "Completed",
    accent: "var(--gh-green)",
    format: (n) => n.toString(),
    delta: (s) => `${s.completionRate}% completion rate`,
  },
  {
    key: "totalHours",
    label: "Hours Played",
    accent: "var(--gh-pink)",
    format: (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString()),
    delta: (s) => {
      const h = Math.round(s.deltaThisWeek.minutesPlayed / 60);
      return h > 0 ? `+${h}h this week` : "total lifetime";
    },
  },
];

function StatCard({ def, stats }: { def: StatCardDef; stats: LibraryStats }) {
  const raw = stats[def.key];
  const animated = useCountUp(raw);
  return (
    <div
      className="gh-card"
      style={{ padding: "18px 20px", borderLeft: `3px solid ${def.accent}` }}
    >
      <div
        style={{
          fontSize: "28px",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          color: def.accent,
          lineHeight: 1,
        }}
      >
        {def.format(animated)}
      </div>
      <div style={{ fontSize: "11px", color: "var(--gh-text2)", marginTop: "4px", letterSpacing: "0.5px" }}>
        {def.label.toUpperCase()}
      </div>
      <div style={{ fontSize: "11px", color: "var(--gh-text3)", marginTop: "6px" }}>
        {def.delta(stats)}
      </div>
    </div>
  );
}

export function StatsRow() {
  const { data: stats, isLoading } = useLibraryStats();

  if (isLoading || !stats) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="gh-card skeleton" style={{ height: "90px" }} />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        marginBottom: "32px",
      }}
    >
      {STAT_CARDS.map((def) => (
        <StatCard key={def.key} def={def} stats={stats} />
      ))}
    </div>
  );
}
