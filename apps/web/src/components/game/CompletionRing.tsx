import { useEffect, useRef } from "react";

interface CompletionRingProps {
  pct: number;        // 0–100
  size?: number;      // default 140
  strokeWidth?: number; // default 10
}

export function CompletionRing({ pct, size = 140, strokeWidth = 10 }: CompletionRingProps) {
  const progressRef = useRef<SVGCircleElement>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const color =
    pct >= 100 ? "var(--gh-green)" :
    pct >= 60  ? "var(--gh-cyan)" :
    pct >= 30  ? "var(--gh-purple)" :
    "var(--gh-pink)";

  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;

    const targetOffset = circumference - (pct / 100) * circumference;

    el.style.strokeDashoffset = String(circumference);
    el.style.transition = "none";

    void el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.strokeDashoffset = String(targetOffset);
  }, [pct, circumference]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="var(--gh-surface2)"
          strokeWidth={strokeWidth}
        />
        <circle
          ref={progressRef}
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: pct > 0 ? `drop-shadow(0 0 6px ${color})` : "none" }}
        />
      </svg>

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: size < 120 ? "20px" : "26px",
          fontWeight: 800,
          color,
          lineHeight: 1,
        }}>
          {Math.round(pct)}%
        </span>
        <span style={{
          fontSize: "10px", color: "var(--gh-text3)",
          letterSpacing: "1px", marginTop: "2px",
        }}>
          DONE
        </span>
      </div>
    </div>
  );
}
