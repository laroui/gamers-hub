import { useState } from "react";

const API = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/admin/verify-secret?token=${encodeURIComponent(secret)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Invalid admin token");
        return;
      }
      // Redirect to admin dashboard
      window.location.href = "/admin/dashboard";
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#09090b",
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
    }}>
      <div style={{
        width: 360, padding: "40px 32px",
        background: "#111113", border: "1px solid #27272a", borderRadius: 12,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 6V10L8 14L2 10V6L8 2Z" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <span style={{ color: "#fafafa", fontWeight: 600, fontSize: 15 }}>GH Admin</span>
        </div>

        <p style={{ color: "#71717a", fontSize: 12, marginBottom: 24, lineHeight: 1.6, margin: "0 0 24px" }}>
          Restricted access. Enter your admin token to continue.
        </p>

        <input
          type="password"
          placeholder="Admin token"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "10px 14px",
            background: "#1c1c1f", border: "1px solid #3f3f46",
            borderRadius: 8, color: "#fafafa", fontSize: 13,
            fontFamily: "inherit", boxSizing: "border-box", outline: "none",
          }}
        />

        {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", marginTop: 16, padding: "10px 0",
            background: loading ? "#4c1d95" : "#7c3aed",
            border: "none", borderRadius: 8, color: "white",
            fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "background 0.15s",
          }}
        >
          {loading ? "Verifying..." : "Continue →"}
        </button>
      </div>
    </div>
  );
}
