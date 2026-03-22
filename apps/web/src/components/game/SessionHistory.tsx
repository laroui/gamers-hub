import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import type { PlaySession, PlatformId } from "@gamers-hub/types";
import { getPlatform } from "../../lib/platforms.ts";
import { useLogSession } from "../../hooks/usePlaySessions.ts";
import { useToast } from "../../stores/toast.ts";

interface SessionHistoryProps {
  sessions: PlaySession[];
  userGameId: string;
  platform: PlatformId;
  isLoading: boolean;
}

export function SessionHistory({ sessions, userGameId, platform, isLoading }: SessionHistoryProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{
          fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase",
          color: "var(--gh-text3)", fontFamily: "var(--font-display)",
        }}>
          Recent Sessions
        </span>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "var(--gh-cyan-dim)", border: "1px solid rgba(0,229,255,0.3)",
            borderRadius: "6px", padding: "4px 10px",
            color: "var(--gh-cyan)", fontSize: "11px",
            fontFamily: "var(--font-display)", fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.5px",
          }}
        >
          + ADD
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: "44px", borderRadius: "8px" }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--gh-text3)", fontStyle: "italic" }}>
          No sessions recorded yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {sessions.slice(0, 10).map((s) => {
            const p = getPlatform(s.platform);
            const hours = Math.floor(s.minutes / 60);
            const mins = s.minutes % 60;
            const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "8px 12px",
                background: "var(--gh-surface2)",
                borderRadius: "8px",
                border: "1px solid var(--gh-border)",
              }}>
                <span style={{ fontSize: "14px", color: p.color }}>{p.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", color: "var(--gh-text)", fontWeight: 500 }}>
                    {duration}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--gh-text3)" }}>
                    {formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}
                    {s.device ? ` · ${s.device}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: "11px", color: "var(--gh-text3)", flexShrink: 0 }}>
                  {format(new Date(s.startedAt), "MMM d")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddSessionModal
          userGameId={userGameId}
          platform={platform}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Add Session Modal ─────────────────────────────────────────────────────────
function AddSessionModal({
  userGameId,
  platform,
  onClose,
}: {
  userGameId: string;
  platform: PlatformId;
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useLogSession();
  const { success, error } = useToast();
  const [minutes, setMinutes] = useState(60);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));

  const handleSubmit = async () => {
    if (minutes < 1 || minutes > 1440) {
      error("Session must be between 1 and 1440 minutes");
      return;
    }
    try {
      await mutateAsync({
        userGameId,
        startedAt: new Date(date).toISOString(),
        minutes,
        platform,
      });
      success(`Session logged — ${minutes} minutes`);
      onClose();
    } catch {
      error("Failed to log session. Please try again.");
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 500, backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--gh-bg3)",
        border: "1px solid var(--gh-border2)",
        borderRadius: "20px", padding: "28px",
        width: "360px", maxWidth: "90vw",
      }}>
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: "20px",
          fontWeight: 700, marginBottom: "20px", color: "var(--gh-text)",
        }}>
          Log Session
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--gh-text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Date &amp; Time
            </span>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                background: "var(--gh-surface)", border: "1px solid var(--gh-border2)",
                borderRadius: "8px", padding: "10px 12px",
                color: "var(--gh-text)", fontFamily: "var(--font-body)", fontSize: "13px",
                outline: "none", colorScheme: "dark",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--gh-text3)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Duration (minutes)
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="number"
                min={1} max={1440}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                style={{
                  background: "var(--gh-surface)", border: "1px solid var(--gh-border2)",
                  borderRadius: "8px", padding: "10px 12px",
                  color: "var(--gh-text)", fontFamily: "var(--font-body)", fontSize: "13px",
                  outline: "none", width: "100px",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--gh-text3)" }}>
                = {Math.floor(minutes / 60)}h {minutes % 60}m
              </span>
            </div>
          </label>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px", borderRadius: "8px",
              background: "transparent", border: "1px solid var(--gh-border2)",
              color: "var(--gh-text2)", fontFamily: "var(--font-body)",
              fontSize: "13px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { void handleSubmit(); }}
            disabled={isPending}
            style={{
              flex: 2, padding: "10px", borderRadius: "8px",
              background: "var(--gh-cyan)", border: "none",
              color: "var(--gh-bg)", fontFamily: "var(--font-display)",
              fontSize: "14px", fontWeight: 700, letterSpacing: "1px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "SAVING..." : "LOG SESSION"}
          </button>
        </div>
      </div>
    </div>
  );
}
