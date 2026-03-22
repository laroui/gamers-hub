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
    navigate("/library");
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
  const screenshots = game.screenshotUrls || [];

  return (
    <div className="page-enter" style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* ── Hero ───────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: "32px" }}>
        {/* Background Blur Wall */}
        <div className="gh-hero-blur" style={{
          background: (game.backgroundUrl ?? game.coverUrl) 
            ? `url(${game.backgroundUrl ?? game.coverUrl}) center/cover no-repeat`
            : "var(--gh-bg2)",
        }} />

        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          gap: "32px", alignItems: isMobile ? "center" : "flex-end",
          padding: isMobile ? "20px 0" : "40px 0 0",
        }}>
          {/* Main Cover */}
          <div style={{
            width: isMobile ? "160px" : "220px",
            aspectRatio: "3/4", flexShrink: 0,
            borderRadius: "16px", overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            border: "1px solid var(--gh-border2)",
            background: "var(--gh-surface2)",
          }}>
            {game.coverUrl ? (
              <img src={game.coverUrl} alt={game.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>🎮</div>
            )}
          </div>

          {/* Title Info */}
          <div style={{ flex: 1, textAlign: isMobile ? "center" : "left", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: isMobile ? "center" : "flex-start", marginBottom: "12px" }}>
               <span style={{ 
                 padding: "2px 10px", borderRadius: "6px", 
                 background: "var(--gh-surface2)", border: "1px solid var(--gh-border2)",
                 fontSize: "12px", color: "var(--gh-text2)", fontWeight: 600 
               }}>
                 {platform.emoji} {platform.name.toUpperCase()}
               </span>
               {game.releaseYear && <span style={{ color: "var(--gh-text3)", fontSize: "12px" }}>{game.releaseYear}</span>}
            </div>
            
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: isMobile ? "32px" : "48px",
              fontWeight: 900, color: "var(--gh-text)", lineHeight: 1.1,
              textShadow: "0 4px 12px rgba(0,0,0,0.5)", margin: "0 0 16px 0",
            }}>
              {game.title}
            </h1>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
              {game.genres.map(g => (
                <span key={g} style={{
                  fontSize: "11px", padding: "4px 12px", borderRadius: "100px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--gh-border)",
                  color: "var(--gh-text2)", backdropFilter: "blur(4px)"
                }}>{g}</span>
              ))}
              {game.metacritic && (
                <span style={{
                  fontSize: "12px", fontWeight: 700, borderRadius: "6px",
                  background: game.metacritic >= 75 ? "rgba(0,230,118,0.1)" : "rgba(255,145,0,0.1)",
                  color: game.metacritic >= 75 ? "var(--gh-green)" : "var(--gh-orange)",
                  border: `1px solid ${game.metacritic >= 75 ? "var(--gh-green-dim)" : "var(--gh-orange-dim)"}`,
                  padding: "2px 8px"
                }}>MC {game.metacritic}</span>
              )}
            </div>
          </div>

          {/* Quick Stats Grid */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="gh-card" style={{ padding: "16px", minWidth: "120px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-display)" }}>{hoursPlayed}h</div>
                <div style={{ fontSize: "10px", color: "var(--gh-text3)", textTransform: "uppercase" }}>Played</div>
              </div>
              <div className="gh-card" style={{ padding: "16px", minWidth: "120px", textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--gh-cyan)" }}>{Math.round(completionPct)}%</div>
                <div style={{ fontSize: "10px", color: "var(--gh-text3)", textTransform: "uppercase" }}>Status</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Screenshots Gallery ──────────────────────── */}
      {screenshots.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
           <div className="hide-scrollbar" style={{ 
             display: "flex", gap: "16px", overflowX: "auto", padding: "4px 0 20px" 
           }}>
             {screenshots.map((url, i) => (
               <div key={i} style={{ 
                 flexShrink: 0, width: "320px", aspectRatio: "16/9", 
                 borderRadius: "12px", overflow: "hidden", border: "1px solid var(--gh-border2)",
                 boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
               }}>
                 <img src={url} alt={`Screenshot ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
               </div>
             ))}
           </div>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "340px 1fr",
        gap: "32px",
        alignItems: "start",
      }}>
        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
           <div className="gh-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "16px", fontFamily: "var(--font-display)" }}>YOUR STATUS</h3>
              <StatusSelector
                value={status}
                onChange={(s: GameStatus) => patch({ status: s })}
                disabled={isPatching}
              />
              <div style={{ marginTop: "20px" }}>
                <StarRating
                  value={userRating}
                  onChange={(r) => patch({ userRating: r })}
                  disabled={isPatching}
                />
              </div>
           </div>

           <div className="gh-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "12px", fontFamily: "var(--font-display)" }}>PERSONAL NOTES</h3>
              <textarea
                ref={notesRef}
                defaultValue={userNotes ?? ""}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Thoughts on this game..."
                rows={6}
                style={{
                  width: "100%", background: "var(--gh-bg3)", border: "1px solid var(--gh-border2)",
                  borderRadius: "12px", padding: "12px", color: "var(--gh-text)",
                  fontFamily: "var(--font-body)", fontSize: "13px", resize: "none", outline: "none"
                }}
              />
           </div>

           {game.description && !isMobile && (
             <div className="gh-card" style={{ padding: "24px" }}>
               <h3 style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "12px", fontFamily: "var(--font-display)" }}>ABOUT</h3>
               <p style={{ fontSize: "13px", color: "var(--gh-text2)", lineHeight: "1.7", margin: 0 }}>
                 {game.description}
               </p>
             </div>
           )}
        </div>

        {/* Column 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Progress / Achievements Summary */}
          <div className="gh-card" style={{ padding: "32px", display: "flex", alignItems: "center", gap: "40px", flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: isMobile ? "center" : "flex-start" }}>
             <CompletionRing pct={completionPct} size={120} strokeWidth={10} />
             <div>
                <h2 style={{ fontSize: "32px", fontWeight: 800, fontFamily: "var(--font-display)", margin: 0 }}>{Math.round(completionPct)}% Complete</h2>
                <p style={{ color: "var(--gh-text2)", margin: "4px 0 16px" }}>
                   You've spent <strong>{hoursPlayed} hours</strong> on this adventure.
                </p>
                <div style={{ display: "flex", gap: "24px" }}>
                   <div>
                     <div style={{ fontSize: "18px", fontWeight: 700 }}>{userGame.achievementsEarned}</div>
                     <div style={{ fontSize: "11px", color: "var(--gh-text3)" }}>ACHIEVEMENTS</div>
                   </div>
                   {userGame.lastPlayedAt && (
                     <div>
                       <div style={{ fontSize: "18px", fontWeight: 700 }}>{formatDistanceToNow(new Date(userGame.lastPlayedAt), { addSuffix: true })}</div>
                       <div style={{ fontSize: "11px", color: "var(--gh-text3)" }}>LAST PLAYED</div>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Session History */}
          <div className="gh-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "20px", fontFamily: "var(--font-display)" }}>PLAY SESSIONS</h3>
            <SessionHistory sessions={sessions} userGameId={gameId ?? ""} platform={userGame.platform} isLoading={sessionsLoading} />
          </div>

          {/* Game Insights (JSONB Stats) */}
          {userGame.stats && Object.keys(userGame.stats).length > 0 && (
            <div className="gh-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "20px", fontFamily: "var(--font-display)" }}>GAME INSIGHTS</h3>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: "16px" }}>
                {Object.entries(userGame.stats).slice(0, 10).map(([key, value]) => (
                  <div key={key} style={{ 
                    padding: "16px", background: "var(--gh-bg3)", borderRadius: "12px",
                    border: "1px solid var(--gh-border2)" 
                  }}>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--gh-text)", fontFamily: "var(--font-display)" }}>
                      {typeof value === "number" ? value.toLocaleString() : String(value)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--gh-text3)", textTransform: "uppercase", marginTop: "4px" }}>
                      {key.replace(/_|Stat/g, " ").trim()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements Grid */}
          {userGame.achievementsTotal > 0 && (
            <div className="gh-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "12px", color: "var(--gh-text3)", marginBottom: "20px", fontFamily: "var(--font-display)" }}>ACHIEVEMENTS ({userGame.achievementsEarned}/{userGame.achievementsTotal})</h3>
              <AchievementsGrid achievements={achievements} earned={userGame.achievementsEarned} total={userGame.achievementsTotal} isLoading={achievementsLoading} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
