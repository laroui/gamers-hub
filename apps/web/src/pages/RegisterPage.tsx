import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthProvider.tsx";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, username, password);
      navigate("/library");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--gh-bg)",
      padding: "24px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "var(--gh-surface)",
        border: "1px solid var(--gh-border)",
        borderRadius: "16px",
        padding: "40px",
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            letterSpacing: "2px",
            color: "var(--gh-cyan)",
            textShadow: "0 0 20px var(--gh-cyan-glow)",
            marginBottom: "8px",
          }}>
            GAMERS HUB
          </h1>
          <p style={{ color: "var(--gh-text2)", fontSize: "14px" }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              letterSpacing: "1px",
              color: "var(--gh-text2)",
              marginBottom: "6px",
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                width: "100%",
                background: "var(--gh-bg2)",
                border: "1px solid var(--gh-border2)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "var(--gh-text)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Username */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              letterSpacing: "1px",
              color: "var(--gh-text2)",
              marginBottom: "6px",
            }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="gamertag"
              style={{
                width: "100%",
                background: "var(--gh-bg2)",
                border: "1px solid var(--gh-border2)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "var(--gh-text)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "12px",
              fontFamily: "var(--font-display)",
              letterSpacing: "1px",
              color: "var(--gh-text2)",
              marginBottom: "6px",
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="at least 8 characters"
              style={{
                width: "100%",
                background: "var(--gh-bg2)",
                border: "1px solid var(--gh-border2)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "var(--gh-text)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "rgba(255, 64, 129, 0.1)",
              border: "1px solid rgba(255, 64, 129, 0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "var(--gh-pink)",
              fontSize: "13px",
              marginBottom: "16px",
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "var(--gh-surface2)" : "var(--gh-cyan)",
              color: loading ? "var(--gh-text2)" : "#000",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              fontFamily: "var(--font-display)",
              letterSpacing: "1px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>

        {/* Login link */}
        <p style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "13px",
          color: "var(--gh-text2)",
        }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--gh-cyan)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
