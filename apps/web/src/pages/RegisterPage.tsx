import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../lib/auth/AuthProvider.tsx";

const schema = z
  .object({
    email: z.string().email("Please enter a valid email"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be 20 characters or fewer")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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

export function RegisterPage() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      await authRegister(data.email, data.username, data.password);
      navigate("/library", { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } } };
      const msg = e?.response?.data?.message ?? "Something went wrong. Please try again.";
      const errField = e?.response?.data?.error ?? "";
      if (errField === "EmailTaken") {
        setError("email", { message: msg });
      } else if (errField === "UsernameTaken") {
        setError("username", { message: msg });
      } else {
        setApiError(msg);
      }
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
            Create account
          </h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--gh-text2)", letterSpacing: "0.5px" }}>
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

            {/* Username */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--gh-text2)", letterSpacing: "0.5px" }}>
                USERNAME
              </label>
              <input
                type="text"
                {...register("username")}
                style={inputStyle("username")}
                placeholder="coolplayer99"
                autoComplete="username"
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
              />
              {errors.username && (
                <span style={{ fontSize: "12px", color: "var(--gh-pink)" }}>
                  {errors.username.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--gh-text2)", letterSpacing: "0.5px" }}>
                PASSWORD
              </label>
              <input
                type="password"
                {...register("password")}
                style={inputStyle("password")}
                placeholder="••••••••"
                autoComplete="new-password"
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              {errors.password && (
                <span style={{ fontSize: "12px", color: "var(--gh-pink)" }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--gh-text2)", letterSpacing: "0.5px" }}>
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                {...register("confirmPassword")}
                style={inputStyle("confirmPassword")}
                placeholder="••••••••"
                autoComplete="new-password"
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
              />
              {errors.confirmPassword && (
                <span style={{ fontSize: "12px", color: "var(--gh-pink)" }}>
                  {errors.confirmPassword.message}
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
              {isSubmitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--gh-text2)", margin: 0 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--gh-cyan)", textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
