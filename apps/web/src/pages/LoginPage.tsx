import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams, type Location } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../lib/auth/AuthProvider.tsx";
import { useToast } from "../stores/toast.ts";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "/api/v1";
const GOOGLE_SIGN_IN_URL = `${API_BASE}/auth/google`;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.6-4.9 7.3v6h7.9c4.6-4.3 7.3-10.6 7.3-17.5z" fill="#4285F4"/>
      <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.1-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z" fill="#34A853"/>
      <path d="M10.9 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.4v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9.1l8.2-4.3z" fill="#FBBC05"/>
      <path d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.9 2.4 30.5 0 24 0 14.8 0 6.7 5.2 2.7 12.9l8.2 6.2C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
    </svg>
  );
}

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--gh-bg3)",
  border: "1px solid var(--gh-border2)",
  borderRadius: "10px",
  padding: "12px 16px",
  color: "var(--gh-text)",
  fontFamily: "var(--font-body)",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      const from =
        (location.state as { from?: Location } | null)?.from?.pathname ?? "/library";
      navigate(from, { replace: true });
      success("Welcome back!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg =
        e?.response?.data?.message ?? "Something went wrong. Please try again.";
      setApiError(msg);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    ...inputBaseStyle,
    borderColor: focusedField === field ? "var(--gh-cyan)" : "var(--gh-border2)",
    boxShadow: focusedField === field ? "0 0 0 3px var(--gh-cyan-dim)" : "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gh-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "48px",
            fontWeight: 800,
            letterSpacing: "4px",
            color: "var(--gh-cyan)",
            textShadow: "0 0 30px var(--gh-cyan-glow)",
            lineHeight: 1,
          }}
        >
          GH
        </div>
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "3px",
            color: "var(--gh-text3)",
            marginBottom: "24px",
          }}
        >
          GAMERS HUB
        </div>

        {/* Card */}
        <div
          style={{
            width: "100%",
            background: "var(--gh-surface)",
            border: "1px solid var(--gh-border)",
            borderRadius: "20px",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--gh-text)",
              margin: 0,
            }}
          >
            Sign in
          </h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                style={{ fontSize: "12px", color: "var(--gh-text2)", letterSpacing: "0.5px" }}
              >
                EMAIL
              </label>
              <input
                type="email"
                {...register("email")}
                style={inputStyle("email")}
                placeholder="you@example.com"
                autoComplete="email"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
              {errors.email && (
                <span style={{ fontSize: "12px", color: "var(--gh-pink)" }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                style={{ fontSize: "12px", color: "var(--gh-text2)", letterSpacing: "0.5px" }}
              >
                PASSWORD
              </label>
              <input
                type="password"
                {...register("password")}
                style={inputStyle("password")}
                placeholder="••••••••"
                autoComplete="current-password"
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              {errors.password && (
                <span style={{ fontSize: "12px", color: "var(--gh-pink)" }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div
                style={{
                  background: "var(--gh-pink-dim)",
                  border: "1px solid rgba(255,64,129,0.3)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  color: "var(--gh-pink)",
                }}
              >
                {apiError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                background: isSubmitting ? "var(--gh-surface2)" : "var(--gh-cyan)",
                color: isSubmitting ? "var(--gh-text2)" : "var(--gh-bg)",
                border: "none",
                borderRadius: "10px",
                padding: "13px",
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "1px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--gh-border)" }} />
            <span style={{ fontSize: "12px", color: "var(--gh-text3)" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "var(--gh-border)" }} />
          </div>

          {/* Google sign-in */}
          <a
            href={GOOGLE_SIGN_IN_URL}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              background: "var(--gh-surface2)",
              border: "1px solid var(--gh-border2)",
              borderRadius: "10px",
              padding: "11px 16px",
              color: "var(--gh-text)",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "none",
              transition: "border-color 0.2s, background 0.2s",
              boxSizing: "border-box",
            }}
          >
            <GoogleIcon />
            Sign in with Google
          </a>

          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--gh-text2)", margin: 0 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--gh-cyan)", textDecoration: "none" }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
