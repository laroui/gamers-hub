import { useGamingWrapped } from "../../hooks/useStats.ts";
import { getPlatform } from "../../lib/platforms.ts";
import { useToast } from "../../stores/toast.ts";

interface WrappedCardProps {
  year: number;
}

export function WrappedCard({ year }: WrappedCardProps) {
  const { data: wrapped, isLoading } = useGamingWrapped(year);
  const { success } = useToast();

  if (isLoading) {
    return <div className="skeleton gh-card" style={{ height: "320px" }} />;
  }

  if (!wrapped || wrapped.totalHours === 0) {
    return (
      <div
        className="gh-card"
        style={{
          padding: "32px",
          textAlign: "center",
          color: "var(--gh-text3)",
          fontSize: "13px",
        }}
      >
        No data for {year} yet. Start playing!
      </div>
    );
  }

  const handleShare = async () => {
    const text = `My ${year} gaming stats on Gamers Hub: ${wrapped.totalHours}h played across ${wrapped.totalGames} games. Top game: ${wrapped.topGame?.title ?? "—"} 🎮`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `My ${year} Gaming Wrapped`, text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      success("Stats copied to clipboard!");
    }
  };

  const topPlatformMeta = wrapped.topPlatform ? getPlatform(wrapped.topPlatform) : null;

  const stats = [
    { label: "Total Hours", value: `${wrapped.totalHours}h`, delay: 0 },
    { label: "Games Played", value: String(wrapped.totalGames), delay: 80 },
    { label: "New Games", value: String(wrapped.newGames), delay: 160 },
    { label: "Completed", value: String(wrapped.completedGames), delay: 240 },
    wrapped.topGenre ? { label: "Top Genre", value: wrapped.topGenre, delay: 320 } : null,
    topPlatformMeta
      ? {
          label: "Top Platform",
          value: `${topPlatformMeta.emoji} ${topPlatformMeta.name}`,
          delay: 400,
        }
      : null,
    wrapped.favoriteDay
      ? { label: "Fave Day", value: wrapped.favoriteDay, delay: 480 }
      : null,
  ].filter(Boolean) as { label: string; value: string; delay: number }[];

  return (
    <div
      className="gh-card"
      style={{
        padding: "28px",
        background: "linear-gradient(135deg, var(--gh-surface) 0%, var(--gh-surface2) 100%)",
        borderColor: "var(--gh-border2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative glow */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              letterSpacing: "3px",
              color: "var(--gh-text3)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            {year} Wrapped
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "48px",
              fontWeight: 800,
              color: "var(--gh-cyan)",
              lineHeight: 1,
              letterSpacing: "-2px",
            }}
          >
            {wrapped.totalHours}h
          </div>
        </div>

        {/* Top game cover */}
        {wrapped.topGame?.coverUrl && (
          <div
            style={{
              width: "60px",
              height: "80px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "2px solid var(--gh-border2)",
              flexShrink: 0,
            }}
          >
            <img
              src={wrapped.topGame.coverUrl}
              alt={wrapped.topGame.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
      </div>

      {/* Top game label */}
      {wrapped.topGame && (
        <div
          style={{
            marginBottom: "20px",
            animation: "wrappedReveal 0.4s ease forwards",
            animationDelay: "0ms",
            opacity: 0,
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--gh-text3)",
              letterSpacing: "1px",
              marginBottom: "2px",
            }}
          >
            TOP GAME
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--gh-text)",
            }}
          >
            {wrapped.topGame.title}
            <span
              style={{
                color: "var(--gh-text3)",
                fontSize: "13px",
                fontWeight: 400,
                marginLeft: "8px",
              }}
            >
              {wrapped.topGame.hours}h
            </span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              animation: "wrappedReveal 0.4s ease forwards",
              animationDelay: `${stat.delay}ms`,
              opacity: 0,
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                background: "var(--gh-bg3)",
                borderRadius: "8px",
                border: "1px solid var(--gh-border)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--gh-text3)",
                  letterSpacing: "0.5px",
                  marginBottom: "3px",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--gh-text)",
                }}
              >
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Special badges */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {wrapped.lateNightGamer && (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(124,77,255,0.15)",
              border: "1px solid rgba(124,77,255,0.3)",
              color: "var(--gh-purple)",
              fontSize: "11px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              animation: "wrappedReveal 0.4s ease forwards",
              animationDelay: "560ms",
              opacity: 0,
            }}
          >
            🌙 LATE NIGHT GAMER
          </span>
        )}
        {wrapped.longestSession && (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: "rgba(0,230,118,0.15)",
              border: "1px solid rgba(0,230,118,0.3)",
              color: "var(--gh-green)",
              fontSize: "11px",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              animation: "wrappedReveal 0.4s ease forwards",
              animationDelay: "600ms",
              opacity: 0,
            }}
          >
            ⚡ {wrapped.longestSession.hours}H LONGEST SESSION
          </span>
        )}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        style={{
          width: "100%",
          padding: "10px",
          background: "var(--gh-cyan-dim)",
          border: "1px solid rgba(0,229,255,0.3)",
          borderRadius: "10px",
          color: "var(--gh-cyan)",
          fontFamily: "var(--font-display)",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "1px",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        SHARE MY STATS
      </button>
    </div>
  );
}
