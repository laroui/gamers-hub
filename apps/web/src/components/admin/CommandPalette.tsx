import { useState, useEffect, useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";

const COMMANDS = [
  { id: "dashboard",   label: "Go to Dashboard",        path: "/admin/dashboard",   icon: "▦" },
  { id: "posts",       label: "Manage Posts",            path: "/admin/posts",       icon: "✎" },
  { id: "new-post",    label: "Create new post",         path: "/admin/posts?new=1", icon: "+" },
  { id: "social",      label: "Push to social",          path: "/admin/social",      icon: "⟁" },
  { id: "ai-content",  label: "Generate AI content",     path: "/admin/ai-content",  icon: "◈" },
  { id: "database",    label: "View database",           path: "/admin/database",    icon: "⊞" },
  { id: "users",       label: "Manage users",            path: "/admin/users",       icon: "⊙" },
  { id: "home",        label: "Back to site",            path: "/",                  icon: "←" },
];

let _setOpen: React.Dispatch<React.SetStateAction<boolean>> | null = null;

export function useAdminCommandPalette() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        _setOpen?.((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  _setOpen = setOpen;

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  const execute = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") { setSelected((s) => Math.min(s + 1, filtered.length - 1)); e.preventDefault(); }
      if (e.key === "ArrowUp")   { setSelected((s) => Math.max(s - 1, 0)); e.preventDefault(); }
      if (e.key === "Enter" && filtered[selected]) execute(filtered[selected]!.path);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, execute]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "20vh",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 480, background: "#111113",
          border: "1px solid #27272a", borderRadius: 12,
          overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #1c1c1f" }}>
          <span style={{ fontSize: 14, color: "#52525b" }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search commands..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fafafa", fontSize: 14, fontFamily: "inherit",
            }}
          />
          <span style={{ fontSize: 10, color: "#3f3f46", background: "#1c1c1f", padding: "2px 6px", borderRadius: 4 }}>ESC</span>
        </div>

        {/* Commands */}
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "#52525b", fontSize: 13, padding: "16px 0" }}>No commands found</p>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => execute(cmd.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 16px", cursor: "pointer",
                background: i === selected ? "#1c1c1f" : "transparent",
                transition: "background 0.1s",
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <span style={{ fontSize: 14, color: "#52525b", width: 20, textAlign: "center" }}>{cmd.icon}</span>
              <span style={{ fontSize: 13, color: "#e4e4e7" }}>{cmd.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
