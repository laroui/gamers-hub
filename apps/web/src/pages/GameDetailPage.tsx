import { useParams, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useUserGame, usePatchUserGame } from "../hooks/useUserGame.ts";
import { useGameAchievements } from "../hooks/useGameAchievements.ts";
import { usePlaySessions } from "../hooks/usePlaySessions.ts";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback.ts";
import { useIsMobile } from "../hooks/useIsMobile.ts";
import { CompletionRing } from "../components/game/CompletionRing.tsx";
import { StatusSelector } from "../components/game/StatusSelector.tsx";
import { StarRating } from "../components/game/StarRating.tsx";
import { AchievementsGrid } from "../components/game/AchievementsGrid.tsx";
import { SessionHistory } from "../components/game/SessionHistory.tsx";
import { PageLoader } from "../components/ui/PageLoader.tsx";
import { getPlatform } from "../lib/platforms.ts";
import type { GameStatus } from "@gamers-hub/types";

export function GameDetailPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const isMobile = useIsMobile();

  const { data: userGame, isLoading } = useUserGame(gameId ?? "");
  const { mutate: patch, isPending: isPatching } = usePatchUserGame(gameId ?? "");
  const { data: achievements = [], isLoading: achievementsLoading } =
    useGameAchievements(userGame?.game.id ?? "", !!userGame);
  const { data: sessions = [], isLoading: sessionsLoading } =
    usePlaySessions(gameId, 10);

  const notesRef = useRef<HTMLTextAreaElement>(null);

  const saveNotes = useDebouncedCallback((value: string) => {
    patch({ userNotes: value || null });
  }, 500);

  const handleBack = () => {
    const saved = sessionStorage.getItem("library-scroll");
    navigate("/library");
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(saved));
        sessionStorage.removeItem("library-scroll");
      });
    }
  };

  if (isLoading) return <PageLoader />;

  if (!userGame) {
    return (
      <div style={{ textAlign: "center", padding: "80px", color: "var(--gh-text3)" }}>
        Game not found in your library.
      </div>
    );
  }

  const { game, status, completionPct, hoursPlayed, userRating, userNotes } = userGame;
  const platform = getPlatform(userGame.platform);

  return (
    <div className="page-enter">
      {/* ── Back button ────────────────────────────── */}
      <button
        onClick={handleBack}
        style={{
          background: "none", border: "none",
          color: "var(--gh-text2)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "6px",
          fontSize: "13px", marginBottom: "20px",
          padding: "4px 0",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--gh-text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--gh-text2)"; }}
      >
        ← Back to Library
      </button>

      {/* ── Hero ───────────────────────────────────── */}
      <div style={{
        position: "relative",
        borderRadius: "20px", overflow: "hidden",
        marginBottom: "28px",
        height: "220px",
      }}>
        {game.backgroundUrl ?? game.coverUrl ? (
          <img
            src={(game.backgroundUrl ?? game.coverUrl)!}
            alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              filter: "blur(2px) brightness(0.35)",
              transform: "scale(1.05)",
            }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, var(--gh-surface2), var(--gh-bg))",
          }} />
        )}

        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", alignItems: "flex-end",
          padding: "24px", height: "100%", gap: "20px",
        }}>
          {/* Cover */}
          <div style={{
            width: "80px", height: "107px", flexShrink: 0,
            borderRadius: "10px", overflow: "hidden",
            border: "2px solid var(--gh-border2)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}>
            {game.coverUrl ? (
              <img src={game.coverUrl} alt={game.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--gh-surface2)", fontSize: "28px",
              }}>
                🎮
              </div>
            )}
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "28px",
              fontWeight: 800, color: "var(--gh-text)",
              lineHeight: 1.1, marginBottom: "8px",
            }}>
              {game.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {game.releaseYear !== null && (
                <span style={{ fontSize: "12px", color: "var(--gh-text3)" }}>{game.releaseYear}</span>
              )}
              {game.genres.slice(0, 3).map((g) => (
                <span key={g} style={{
                  fontSize: "11px", padding: "2px 8px",
                  background: "var(--gh-surface2)",
                  border: "1px solid var(--gh-border)",
                  borderRadius: "20px", color: "var(--gh-text2)",
                }}>
                  {g}
                </span>
              ))}
              {game.metacritic !== null && (
                <span style={{
                  fontSize: "12px", fontWeight: 700,
                  padding: "2px 8px", borderRadius: "6px",
                  background: game.metacritic >= 75 ? "rgba(0,230,118,0.15)" : "rgba(255,145,0,0.15)",
                  color: game.metacritic >= 75 ? "var(--gh-green)" : "var(--gh-orange)",
                  border: `1px solid ${game.metacritic >= 75 ? "rgba(0,230,118,0.3)" : "rgba(255,145,0,0.3)"}`,
                }}>
                  MC {game.metacritic}
                </span>
              )}
              <span style={{ fontSize: "13px", color: platform.color }}>
                {platform.emoji} {platform.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body — two columns ─────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "300px 1fr",
        gap: "24px",
        alignItems: "start",
      }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="gh-card" style={{ padding: "20px" }}>
            <StatusSelector
              value={status}
              onChange={(s: GameStatus) => patch({ status: s })}
              disabled={isPatching}
            />
          </div>

          <div className="gh-card" style={{ padding: "20px" }}>
            <StarRating
              value={userRating}
              onChange={(r) => patch({ userRating: r })}
              disabled={isPatching}
            />
          </div>

          <div className="gh-card" style={{ padding: "20px" }}>
            <span style={{
              fontSize: "11px", letterSpacing: "1.5px",
              textTransform: "uppercase", color: "var(--gh-text3)",
              fontFamily: "var(--font-display)", display: "block", marginBottom: "8px",
            }}>
              Notes
            </span>
            <textarea
              ref={notesRef}
              defaultValue={userNotes ?? ""}
              onChange={(e) => saveNotes(e.target.value)}
              placeholder="Add personal notes…"
              rows={5}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "var(--gh-bg3)", border: "1px solid var(--gh-border2)",
                borderRadius: "8px", padding: "10px 12px",
                color: "var(--gh-text)", fontFamily: "var(--font-body)",
                fontSize: "13px", lineHeight: "1.6",
                resize: "vertical", outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--gh-cyan)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--gh-border2)"; }}
            />
            <p style={{ fontSize: "11px", color: "var(--gh-text3)", marginTop: "6px" }}>
              Auto-saves as you type
            </p>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Completion + hours */}
          <div className="gh-card" style={{
            padding: "24px",
            display: "flex", alignItems: "center", gap: "28px",
          }}>
            <CompletionRing pct={completionPct} />
            <div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: "36px",
                fontWeight: 800, color: "var(--gh-text)", lineHeight: 1,
              }}>
                {hoursPlayed}h
              </div>
              <div style={{ fontSize: "13px", color: "var(--gh-text2)", marginTop: "4px" }}>
                {userGame.minutesPlayed.toLocaleString()} minutes played
              </div>
              {userGame.lastPlayedAt !== null && (
                <div style={{ fontSize: "12px", color: "var(--gh-text3)", marginTop: "4px" }}>
                  Last played{" "}
                  {formatDistanceToNow(new Date(userGame.lastPlayedAt), { addSuffix: true })}
                </div>
              )}
              {userGame.achievementsTotal > 0 && (
                <div style={{ fontSize: "12px", color: "var(--gh-text3)", marginTop: "4px" }}>
                  {userGame.achievementsEarned} / {userGame.achievementsTotal} achievements
                </div>
              )}
            </div>
          </div>

          {/* Session history */}
          <div className="gh-card" style={{ padding: "20px" }}>
            <SessionHistory
              sessions={sessions}
              userGameId={gameId ?? ""}
              platform={userGame.platform}
              isLoading={sessionsLoading}
            />
          </div>

          {/* Achievements */}
          {userGame.achievementsTotal > 0 && (
            <div className="gh-card" style={{ padding: "20px" }}>
              <span style={{
                fontSize: "11px", letterSpacing: "1.5px",
                textTransform: "uppercase", color: "var(--gh-text3)",
                fontFamily: "var(--font-display)", display: "block", marginBottom: "16px",
              }}>
                Achievements
              </span>
              <AchievementsGrid
                achievements={achievements}
                earned={userGame.achievementsEarned}
                total={userGame.achievementsTotal}
                isLoading={achievementsLoading}
              />
            </div>
          )}

          {/* Game description */}
          {game.description !== null && (
            <div className="gh-card" style={{ padding: "20px" }}>
              <span style={{
                fontSize: "11px", letterSpacing: "1.5px",
                textTransform: "uppercase", color: "var(--gh-text3)",
                fontFamily: "var(--font-display)", display: "block", marginBottom: "12px",
              }}>
                About
              </span>
              <p style={{
                fontSize: "13px", color: "var(--gh-text2)",
                lineHeight: "1.7", margin: 0,
              }}>
                {game.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
