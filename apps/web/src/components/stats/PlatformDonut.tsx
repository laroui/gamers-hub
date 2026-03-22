import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { usePlaytimeByPlatform } from "../../hooks/useStats.ts";
import { getPlatform } from "../../lib/platforms.ts";

export function PlatformDonut({ year }: { year: number }) {
  const { data = [], isLoading } = usePlaytimeByPlatform(year);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (isLoading) {
    return <div className="skeleton" style={{ height: "240px", borderRadius: "12px" }} />;
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          height: "240px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--gh-text3)",
          fontSize: "13px",
          border: "1px solid var(--gh-border)",
          borderRadius: "12px",
        }}
      >
        No platform data yet
      </div>
    );
  }

  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
  const topPlatform = data[0];

  const chartData = data.map((d) => ({
    name: getPlatform(d.platform).name,
    platform: d.platform,
    hours: d.hours,
    color: getPlatform(d.platform).color,
    pct: totalHours > 0 ? Math.round((d.hours / totalHours) * 100) : 0,
  }));

  return (
    <div>
      <div style={{ position: "relative", height: "200px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="hours"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              isAnimationActive
              animationDuration={600}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.platform}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  style={{
                    transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
                    transformOrigin: "center",
                    transition: "transform 0.15s, opacity 0.15s",
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div
                    style={{
                      background: "var(--gh-surface2)",
                      border: "1px solid var(--gh-border2)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ color: "var(--gh-text)", fontWeight: 600 }}>{d.name}</div>
                    <div style={{ color: "var(--gh-text3)" }}>
                      {d.hours}h · {d.pct}%
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        {topPlatform && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: "22px", color: getPlatform(topPlatform.platform).color }}>
              {getPlatform(topPlatform.platform).emoji}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "11px",
                color: "var(--gh-text3)",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              TOP
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
        {chartData.slice(0, 5).map((d) => (
          <div key={d.platform} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: d.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: "12px", color: "var(--gh-text2)" }}>{d.name}</span>
            <span style={{ fontSize: "12px", color: "var(--gh-text3)" }}>{d.hours}h</span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--gh-text3)",
                width: "32px",
                textAlign: "right",
              }}
            >
              {d.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
