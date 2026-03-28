import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

interface Overview {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalLibraryItems: number;
  totalArticles: number;
  newUsersThisWeek: number;
}

interface SignupPoint { date: string; count: number }
interface RecentUser { id: string; email: string; username: string; role: string; createdAt: string }
interface AuditLog { id: string; adminUsername: string; action: string; targetType: string | null; targetId: string | null; createdAt: string }

const KPI_CONFIG = [
  { key: "totalUsers",       label: "Total users",     color: "#7c3aed", icon: "⊙" },
  { key: "totalPosts",       label: "Community posts", color: "#2563eb", icon: "✎" },
  { key: "totalArticles",    label: "News articles",   color: "#059669", icon: "◈" },
  { key: "newUsersThisWeek", label: "New this week",   color: "#d97706", icon: "↑" },
] as const;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [signups, setSignups] = useState<SignupPoint[]>([]);
  const [activity, setActivity] = useState<RecentUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [ov, sg, ac, al] = await Promise.all([
        fetch(`${API}/api/v1/admin/analytics/overview`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/api/v1/admin/analytics/signups?days=30`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/api/v1/admin/analytics/activity`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/api/v1/admin/analytics/audit-logs`, { credentials: "include" }).then((r) => r.json()),
      ]);
      setOverview(ov as Overview);
      setSignups(Array.isArray(sg) ? (sg as SignupPoint[]) : []);
      setActivity((ac as { recentUsers?: RecentUser[] }).recentUsers ?? []);
      setAuditLogs(Array.isArray(al) ? (al as AuditLog[]).slice(0, 10) : []);
      setLastUpdated(new Date());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => void fetchAll(), 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const card = (style?: React.CSSProperties) => ({
    background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, ...style,
  });

  return (
    <div style={{ padding: 32, color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "#52525b", margin: "4px 0 0" }}>
            Live · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", padding: "4px 10px", borderRadius: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {KPI_CONFIG.map(({ key, label, color, icon }) => (
          <div key={key} style={{ ...card(), padding: "20px 20px 16px", borderTop: `2px solid ${color}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              <span style={{ fontSize: 18, color }}>{icon}</span>
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#fafafa", fontVariantNumeric: "tabular-nums" }}>
              {overview ? ((overview as unknown as Record<string, number>)[key] ?? 0).toLocaleString() : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + Recent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, marginBottom: 24 }}>
        {/* Signups chart */}
        <div style={{ ...card(), padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 20px", color: "#a1a1aa" }}>Signups — 30 days</h2>
          {signups.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={signups} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "#3f3f46", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fill: "#3f3f46", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "#a1a1aa" }} itemStyle={{ color: "#7c3aed" }} />
                <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#3f3f46", fontSize: 13 }}>
              No signup data yet
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div style={{ ...card(), padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 16px", color: "#a1a1aa" }}>Recent signups</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activity.slice(0, 6).map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#a1a1aa", flexShrink: 0 }}>
                  {u.email[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#3f3f46" }}>{timeAgo(u.createdAt)}</p>
                </div>
                {u.role === "admin" && (
                  <span style={{ fontSize: 9, background: "rgba(79,70,229,0.13)", color: "#7c3aed", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>ADMIN</span>
                )}
              </div>
            ))}
            {activity.length === 0 && <p style={{ fontSize: 12, color: "#3f3f46" }}>No recent signups</p>}
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div style={{ ...card(), padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: "0 0 16px", color: "#a1a1aa" }}>Recent Admin Actions</h2>
        {auditLogs.length === 0 ? (
          <p style={{ fontSize: 12, color: "#3f3f46" }}>No admin actions yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                <span style={{ color: "#3f3f46", width: 90, flexShrink: 0 }}>{timeAgo(log.createdAt)}</span>
                <span style={{ color: "#7c3aed", fontFamily: "monospace", fontSize: 11 }}>{log.action}</span>
                <span style={{ color: "#52525b" }}>by {log.adminUsername}</span>
                {log.targetId && <span style={{ color: "#3f3f46", fontFamily: "monospace" }}>{log.targetType}:{log.targetId.slice(0, 8)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
