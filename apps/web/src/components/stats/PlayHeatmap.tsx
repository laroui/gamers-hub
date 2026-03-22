import { useState } from "react";
import { usePlayHeatmap } from "../../hooks/useStats.ts";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensityColor(minutes: number): string {
  if (minutes === 0) return "var(--gh-surface)";
  if (minutes <= 30) return "rgba(0,229,255,0.2)";
  if (minutes <= 60) return "rgba(0,229,255,0.4)";
  if (minutes <= 120) return "rgba(0,229,255,0.65)";
  return "var(--gh-cyan)";
}

function buildCalendarGrid(year: number, heatmap: Record<string, number>) {
  // Build array of 52+ weeks, each with 7 days
  const jan1 = new Date(year, 0, 1);
  // Start from the Monday before or on Jan 1
  const startDay = new Date(jan1);
  const dayOfWeek = jan1.getDay(); // 0=Sun, 1=Mon...
  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days back to reach Monday
  startDay.setDate(jan1.getDate() - daysBack);

  const weeks: { date: Date; minutes: number; inYear: boolean }[][] = [];
  const cursor = new Date(startDay);

  for (let w = 0; w < 53; w++) {
    const week: { date: Date; minutes: number; inYear: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10);
      week.push({
        date: new Date(cursor),
        minutes: heatmap[dateStr] ?? 0,
        inYear: cursor.getFullYear() === year,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function getMonthLabels(weeks: ReturnType<typeof buildCalendarGrid>) {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const month = week[0]!.date.getMonth();
    if (month !== lastMonth && week[0]!.inYear) {
      labels.push({ label: MONTHS[month]!, col });
      lastMonth = month;
    }
  });
  return labels;
}

export function PlayHeatmap({ year }: { year: number }) {
  const { data: heatmap = {}, isLoading } = usePlayHeatmap(year);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  if (isLoading) {
    return <div className="skeleton" style={{ height: "120px", borderRadius: "8px" }} />;
  }

  const weeks = buildCalendarGrid(year, heatmap);
  const monthLabels = getMonthLabels(weeks);

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      {/* Month labels row */}
      <div
        style={{
          display: "flex",
          paddingLeft: "24px",
          marginBottom: "4px",
          position: "relative",
          height: "16px",
        }}
      >
        {monthLabels.map(({ label, col }) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left: `${24 + col * 14}px`,
              fontSize: "10px",
              color: "var(--gh-text3)",
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "flex", gap: "0", alignItems: "flex-start" }}>
        {/* Day labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            marginRight: "4px",
            paddingTop: "0",
          }}
        >
          {DAYS.map((d, i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                fontSize: "9px",
                color: "var(--gh-text3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                // Only show M, W, F to avoid crowding
                opacity: [0, 2, 4].includes(i) ? 1 : 0,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div style={{ display: "flex", gap: "2px" }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    background: day.inYear ? getIntensityColor(day.minutes) : "transparent",
                    cursor: day.inYear && day.minutes > 0 ? "pointer" : "default",
                    transition: "transform 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!day.inYear) return;
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.3)";
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const hours = Math.floor(day.minutes / 60);
                    const mins = day.minutes % 60;
                    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                    const dateStr = day.date.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    });
                    setTooltip({
                      text:
                        day.minutes > 0
                          ? `${dateStr} — ${timeStr}`
                          : `${dateStr} — no sessions`,
                      x: rect.left + window.scrollX,
                      y: rect.top + window.scrollY - 28,
                    });
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    setTooltip(null);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Intensity legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "10px",
          justifyContent: "flex-end",
        }}
      >
        <span style={{ fontSize: "10px", color: "var(--gh-text3)" }}>Less</span>
        {[0, 30, 60, 120, 180].map((mins, i) => (
          <div
            key={i}
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "2px",
              background: getIntensityColor(mins),
              border: "1px solid var(--gh-border)",
            }}
          />
        ))}
        <span style={{ fontSize: "10px", color: "var(--gh-text3)" }}>More</span>
      </div>

      {/* Floating tooltip (portal-less — positioned fixed) */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            background: "var(--gh-surface2)",
            border: "1px solid var(--gh-border2)",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "11px",
            color: "var(--gh-text)",
            pointerEvents: "none",
            zIndex: 600,
            whiteSpace: "nowrap",
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
