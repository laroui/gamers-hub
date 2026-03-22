import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { usePlaytimeByGenre } from "../../hooks/useStats.ts";

export function GenreChart() {
  const { data = [], isLoading } = usePlaytimeByGenre();

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
        No genre data yet
      </div>
    );
  }

  const chartData = data.slice(0, 8).map((d) => ({
    genre: d.genre,
    hours: d.hours,
  }));

  // Generate a color gradient from purple to cyan across bars
  const colors = chartData.map((_, i) => {
    const t = chartData.length > 1 ? i / (chartData.length - 1) : 0;
    // Interpolate: #7c4dff (purple) → #00e5ff (cyan)
    const r = Math.round(124 + (0 - 124) * t);
    const g = Math.round(77 + (229 - 77) * t);
    const b = Math.round(255 + (255 - 255) * t);
    return `rgb(${r},${g},${b})`;
  });

  const maxHours = Math.max(...chartData.map((d) => d.hours));

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
        barSize={18}
      >
        <XAxis type="number" hide domain={[0, maxHours * 1.15]} />
        <YAxis
          type="category"
          dataKey="genre"
          width={80}
          tick={{ fill: "#8892aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
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
                <div style={{ color: "var(--gh-text)" }}>{payload[0]?.payload?.genre}</div>
                <div style={{ color: "var(--gh-text3)" }}>{payload[0]?.value}h played</div>
              </div>
            );
          }}
        />
        <Bar dataKey="hours" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={600}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={colors[index]} />
          ))}
          <LabelList
            dataKey="hours"
            position="right"
            style={{ fill: "#4a5468", fontSize: 11 }}
            formatter={(v: number) => `${v}h`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
