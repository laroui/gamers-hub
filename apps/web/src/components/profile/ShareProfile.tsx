import { useAuth } from "../../lib/auth/AuthProvider.tsx";
import { useLibraryStatsOverview } from "../../hooks/useStats.ts";
import { useToast } from "../../stores/toast.ts";

export function ShareProfile() {
  const { user } = useAuth();
  const { data: stats } = useLibraryStatsOverview();
  const toast = useToast();

  const shareText = stats && user
    ? `${user.username} on Gamers Hub: ${stats.totalGames} games, ${Math.round(stats.totalHours)}h played, ${stats.completedGames} completed. Check it out at gameershub.app`
    : `Check out my gaming profile on Gamers Hub!`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, title: "My Gamers Hub Profile" });
      } catch {
        // User cancelled or error — fall back to copy
        await handleCopy();
      }
    } else {
      await handleCopy();
    }
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
          marginBottom: "12px",
        }}
      >
        Share Profile
      </h3>

      <p
        style={{
          color: "var(--gh-text2)",
          fontSize: "13px",
          lineHeight: 1.5,
          background: "var(--gh-surface2)",
          borderRadius: "8px",
          padding: "10px 12px",
          marginBottom: "14px",
          border: "1px solid var(--gh-border)",
        }}
      >
        {shareText}
      </p>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1,
            background: "var(--gh-cyan-dim)",
            border: "1px solid rgba(0,229,255,0.35)",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "var(--gh-cyan)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Copy Stats
        </button>
        <button
          onClick={handleShare}
          style={{
            flex: 1,
            background: "var(--gh-purple-dim)",
            border: "1px solid rgba(124,77,255,0.35)",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "var(--gh-purple)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
