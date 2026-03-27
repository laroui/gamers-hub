import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams, type Location } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../lib/auth/AuthProvider.tsx";
import { useToast } from "../stores/toast.ts";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "/api/v1";
const GOOGLE_URL = `${API_BASE}/auth/google`;

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.6-4.9 7.3v6h7.9c4.6-4.3 7.3-10.6 7.3-17.5z" fill="#4285F4"/>
      <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.1-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z" fill="#34A853"/>
      <path d="M10.9 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.4v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9.1l8.2-4.3z" fill="#FBBC05"/>
      <path d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.8 0 6.7 5.2 2.7 12.9l8.2 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { success } = useToast();
  const [apiError, setApiError] = useState<string | null>(() => {
    const err = searchParams.get("error");
    if (err === "google_denied") return "Google sign-in was cancelled.";
    if (err) return "Google sign-in failed. Please try again.";
    return null;
  });
  const [showEmailForm, setShowEmailForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/library";
      navigate(from, { replace: true });
      success("Welcome back!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      const errCode = e?.response?.data?.error ?? "";
      const msg = errCode === "GoogleAccount"
        ? "This account uses Google sign-in."
        : (e?.response?.data?.message ?? "Invalid email or password.");
      setApiError(msg);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b12",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow blobs */}
      <div style={{
        position: "absolute", top: "-15%", left: "-10%",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-20%", right: "-10%",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(123,97,255,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "56px",
            fontWeight: 900,
            letterSpacing: "6px",
            color: "#00e5ff",
            textShadow: "0 0 40px rgba(0,229,255,0.5), 0 0 80px rgba(0,229,255,0.2)",
            lineHeight: 1,
            marginBottom: "8px",
          }}>GH</div>
          <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#4a5468", fontFamily: "var(--font-display)" }}>
            GAMERS HUB
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "24px",
          padding: "36px",
          backdropFilter: "blur(20px)",
        }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "22px",
            fontWeight: 700,
            color: "#e8eaf0",
            margin: "0 0 8px",
            textAlign: "center",
          }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "#4a5468", textAlign: "center", margin: "0 0 28px" }}>
            Sign in to your gaming hub
          </p>

          {/* Google button — primary CTA */}
          <a
            href={GOOGLE_URL}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              width: "100%",
              background: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px 20px",
              color: "#1a1a1a",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
              transition: "opacity 0.15s",
              boxSizing: "border-box",
              letterSpacing: "0.2px",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <GoogleIcon />
            Continue with Google
          </a>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "24px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: "11px", color: "#4a5468", letterSpacing: "1px" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Email form toggle / form */}
          {!showEmailForm ? (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "13px 20px",
                color: "#9aa3b4",
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "border-color 0.2s, color 0.2s",
                letterSpacing: "0.2px",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.color = "#e8eaf0";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "#9aa3b4";
              }}
            >
              Sign in with email
            </button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#4a5468" }}>EMAIL</label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    color: "#e8eaf0",
                    fontSize: "14px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-body)",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#00e5ff")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                {errors.email && <span style={{ fontSize: "12px", color: "#ff4081" }}>{errors.email.message}</span>}
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#4a5468" }}>PASSWORD</label>
                <input
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    color: "#e8eaf0",
                    fontSize: "14px",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-body)",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "#00e5ff")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                {errors.password && <span style={{ fontSize: "12px", color: "#ff4081" }}>{errors.password.message}</span>}
              </div>

              {/* Error */}
              {apiError && (
                <div style={{
                  background: "rgba(255,64,129,0.08)",
                  border: "1px solid rgba(255,64,129,0.25)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "#ff4081",
                }}>
                  {apiError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  background: isSubmitting ? "rgba(0,229,255,0.3)" : "#00e5ff",
                  color: "#080b12",
                  border: "none",
                  borderRadius: "10px",
                  padding: "13px",
                  fontFamily: "var(--font-display)",
                  fontSize: "15px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginTop: "4px",
                }}
              >
                {isSubmitting ? "SIGNING IN…" : "SIGN IN"}
              </button>
            </form>
          )}

          {/* Error shown when email form hidden */}
          {apiError && !showEmailForm && (
            <div style={{
              marginTop: "16px",
              background: "rgba(255,64,129,0.08)",
              border: "1px solid rgba(255,64,129,0.25)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#ff4081",
            }}>
              {apiError}
            </div>
          )}
        </div>

        {/* Register link */}
        <p style={{ textAlign: "center", fontSize: "13px", color: "#4a5468", marginTop: "24px" }}>
          No account?{" "}
          <Link to="/register" style={{ color: "#00e5ff", textDecoration: "none", fontWeight: 500 }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
