import { useToastStore, type Toast } from "../../stores/toast.ts";

const VARIANT_STYLES: Record<
  Toast["variant"],
  { bg: string; border: string; color: string; icon: string }
> = {
  success: { bg: "var(--gh-green-dim)", border: "rgba(0,230,118,0.3)", color: "var(--gh-green)", icon: "✓" },
  error:   { bg: "var(--gh-pink-dim)",  border: "rgba(255,64,129,0.3)",  color: "var(--gh-pink)",  icon: "✕" },
  info:    { bg: "var(--gh-cyan-dim)",  border: "rgba(0,229,255,0.3)",  color: "var(--gh-cyan)",  icon: "i" },
  warning: { bg: "var(--gh-orange-dim)",border: "rgba(255,145,0,0.3)",  color: "var(--gh-orange)", icon: "!" },
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const style = VARIANT_STYLES[toast.variant];

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        background: "var(--gh-surface2)",
        border: `1px solid ${style.border}`,
        borderLeft: `3px solid ${style.color}`,
        borderRadius: "12px",
        padding: "12px 14px",
        minWidth: "260px", maxWidth: "360px",
        animation: "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        cursor: "pointer",
      }}
      onClick={() => remove(toast.id)}
    >
      <span style={{
        width: "20px", height: "20px",
        background: style.bg, color: style.color,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: 700, flexShrink: 0,
      }}>
        {style.icon}
      </span>
      <span style={{ fontSize: "13px", color: "var(--gh-text)", flex: 1 }}>
        {toast.message}
      </span>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      display: "flex", flexDirection: "column", gap: "8px",
      zIndex: 1000,
      alignItems: "flex-end",
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
