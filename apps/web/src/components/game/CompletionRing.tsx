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
    const targetOffset = circumference - (pct / 100) * circumference;

    if (el) {
      el.style.strokeDashoffset = String(targetOffset);
    }
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
        {/* Glow Layer (Broad) */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          ref={progressRef}
          style={{ 
            opacity: 0.4,
            filter: "blur(12px)",
            transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
        />
        
        {/* Glow Layer (Sharp) */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ 
            opacity: 0.6,
            filter: "blur(3px)",
            strokeDashoffset: circumference - (pct / 100) * circumference,
            transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
        />

        {/* Main Progress Stroke (Filament) */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth / 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          style={{ 
            stroke: "white", // Center "filament" look
            opacity: 0.8,
            transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
        />

        {/* Outer Stroke to reinforce base color */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          style={{ 
            transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
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
