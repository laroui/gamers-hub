import { useLibraryStatsOverview } from "../../hooks/useStats.ts";

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ color: "var(--gh-text3)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
        {label}
      </span>
      <span style={{ color: "var(--gh-text)", fontSize: "22px", fontFamily: "var(--font-display)", fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 6 }} />
    </div>
  );
}

export function ProfileStats() {
  const { data: stats, isLoading } = useLibraryStatsOverview();

  return (
    <div className="gh-card" style={{ padding: "20px" }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "1px",
          color: "var(--gh-text2)",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        Stats Overview
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
        }}
      >
        {isLoading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            <StatItem label="Total Games" value={stats?.totalGames ?? 0} />
            <StatItem
              label="Total Hours"
              value={`${Math.round(stats?.totalHours ?? 0)}h`}
            />
            <StatItem
              label="Completed"
              value={
                stats
                  ? `${stats.completedGames} (${Math.round(stats.completionRate)}%)`
                  : "0"
              }
            />
            <StatItem label="Currently Playing" value={stats?.currentlyPlaying ?? 0} />
          </>
        )}
      </div>
    </div>
  );
}
