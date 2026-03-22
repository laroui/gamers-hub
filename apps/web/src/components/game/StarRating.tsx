import { useState } from "react";

interface StarRatingProps {
  value: number | null;  // 1–10 or null
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export function StarRating({ value, onChange, disabled }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? value ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{
        fontSize: "11px", letterSpacing: "1.5px",
        textTransform: "uppercase", color: "var(--gh-text3)",
        fontFamily: "var(--font-display)",
      }}>
        Your Rating
      </span>
      <div
        style={{ display: "flex", gap: "4px" }}
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const starIndex = i + 1;
          const filled = starIndex <= display;
          return (
            <button
              key={i}
              disabled={disabled}
              onMouseEnter={() => !disabled && setHovered(starIndex)}
              onClick={() => !disabled && onChange(starIndex)}
              style={{
                background: "none", border: "none",
                padding: "2px", cursor: disabled ? "not-allowed" : "pointer",
                color: filled ? "var(--gh-orange)" : "var(--gh-border2)",
                fontSize: "18px",
                transition: "color 0.1s, transform 0.1s",
                transform: filled ? "scale(1.1)" : "scale(1)",
                lineHeight: 1,
              }}
            >
              ★
            </button>
          );
        })}
        {value !== null && value !== undefined && (
          <span style={{
            fontSize: "12px", color: "var(--gh-text2)",
            alignSelf: "center", marginLeft: "4px",
          }}>
            {value}/10
          </span>
        )}
      </div>
    </div>
  );
}
