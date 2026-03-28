import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

const PLATFORMS = [
  { id: "twitter",  label: "X / Twitter", color: "#000000", maxChars: 280 },
  { id: "discord",  label: "Discord",     color: "#5865f2", maxChars: 2000 },
  { id: "telegram", label: "Telegram",    color: "#26a5e4", maxChars: 4096 },
  { id: "mastodon", label: "Mastodon",    color: "#6364ff", maxChars: 500 },
];

interface PublishResult { platform: string; success: boolean; externalId?: string; error?: string }
interface SocialHistory { id: string; platform: string; content: string; status: string; sentAt: string | null; error: string | null; createdAt: string }
interface Account { id: string; platform: string; name: string; active: boolean }

export default function AdminSocial() {
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(["discord"]));
  const [tab, setTab] = useState("twitter");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<PublishResult[]>([]);
  const [history, setHistory] = useState<SocialHistory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    void Promise.all([
      fetch(`${API}/api/v1/admin/social/accounts`, { credentials: "include" }).then((r) => r.json()).then((d) => setAccounts(d as Account[])).catch(() => undefined),
      fetch(`${API}/api/v1/admin/social/history`, { credentials: "include" }).then((r) => r.json()).then((d) => setHistory(d as SocialHistory[])).catch(() => undefined),
    ]);
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const pushAll = async () => {
    if (!content.trim()) { toast.error("Content is required"); return; }
    if (selected.size === 0) { toast.error("Select at least one platform"); return; }
    setState("loading");
    try {
      const res = await fetch(`${API}/api/v1/admin/social/publish`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platforms: [...selected] }),
      });
      const data = (await res.json()) as { results: PublishResult[] };
      setResults(data.results);
      setState("done");
      const ok = data.results.filter((r) => r.success).length;
      toast.success(`Published to ${ok}/${data.results.length} platforms`);
      const hist = await fetch(`${API}/api/v1/admin/social/history`, { credentials: "include" }).then((r) => r.json());
      setHistory(hist as SocialHistory[]);
    } catch (e) {
      toast.error("Publish failed");
      setState("idle");
    }
  };

  const activePlatform = PLATFORMS.find((p) => p.id === tab);
  const preview = content.slice(0, activePlatform?.maxChars ?? 280);

  return (
    <div style={{ padding: 32, color: "#fafafa", fontFamily: "system-ui, sans-serif", maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Social Publisher</h1>
      <p style={{ fontSize: 13, color: "#52525b", margin: "0 0 32px" }}>Push content to all platforms in one click.</p>

      {/* Compose */}
      <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compose</h2>
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setState("idle"); setResults([]); }}
          placeholder="What's happening in gaming..."
          style={{
            width: "100%", minHeight: 120, padding: "10px 14px",
            background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 8,
            color: "#fafafa", fontSize: 14, fontFamily: "inherit", resize: "vertical",
            boxSizing: "border-box", outline: "none", lineHeight: 1.6,
          }}
        />
        <p style={{ fontSize: 11, color: "#52525b", margin: "4px 0 0", textAlign: "right" }}>{content.length} chars</p>
      </div>

      {/* Platform select */}
      <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Platforms</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {PLATFORMS.map((p) => {
            const on = selected.has(p.id);
            const hasAccount = accounts.some((a) => a.platform === p.id && a.active);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                style={{
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${on ? p.color : "#3f3f46"}`,
                  background: on ? `${p.color}18` : "transparent",
                  color: on ? "#fafafa" : "#71717a",
                  fontSize: 13, fontWeight: on ? 600 : 400,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: hasAccount ? "#22c55e" : "#3f3f46" }} />
                {p.label}
                <span style={{ fontSize: 10, color: "#52525b" }}>/{p.maxChars}</span>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: "#3f3f46", margin: "8px 0 0" }}>Green dot = account configured</p>
      </div>

      {/* Preview */}
      {content && (
        <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {PLATFORMS.map((p) => (
              <button key={p.id} onClick={() => setTab(p.id)}
                style={{ padding: "4px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 12,
                  background: tab === p.id ? "#1c1c1f" : "transparent",
                  color: tab === p.id ? "#fafafa" : "#52525b" }}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid #1c1c1f", borderRadius: 8, padding: 14, fontSize: 13, color: "#e4e4e7", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            <span style={{ color: "#52525b", fontSize: 11, display: "block", marginBottom: 6 }}>@GamersHub · just now</span>
            {preview}
            {content.length > (activePlatform?.maxChars ?? 280) && <span style={{ color: "#f87171" }}> [truncated]</span>}
          </div>
        </div>
      )}

      {/* Push button */}
      <button
        onClick={() => void pushAll()}
        disabled={state === "loading"}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 10, border: "none", cursor: state === "loading" ? "wait" : "pointer",
          background: state === "done" ? "#059669" : state === "loading" ? "#4c1d95" : "#7c3aed",
          color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em",
          transition: "background 0.3s",
        }}>
        {state === "loading" ? "Publishing..." : state === "done" ? "✓ Published" : "⟁ PUSH TO ALL SELECTED"}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 20, marginTop: 16 }}>
          <h2 style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 12px" }}>Results</h2>
          {results.map((r) => (
            <div key={r.platform} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: r.success ? "#22c55e" : "#f87171" }}>{r.success ? "✓" : "✗"}</span>
              <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{r.platform}</span>
              <span style={{ color: "#52525b" }}>{r.success ? (r.externalId ? `ID: ${r.externalId}` : "Sent") : r.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 20, marginTop: 20 }}>
          <h2 style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 12px" }}>Recent History</h2>
          {history.slice(0, 10).map((h) => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: h.status === "sent" ? "#22c55e" : "#f87171", width: 12 }}>{h.status === "sent" ? "✓" : "✗"}</span>
              <span style={{ color: "#7c3aed", minWidth: 70 }}>{h.platform}</span>
              <span style={{ color: "#a1a1aa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.content.slice(0, 60)}…</span>
              {h.sentAt && <span style={{ color: "#3f3f46", flexShrink: 0 }}>{new Date(h.sentAt).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
