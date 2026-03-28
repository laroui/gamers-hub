import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImageUrl: string | null;
  tag: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  draft:     { color: "#a1a1aa", bg: "#27272a" },
  published: { color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  archived:  { color: "#f87171", bg: "rgba(248,113,113,0.08)" },
};

const TAG_OPTIONS = ["news", "review", "release", "ai-generated"];

const EMPTY_FORM = { title: "", summary: "", content: "", coverImageUrl: "", tag: "news" };

export default function AdminPosts() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchArticles = async () => {
    try {
      const res = await fetch(`${API}/api/v1/admin/articles`, { credentials: "include" });
      const data = (await res.json()) as Article[];
      setArticles(data);
    } catch { toast.error("Failed to load articles"); }
  };

  useEffect(() => { void fetchArticles(); }, []);

  const selectArticle = (a: Article) => {
    setSelected(a);
    setForm({ title: a.title, summary: a.summary, content: a.content, coverImageUrl: a.coverImageUrl ?? "", tag: a.tag });
    setPreview(false);
  };

  const newArticle = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setPreview(false);
  };

  const save = async (publish = false) => {
    if (!form.title || !form.summary || !form.content) {
      toast.error("Title, summary, and content are required");
      return;
    }
    setLoading(true);
    try {
      const body = { ...form, coverImageUrl: form.coverImageUrl || null };
      let articleId = selected?.id;

      if (!articleId) {
        const res = await fetch(`${API}/api/v1/admin/articles`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as Article;
        articleId = data.id;
        toast.success("Article created");
      } else {
        await fetch(`${API}/api/v1/admin/articles/${articleId}`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast.success("Article saved");
      }

      if (publish && articleId) {
        await fetch(`${API}/api/v1/admin/articles/${articleId}/publish`, {
          method: "POST", credentials: "include",
        });
        toast.success("Article published!");
      }

      await fetchArticles();
    } catch { toast.error("Save failed"); }
    finally { setLoading(false); }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    await fetch(`${API}/api/v1/admin/articles/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Deleted");
    setSelected(null);
    setForm(EMPTY_FORM);
    await fetchArticles();
  };

  const publish = async (id: string) => {
    await fetch(`${API}/api/v1/admin/articles/${id}/publish`, { method: "POST", credentials: "include" });
    toast.success("Published!");
    await fetchArticles();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", background: "#1c1c1f",
    border: "1px solid #3f3f46", borderRadius: 6, color: "#fafafa",
    fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ display: "flex", height: "100vh", color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
      {/* Article list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid #1c1c1f", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 8px", borderBottom: "1px solid #1c1c1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Posts ({articles.length})</h2>
          <button onClick={newArticle} style={{ padding: "4px 10px", background: "#7c3aed", border: "none", borderRadius: 5, color: "#fff", fontSize: 12, cursor: "pointer" }}>+ New</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.map((a) => {
            const s = STATUS_STYLE[a.status] ?? STATUS_STYLE["draft"]!;
            return (
              <div
                key={a.id}
                onClick={() => selectArticle(a)}
                style={{
                  padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: selected?.id === a.id ? "#18181b" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: s.bg, color: s.color }}>
                    {a.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: "#3f3f46" }}>{a.tag}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#e4e4e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {a.status !== "published" && (
                    <button onClick={(e) => { e.stopPropagation(); void publish(a.id); }}
                      style={{ fontSize: 10, padding: "2px 6px", background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "none", borderRadius: 3, cursor: "pointer" }}>
                      Publish
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); void deleteArticle(a.id); }}
                    style={{ fontSize: 10, padding: "2px 6px", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "none", borderRadius: 3, cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {articles.length === 0 && (
            <p style={{ padding: 24, fontSize: 13, color: "#3f3f46", textAlign: "center" }}>No articles yet</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1c1c1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{selected ? "Edit Article" : "New Article"}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPreview(!preview)}
              style={{ padding: "6px 12px", background: preview ? "#3f3f46" : "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#a1a1aa", fontSize: 12, cursor: "pointer" }}>
              {preview ? "Edit" : "Preview"}
            </button>
            <button onClick={() => void save(false)} disabled={loading}
              style={{ padding: "6px 14px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#a1a1aa", fontSize: 12, cursor: "pointer" }}>
              Save Draft
            </button>
            <button onClick={() => void save(true)} disabled={loading}
              style={{ padding: "6px 14px", background: "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              {loading ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
            <select value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
              style={{ ...inputStyle, width: "auto", background: "#1c1c1f" }}>
              {TAG_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <input placeholder="Summary (1-2 sentences)" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} style={inputStyle} />
          <input placeholder="Cover image URL (optional)" value={form.coverImageUrl} onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))} style={inputStyle} />

          {preview ? (
            <div style={{ ...inputStyle, padding: 16, minHeight: 400, overflowY: "auto", lineHeight: 1.7 }}>
              <ReactMarkdown>{form.content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              placeholder="Content (Markdown)"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              style={{ ...inputStyle, minHeight: 400, resize: "vertical", fontFamily: '"JetBrains Mono", monospace', fontSize: 12, lineHeight: 1.6 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
