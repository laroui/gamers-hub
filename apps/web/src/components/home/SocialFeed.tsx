import { useState, useEffect } from "react";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "/api/v1";

// ── Types ──────────────────────────────────────────────────────

interface UserSnippet {
  id: string;
  displayName: string;
  avatar: string | null;
}

interface GameSnippet {
  id: string;
  name: string;
  cover: string | null;
}

type FeedEvent =
  | { type: "ADDED_GAME"; user: UserSnippet; game: GameSnippet; createdAt: string }
  | { type: "RATED_GAME"; user: UserSnippet; game: GameSnippet; rating: number; createdAt: string }
  | { type: "COMPLETED_GAME"; user: UserSnippet; game: GameSnippet; createdAt: string };

// ── Helpers ────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const EVENT_LABEL: Record<FeedEvent["type"], string> = {
  ADDED_GAME: "added",
  RATED_GAME: "rated",
  COMPLETED_GAME: "completed",
};

// ── Feed Event Card ────────────────────────────────────────────

function FeedEventCard({ event }: { event: FeedEvent }) {
  const initials = event.user.displayName.slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "12px 16px",
    }}>
      {/* Avatar */}
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #7b61ff, #ff4081)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700,
        color: "#fff", overflow: "hidden",
      }}>
        {event.user.avatar
          ? <img src={event.user.avatar} alt={event.user.displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials}
      </div>

      {/* Text */}
      <div style={{ flex: 1, fontSize: "13px", color: "#9aa3b4", minWidth: 0 }}>
        <span style={{ color: "#e8eaf0", fontWeight: 600 }}>{event.user.displayName}</span>
        {" "}{EVENT_LABEL[event.type]}{" "}
        <span style={{ color: "#00e5ff", fontWeight: 600 }}>{event.game.name}</span>
        {event.type === "RATED_GAME" && (
          <span style={{ color: "#fbbf24", marginLeft: "4px" }}>
            {"★".repeat(Math.min(event.rating, 5))}
          </span>
        )}
        {event.type === "COMPLETED_GAME" && (
          <span style={{ color: "#4caf50", marginLeft: "4px" }}>✓</span>
        )}
      </div>

      {/* Time */}
      <span style={{ fontSize: "11px", color: "#4a5468", flexShrink: 0 }}>
        {timeAgo(event.createdAt)}
      </span>
    </div>
  );
}

// ── SocialFeed ─────────────────────────────────────────────────

export function SocialFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/feed?limit=20`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { events?: FeedEvent[] }) => setEvents(data.events ?? []))
      .catch(() => { /* silent — feed is non-critical */ })
      .finally(() => setLoading(false));
  }, []);

  if (loading || events.length === 0) return null;

  return (
    <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto" }} id="community">
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: "22px", fontWeight: 700,
        color: "#e8eaf0", margin: "0 0 24px",
        letterSpacing: "1px",
      }}>
        Community Activity
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {events.map((event, i) => (
          <FeedEventCard key={i} event={event} />
        ))}
      </div>
    </section>
  );
}
