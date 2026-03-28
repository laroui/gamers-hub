import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

interface TableInfo { name: string; estimatedCount: number }
interface DbStats { activeConnections: number; dbSize: string; allowedTables: string[] }
interface TableData { columns: string[]; rows: Record<string, unknown>[]; total: number; page: number; totalPages: number }

export default function AdminDatabase() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [data, setData] = useState<TableData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<Record<string, unknown> | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchMeta = async () => {
    const [t, s] = await Promise.all([
      fetch(`${API}/api/v1/admin/db/tables`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/v1/admin/db/stats`, { credentials: "include" }).then((r) => r.json()),
    ]);
    setTables(t as TableInfo[]);
    setStats(s as DbStats);
    setLastRefresh(new Date());
  };

  const fetchRows = useCallback(async (table: string, pg: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "20" });
      if (q) params.set("search", q);
      const res = await fetch(`${API}/api/v1/admin/db/tables/${table}/rows?${params}`, { credentials: "include" });
      const d = (await res.json()) as TableData;
      setData(d);
    } catch { toast.error("Failed to fetch rows"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchMeta(); }, []);

  useEffect(() => {
    if (activeTable) void fetchRows(activeTable, page, search);
  }, [activeTable, page, search, fetchRows]);

  const selectTable = (name: string) => {
    setActiveTable(name);
    setPage(1);
    setSearch("");
    setData(null);
  };

  return (
    <div style={{ display: "flex", height: "100vh", color: "#fafafa", fontFamily: '"JetBrains Mono", "Courier New", monospace', fontSize: 12 }}>
      {/* Drawer */}
      {drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "flex-end" }} onClick={() => setDrawer(null)}>
          <div style={{ width: 480, height: "100%", background: "#111113", borderLeft: "1px solid #1c1c1f", padding: 24, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, margin: 0, color: "#fafafa", fontFamily: "system-ui" }}>Row details</h2>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <pre style={{ fontSize: 11, color: "#a1a1aa", lineHeight: 1.7, margin: 0, overflowX: "auto" }}>
              {JSON.stringify(drawer, null, 2)}
            </pre>
            <button
              onClick={() => { void navigator.clipboard.writeText(JSON.stringify(drawer, null, 2)); toast.success("Copied!"); }}
              style={{ marginTop: 16, padding: "6px 12px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 5, color: "#a1a1aa", cursor: "pointer", fontSize: 11 }}>
              Copy as JSON
            </button>
          </div>
        </div>
      )}

      {/* Tables sidebar */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid #1c1c1f", display: "flex", flexDirection: "column" }}>
        {/* Stats */}
        {stats && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1c1c1f", fontSize: 11, color: "#52525b" }}>
            <div>{stats.dbSize}</div>
            <div>{stats.activeConnections} connections</div>
          </div>
        )}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid #1c1c1f", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#52525b" }}>TABLES</span>
          <button onClick={() => void fetchMeta()} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 10 }}>↻</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tables.map((t) => (
            <div key={t.name} onClick={() => selectTable(t.name)}
              style={{
                padding: "8px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between",
                background: activeTable === t.name ? "#18181b" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.03)",
              }}>
              <span style={{ color: activeTable === t.name ? "#fafafa" : "#71717a" }}>{t.name}</span>
              <span style={{ color: "#3f3f46" }}>{t.estimatedCount.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 14px", borderTop: "1px solid #1c1c1f", fontSize: 10, color: "#3f3f46" }}>
          {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Rows panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeTable ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#3f3f46", fontFamily: "system-ui" }}>
            Select a table to explore
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #1c1c1f", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#7c3aed", fontWeight: 600 }}>{activeTable}</span>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search..."
                style={{ flex: 1, maxWidth: 300, padding: "4px 10px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 5, color: "#fafafa", fontSize: 11, outline: "none", fontFamily: "inherit" }}
              />
              {data && <span style={{ color: "#52525b" }}>{data.total.toLocaleString()} rows</span>}
              {loading && <span style={{ color: "#3f3f46" }}>Loading...</span>}
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              {data && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#111113", zIndex: 1 }}>
                    <tr>
                      {data.columns.map((c) => (
                        <th key={c} style={{ padding: "8px 12px", textAlign: "left", color: "#52525b", borderBottom: "1px solid #1c1c1f", fontWeight: 500, whiteSpace: "nowrap" }}>{c}</th>
                      ))}
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid #1c1c1f" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, i) => (
                      <tr key={i} onClick={() => setDrawer(row)} style={{ cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#111113"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        {data.columns.map((c) => {
                          const val = row[c];
                          const str = val == null ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
                          return (
                            <td key={c} style={{ padding: "6px 12px", color: "#a1a1aa", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {str.length > 40 ? str.slice(0, 40) + "…" : str}
                            </td>
                          );
                        })}
                        <td style={{ padding: "6px 8px" }}>
                          <button onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(JSON.stringify(row)); toast.success("Copied!"); }}
                            style={{ background: "none", border: "none", color: "#3f3f46", cursor: "pointer", fontSize: 10 }}>⎘</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid #1c1c1f", display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: "4px 10px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 4, color: "#a1a1aa", cursor: "pointer" }}>← Prev</button>
                <span style={{ color: "#52525b" }}>Page {page}/{data.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  style={{ padding: "4px 10px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 4, color: "#a1a1aa", cursor: "pointer" }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
