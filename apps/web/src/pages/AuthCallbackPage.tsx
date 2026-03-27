import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthProvider.tsx";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (error || !token) {
      navigate("/login?error=" + (error ?? "unknown"), { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate("/library", { replace: true }))
      .catch(() => navigate("/login?error=auth_failed", { replace: true }));
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gh-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "48px",
          fontWeight: 800,
          letterSpacing: "4px",
          color: "var(--gh-cyan)",
          textShadow: "0 0 30px var(--gh-cyan-glow)",
        }}
      >
        GH
      </div>
      <div style={{ color: "var(--gh-text2)", fontSize: "14px" }}>Signing you in…</div>
    </div>
  );
}
