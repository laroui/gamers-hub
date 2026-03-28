import { useState } from "react";
import toast from "react-hot-toast";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

const TYPES  = ["news brief", "game review", "weekly digest", "trending analysis"];
const TONES  = ["hype", "analytical", "casual", "clickbait"];
const LENGTHS = [
  { value: "short",  label: "Short (~150w)" },
  { value: "medium", label: "Medium (~300w)" },
  { value: "long",   label: "Long (~600w)" },
];

interface Generated { content: string; title: string; summary: string }

export default function AdminAIContent() {
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("news brief");
  const [tone, setTone] = useState("analytical");
  const [length, setLength] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  const webhookUrl = `${API}/api/v1/admin/ai/webhook`;

  const generate = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return; }
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/ai/generate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, type, tone, length }),
      });
      if (!res.ok) { const e = (await res.json()) as { error?: string }; throw new Error(e.error ?? "Generation failed"); }
      const data = (await res.json()) as Generated;
      setGenerated(data);
      setEditedContent(data.content);
      toast.success("Content generated!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async (publish = false) => {
    if (!generated || !editedContent) return;
    setSaving(true);
    try {
      const createRes = await fetch(`${API}/api/v1/admin/articles`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: generated.title, summary: generated.summary, content: editedContent, tag: "news" }),
      });
      const article = (await createRes.json()) as { id: string };

      if (publish) {
        await fetch(`${API}/api/v1/admin/articles/${article.id}/publish`, { method: "POST", credentials: "include" });
        toast.success("Published!");
      } else {
        toast.success("Saved as draft");
      }
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const selectStyle: React.CSSProperties = {
    padding: "8px 12px", background: "#1c1c1f", border: "1px solid #3f3f46",
    borderRadius: 6, color: "#fafafa", fontSize: 13, fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{ padding: 32, color: "#fafafa", fontFamily: "system-ui, sans-serif", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>AI Content</h1>
      <p style={{ fontSize: 13, color: "#52525b", margin: "0 0 32px" }}>Generate gaming content with AI, edit, and publish.</p>

      {/* Generator */}
      <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Generator</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={tone} onChange={(e) => setTone(e.target.value)} style={selectStyle}>
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={length} onChange={(e) => setLength(e.target.value)} style={selectStyle}>
            {LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <button onClick={() => void generate()} disabled={generating}
            style={{ padding: "8px 0", background: generating ? "#4c1d95" : "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {generating ? "Generating..." : "Generate with AI"}
          </button>
        </div>

        <input
          placeholder="Topic (e.g. 'Elden Ring DLC 2026', 'GTA VI release')"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void generate()}
          style={{ width: "100%", padding: "8px 12px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#fafafa", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {/* Generated content */}
      {generated && (
        <div style={{ background: "#111113", border: "1px solid #1c1c1f", borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "#52525b", margin: "0 0 4px" }}>TITLE</p>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#fafafa" }}>{generated.title}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: "#52525b", margin: "0 0 4px" }}>SUMMARY</p>
            <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0 }}>{generated.summary}</p>
          </div>
          <p style={{ fontSize: 11, color: "#52525b", margin: "0 0 8px" }}>CONTENT (editable)</p>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: "100%", minHeight: 300, padding: "10px 14px", background: "#0a0a0a", border: "1px solid #3f3f46", borderRadius: 8, color: "#e4e4e7", fontSize: 13, fontFamily: '"JetBrains Mono", monospace', resize: "vertical", boxSizing: "border-box", outline: "none", lineHeight: 1.7 }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={() => void saveDraft(false)} disabled={saving}
              style={{ padding: "8px 16px", background: "#1c1c1f", border: "1px solid #3f3f46", borderRadius: 6, color: "#a1a1aa", fontSize: 13, cursor: "pointer" }}>
              Save as Draft
            </button>
            <button onClick={() => void saveDraft(true)} disabled={saving}
              style={{ padding: "8px 16px", background: "#7c3aed", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Saving..." : "Publish + Push Social"}
            </button>
          </div>
        </div>
      )}

      {/* n8n Automation */}
      <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: 24, fontFamily: '"JetBrains Mono", monospace' }}>
        <h2 style={{ fontSize: 13, color: "#a1a1aa", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "system-ui, sans-serif" }}>
          n8n Automation Setup
        </h2>
        <pre style={{ fontSize: 11, color: "#71717a", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
{`1. Create workflow with trigger "Schedule" (e.g. every 6h)
2. Add HTTP Request node → OpenAI/Claude to generate content
3. Add HTTP Request node → our webhook:
   URL:    ${webhookUrl}
   Method: POST
   Header: X-Webhook-Secret: [your WEBHOOK_SECRET]
   Body:   { title, content, tag, autoPublish: false }
4. Post appears in Posts tab for review before publishing`}
        </pre>

        <div
          onClick={() => { void navigator.clipboard.writeText(webhookUrl); toast.success("Webhook URL copied!"); }}
          style={{ marginTop: 16, padding: "8px 12px", background: "#0a0a0a", border: "1px solid #3f3f46", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#7c3aed" }}>{webhookUrl}</span>
          <span style={{ fontSize: 10, color: "#52525b" }}>Click to copy</span>
        </div>
      </div>
    </div>
  );
}
