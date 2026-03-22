import { useState } from "react";
import { OverviewCards } from "../components/stats/OverviewCards.tsx";
import { WeeklyChart } from "../components/stats/WeeklyChart.tsx";
import { PlatformDonut } from "../components/stats/PlatformDonut.tsx";
import { GenreChart } from "../components/stats/GenreChart.tsx";
import { PlayHeatmap } from "../components/stats/PlayHeatmap.tsx";
import { StreakPills } from "../components/stats/StreakPills.tsx";
import { WrappedCard } from "../components/stats/WrappedCard.tsx";
import { useIsMobile } from "../hooks/useIsMobile.ts";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2];

// Section header helper
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "13px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "var(--gh-text3)",
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "12px", color: "var(--gh-text3)", marginTop: "2px" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function StatsPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const isMobile = useIsMobile();

  return (
    <div className="page-enter" style={{ maxWidth: "1200px" }}>
      {/* Page header + year selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 800,
            color: "var(--gh-text)",
            letterSpacing: "1px",
          }}
        >
          STATISTICS
        </h1>
        <div style={{ display: "flex", gap: "6px" }}>
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                background: selectedYear === y ? "var(--gh-cyan-dim)" : "var(--gh-surface)",
                border: `1px solid ${selectedYear === y ? "rgba(0,229,255,0.4)" : "var(--gh-border)"}`,
                color: selectedYear === y ? "var(--gh-cyan)" : "var(--gh-text3)",
                fontFamily: "var(--font-display)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Overview cards */}
      <OverviewCards />

      {/* Streaks */}
      <section style={{ marginBottom: "32px" }}>
        <SectionHeader title="Streaks" />
        <StreakPills />
      </section>

      {/* Charts — two column (or single on mobile) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
          gap: "24px",
          marginBottom: "32px",
          alignItems: "start",
        }}
      >
        <section>
          <SectionHeader title="Weekly Playtime" subtitle="Last 12 weeks" />
          <div className="gh-card" style={{ padding: "20px" }}>
            <WeeklyChart />
          </div>
        </section>

        <section>
          <SectionHeader title="By Platform" />
          <div className="gh-card" style={{ padding: "20px" }}>
            <PlatformDonut />
          </div>
        </section>
      </div>

      {/* Genre chart */}
      <section style={{ marginBottom: "32px" }}>
        <SectionHeader title="By Genre" subtitle="Top 8 genres by hours" />
        <div className="gh-card" style={{ padding: "20px" }}>
          <GenreChart />
        </div>
      </section>

      {/* Activity heatmap */}
      <section style={{ marginBottom: "32px" }}>
        <SectionHeader title="Activity" subtitle={`${selectedYear} play history`} />
        <div className="gh-card" style={{ padding: "20px" }}>
          <PlayHeatmap year={selectedYear} />
        </div>
      </section>

      {/* Wrapped */}
      <section style={{ marginBottom: "32px" }}>
        <SectionHeader title={`${selectedYear} Wrapped`} />
        <WrappedCard year={selectedYear} />
      </section>
    </div>
  );
}
