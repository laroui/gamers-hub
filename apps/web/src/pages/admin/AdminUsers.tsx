import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  stats?: { posts: number; comments: number; libraryItems: number };
}

interface UsersResponse { users: User[]; total: number; page: number; totalPages: number }

const ROLE_STYLE: Record<string, { color: string; bg: string }> = {
  user:      { color: "#a1a1aa", bg: "#27272a" },
  admin:     { color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  moderator: { color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  banned:    { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

export default function AdminUsers() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detail, setDetail] = useState<User | null>(null);

  const fetchUsers = useCallback(async (pg: number, q: string, role: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "20" });
      if (q) params.set("search", q);
      if (role) params.set("role", role);
      const res = await fetch(`${API}/api/v1/admin/users?${params}`, { credentials: "include" });
      setData((await res.json()) as UsersResponse);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchUsers(page, search, roleFilter); }, [page, search, roleFilter, fetchUsers]);

  const changeRole = async (id: string, role: string) => {
    await fetch(`${API}/api/v1/admin/users/${id}/role`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    toast.success("Role updated");
    void fetchUsers(page, search, roleFilter);
  };

  const banUser = async (id: string) => {
    await fetch(`${API}/api/v1/admin/users/${id}/ban`, { method: "POST", credentials: "include" });
    toast.success("User banned");
    void fetchUsers(page, search, roleFilter);
  };

  const deleteUser = async (id: string) => {
    setConfirmDelete(null);
    await fetch(`${API}/api/v1/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("User deleted");
    void fetchUsers(page, search, roleFilter);
  };

  const viewDetail = async (id: string) => {
    const res = await fetch(`${API}/api/v1/admin/users/${id}`, { credentials: "include" });
    setDetail((await res.json()) as User);
  };

  return (
    <div style={{ padding: 32, color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
      {/* Confirm delete modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: 28, maxWidth: 360, width: "100%" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Delete user?</h3>
            <p style={{ color: "#71717a", fontSize: 13, margin: "0 0 20px" }}>This action is irreversible. All their data will be deleted.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => void deleteUser(confirmDelete)} style={{ flex: 1, padding: "8px", background: "#dc2626", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "8px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#a1a1aa", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* User detail drawer */}
      {detail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={() => setDetail(null)}>
          <div style={{ width: 380, background: "#111113", borderLeft: "1px solid #1c1c1f", padding: 24, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, margin: 0 }}>User Profile</h2>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#a1a1aa" }}>
                {detail.email[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{detail.username}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#52525b" }}>{detail.email}</p>
              </div>
            </div>
            {detail.stats && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[["Posts", detail.stats.posts], ["Comments", detail.stats.comments], ["Library", detail.stats.libraryItems]].map(([k, v]) => (
                  <div key={k as string} style={{ background: "#1c1c1f", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{v}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#52525b" }}>{k}</p>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 11, color: "#52525b" }}>Member since {new Date(detail.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Users</h1>
      <p style={{ fontSize: 13, color: "#52525b", margin: "0 0 24px" }}>Manage user accounts, roles, and access.</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email..."
          style={{ flex: 1, maxWidth: 300, padding: "8px 12px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none" }}
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#fafafa", fontSize: 13, outline: "none" }}>
          <option value="">All roles</option>
          {["user", "admin", "moderator", "banned"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {data && <span style={{ padding: "8px 0", fontSize: 13, color: "#52525b" }}>{data.total} users</span>}
        {loading && <span style={{ padding: "8px 0", fontSize: 13, color: "#3f3f46" }}>Loading…</span>}
      </div>

      {/* Table */}
      <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1c1c1f" }}>
              {["User", "Role", "Joined", "Actions"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "#52525b", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => {
              const s = ROLE_STYLE[u.role] ?? ROLE_STYLE["user"]!;
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#a1a1aa", flexShrink: 0 }}>
                        {u.email[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: "#fafafa" }}>{u.username}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: s.bg, color: s.color }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "#52525b" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => void viewDetail(u.id)}
                        style={{ padding: "3px 8px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 4, color: "#a1a1aa", fontSize: 11, cursor: "pointer" }}>View</button>
                      <select value={u.role} onChange={(e) => void changeRole(u.id, e.target.value)}
                        style={{ padding: "3px 8px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 4, color: "#a1a1aa", fontSize: 11, cursor: "pointer" }}>
                        {["user", "admin", "moderator"].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {u.role !== "banned" && (
                        <button onClick={() => void banUser(u.id)}
                          style={{ padding: "3px 8px", background: "rgba(248,113,113,0.1)", border: "none", borderRadius: 4, color: "#f87171", fontSize: 11, cursor: "pointer" }}>Ban</button>
                      )}
                      <button onClick={() => setConfirmDelete(u.id)}
                        style={{ padding: "3px 8px", background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 4, color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!data || data.users.length === 0) && (
          <p style={{ textAlign: "center", color: "#3f3f46", padding: 24, fontSize: 13 }}>No users found</p>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: "6px 14px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#a1a1aa", fontSize: 12, cursor: "pointer" }}>← Prev</button>
          <span style={{ color: "#52525b", fontSize: 13 }}>Page {page}/{data.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
            style={{ padding: "6px 14px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#a1a1aa", fontSize: 12, cursor: "pointer" }}>Next →</button>
        </div>
      )}
    </div>
  );
}
