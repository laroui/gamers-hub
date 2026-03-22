import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWeeklyPlaytime } from "../../hooks/useStats.ts";

// Parse "2026-W12" → "Mar W1" style label
function formatWeekLabel(week: string): string {
  const [yearStr, weekPart] = week.split("-W");
  const year = parseInt(yearStr ?? "2026");
  const weekNum = parseInt(weekPart ?? "1");

  // Get approximate date from ISO week number
  const jan4 = new Date(year, 0, 4); // Jan 4 is always in week 1
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - jan4.getDay() + 1); // Monday
  const targetDate = new Date(startOfWeek1);
  targetDate.setDate(startOfWeek1.getDate() + (weekNum - 1) * 7);

  const month = targetDate.toLocaleString("en-US", { month: "short" });
  const weekInMonth = Math.ceil(targetDate.getDate() / 7);
  return `${month} W${weekInMonth}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const hours = (payload[0]?.value / 60).toFixed(1);
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
      <div style={{ color: "var(--gh-text3)", marginBottom: "2px" }}>{label}</div>
      <div style={{ color: "var(--gh-cyan)", fontWeight: 600 }}>{hours}h played</div>
      <div style={{ color: "var(--gh-text3)" }}>{payload[1]?.value ?? 0} games</div>
    </div>
  );
}

export function WeeklyChart({ year }: { year: number }) {
  const { data = [], isLoading } = useWeeklyPlaytime(year);

  const chartData = data.map((w) => ({
    week: formatWeekLabel(w.week),
    minutes: w.minutes,
    games: w.games,
  }));

  if (isLoading) {
    return <div className="skeleton" style={{ height: "200px", borderRadius: "12px" }} />;
  }

  if (chartData.length === 0) {
    return (
      <div
        style={{
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--gh-text3)",
          fontSize: "13px",
          border: "1px solid var(--gh-border)",
          borderRadius: "12px",
        }}
      >
        No play sessions recorded for {year}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="week"
          tick={{ fill: "#4a5468", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v / 60)}h`}
          tick={{ fill: "#4a5468", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke="#00e5ff"
          strokeWidth={2}
          fill="url(#cyanGradient)"
          dot={{ fill: "#00e5ff", r: 3, strokeWidth: 0 }}
          activeDot={{ fill: "#00e5ff", r: 5, strokeWidth: 0 }}
          isAnimationActive
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
