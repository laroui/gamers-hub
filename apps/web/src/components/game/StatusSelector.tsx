import type { GameStatus } from "@gamers-hub/types";

const STATUSES: {
  value: GameStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
}[] = [
  { value: "library",   label: "Library",   color: "var(--gh-text2)",  bg: "transparent",        border: "var(--gh-border)" },
  { value: "playing",   label: "Playing",   color: "var(--gh-cyan)",   bg: "var(--gh-cyan-dim)", border: "rgba(0,229,255,0.4)" },
  { value: "completed", label: "Completed", color: "var(--gh-green)",  bg: "var(--gh-green-dim)", border: "rgba(0,230,118,0.4)" },
  { value: "wishlist",  label: "Wishlist",  color: "var(--gh-pink)",   bg: "var(--gh-pink-dim)",  border: "rgba(255,64,129,0.4)" },
  { value: "dropped",   label: "Dropped",   color: "var(--gh-text3)",  bg: "transparent",         border: "var(--gh-border)" },
];

interface StatusSelectorProps {
  value: GameStatus;
  onChange: (status: GameStatus) => void;
  disabled?: boolean;
}

export function StatusSelector({ value, onChange, disabled }: StatusSelectorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{
        fontSize: "11px", letterSpacing: "1.5px",
        textTransform: "uppercase", color: "var(--gh-text3)",
        fontFamily: "var(--font-display)",
      }}>
        Status
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {STATUSES.map((s) => {
          const isActive = value === s.value;
          return (
            <button
              key={s.value}
              onClick={() => !disabled && onChange(s.value)}
              disabled={disabled}
              style={{
                background: isActive ? s.bg : "transparent",
                border: `1px solid ${isActive ? s.border : "var(--gh-border)"}`,
                borderRadius: "8px",
                padding: "8px 14px",
                color: isActive ? s.color : "var(--gh-text3)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
                transition: "all 0.15s",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
