import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useChangePassword } from "../../hooks/useProfile.ts";
import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { useToast } from "../../stores/toast.ts";
import { Spinner } from "../ui/Spinner.tsx";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function PasswordInput({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ color: "var(--gh-text2)", fontSize: "12px", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          {...props}
          type={show ? "text" : "password"}
          style={{
            width: "100%",
            background: "var(--gh-surface2)",
            border: `1px solid ${error ? "var(--gh-pink)" : "var(--gh-border2)"}`,
            borderRadius: "8px",
            padding: "9px 40px 9px 12px",
            color: "var(--gh-text)",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--gh-text3)",
            padding: 0,
            lineHeight: 1,
          }}
          tabIndex={-1}
        >
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <span style={{ color: "var(--gh-pink)", fontSize: "12px" }}>{error}</span>
      )}
    </div>
  );
}

export function ChangePassword() {
  const { logout } = useAuth();
  const changePassword = useChangePassword();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      {
        onSuccess: () => {
          reset();
          toast.success("Password changed. Signing you out for security...", 2500);
          setTimeout(() => {
            void logout();
          }, 2000);
        },
        onError: (err: unknown) => {
          const anyErr = err as { response?: { status?: number } };
          if (anyErr?.response?.status === 401) {
            setError("currentPassword", { message: "Current password is incorrect" });
          } else {
            toast.error("Failed to change password");
          }
        },
      },
    );
  };

  return (
    <div className="gh-card" style={{ padding: "20px" }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "14px",
          fontWeight: 700,
          letterSpacing: "1px",
          color: "var(--gh-text2)",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}
      >
        Change Password
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <PasswordInput
          label="Current Password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <PasswordInput
          label="New Password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <PasswordInput
          label="Confirm New Password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <button
          type="submit"
          disabled={changePassword.isPending}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "var(--gh-cyan-dim)",
            border: "1px solid rgba(0,229,255,0.4)",
            borderRadius: "10px",
            padding: "10px 20px",
            color: "var(--gh-cyan)",
            fontFamily: "var(--font-display)",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            cursor: changePassword.isPending ? "not-allowed" : "pointer",
            opacity: changePassword.isPending ? 0.7 : 1,
          }}
        >
          {changePassword.isPending && <Spinner size={14} />}
          Update Password
        </button>
      </form>
    </div>
  );
}
