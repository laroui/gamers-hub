import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { PlatformConnection, PlatformId } from "@gamers-hub/types";
import type { PlatformMeta } from "../../lib/platforms.ts";
import { useSyncProgress } from "../../hooks/useSyncProgress.ts";
import { useTriggerSync, useDisconnectPlatform } from "../../hooks/usePlatforms.ts";
import { useToast } from "../../stores/toast.ts";
import { Spinner } from "../ui/Spinner.tsx";

interface PlatformCardProps {
  meta: PlatformMeta;
  connection: PlatformConnection | null;
  onConnect: (platformId: PlatformId) => void;
  syncAllActive?: boolean;
}

export function PlatformCard({
  meta,
  connection,
  onConnect,
  syncAllActive = false,
}: PlatformCardProps) {
  const { mutateAsync: triggerSync, isPending: isSyncPending } = useTriggerSync();
  const { mutateAsync: disconnect } = useDisconnectPlatform();
  const { success, error } = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const { progress, isActive: isSyncing } = useSyncProgress(meta.id, jobId);

  const isConnected = connection !== null;
  const isDisabled = syncAllActive || isSyncPending || isSyncing;

  const handleSync = async () => {
    try {
      const { jobId: newJobId } = await triggerSync(meta.id);
      setJobId(newJobId);
    } catch {
      error(`Failed to start sync for ${meta.name}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect(meta.id);
      setShowDisconnectConfirm(false);
      success(`${meta.name} disconnected`);
    } catch {
      error(`Failed to disconnect ${meta.name}`);
    }
  };

  const progressLabel = progress
    ? progress.stage === "done"
      ? "Sync complete"
      : progress.total > 0
        ? `${progress.message} (${progress.processed}/${progress.total})`
        : progress.message
    : null;

  return (
    <>
      <div
        className="gh-card"
        style={{
          padding: "20px",
          border: `1px solid ${
            isSyncing
              ? "rgba(0,229,255,0.3)"
              : connection?.syncStatus === "error"
                ? "rgba(255,64,129,0.3)"
                : isConnected
                  ? "rgba(0,230,118,0.2)"
                  : "var(--gh-border)"
          }`,
          transition: "border-color 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Sync progress sweep at top of card */}
        {isSyncing && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, var(--gh-cyan), transparent)",
              animation: "syncSweep 1.5s ease-in-out infinite",
              width: "60%",
            }}
          />
        )}

        {/* Top row: icon + name + status indicator */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: isConnected ? `${meta.color}22` : "var(--gh-surface2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              filter: isConnected ? "none" : "grayscale(100%)",
              opacity: isConnected ? 1 : 0.5,
              flexShrink: 0,
              border: `1px solid ${isConnected ? `${meta.color}44` : "var(--gh-border)"}`,
            }}
          >
            {meta.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "16px",
                fontWeight: 700,
                color: isConnected ? "var(--gh-text)" : "var(--gh-text3)",
                letterSpacing: "0.3px",
              }}
            >
              {meta.name}
            </div>
            {isConnected && connection.displayName && (
              <div style={{ fontSize: "12px", color: "var(--gh-text3)", marginTop: "2px" }}>
                {connection.displayName}
              </div>
            )}
            {!isConnected && (
              <div style={{ fontSize: "11px", color: "var(--gh-text3)", marginTop: "2px" }}>
                {meta.description}
              </div>
            )}
          </div>

          {isConnected && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              {isSyncing ? (
                <Spinner size={14} />
              ) : (
                <div
                  className={connection.syncStatus === "syncing" ? "pulse-dot" : undefined}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background:
                      connection.syncStatus === "syncing"
                        ? "var(--gh-cyan)"
                        : connection.syncStatus === "error"
                          ? "var(--gh-pink)"
                          : connection.syncStatus === "success"
                            ? "var(--gh-green)"
                            : "var(--gh-text3)",
                    boxShadow:
                      connection.syncStatus === "success" ? "0 0 6px var(--gh-green)" : "none",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Stats row — only when connected */}
        {isConnected && (
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "14px",
              padding: "10px 12px",
              background: "var(--gh-bg3)",
              borderRadius: "8px",
              border: "1px solid var(--gh-border)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--gh-text)",
                  lineHeight: 1,
                }}
              >
                {connection.gamesCount}
              </div>
              <div style={{ fontSize: "10px", color: "var(--gh-text3)", letterSpacing: "0.5px" }}>
                GAMES
              </div>
            </div>
            <div style={{ width: "1px", background: "var(--gh-border)" }} />
            <div>
              <div style={{ fontSize: "12px", color: "var(--gh-text2)" }}>
                {isSyncing && progressLabel
                  ? progressLabel
                  : connection.syncStatus === "error"
                    ? "Sync failed"
                    : connection.lastSynced
                      ? `Synced ${formatDistanceToNow(new Date(connection.lastSynced), { addSuffix: true })}`
                      : "Never synced"}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {isConnected ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => { void handleSync(); }}
              disabled={isDisabled}
              style={{
                flex: 1,
                padding: "8px",
                background: "var(--gh-cyan-dim)",
                border: "1px solid rgba(0,229,255,0.3)",
                borderRadius: "8px",
                color: "var(--gh-cyan)",
                fontFamily: "var(--font-display)",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {isSyncing ? <Spinner size={12} /> : null}
              {isSyncing ? "SYNCING..." : "↻ SYNC NOW"}
            </button>
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              disabled={isDisabled}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid var(--gh-border)",
                borderRadius: "8px",
                color: "var(--gh-text3)",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) (e.currentTarget.style.color = "var(--gh-pink)");
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--gh-text3)";
              }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => meta.authType !== "stub" && onConnect(meta.id)}
            disabled={meta.authType === "stub"}
            style={{
              width: "100%",
              padding: "9px",
              background: "transparent",
              border: `1px solid ${meta.authType === "stub" ? "var(--gh-border)" : "var(--gh-cyan)"}`,
              borderRadius: "8px",
              color: meta.authType === "stub" ? "var(--gh-text3)" : "var(--gh-cyan)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              cursor: meta.authType === "stub" ? "not-allowed" : "pointer",
              opacity: meta.authType === "stub" ? 0.4 : 1,
              transition: "all 0.15s",
            }}
          >
            {meta.authType === "stub" ? "COMING SOON" : "+ CONNECT"}
          </button>
        )}
      </div>

      {showDisconnectConfirm && (
        <DisconnectModal
          platformName={meta.name}
          onConfirm={() => { void handleDisconnect(); }}
          onCancel={() => setShowDisconnectConfirm(false)}
        />
      )}
    </>
  );
}

function DisconnectModal({
  platformName,
  onConfirm,
  onCancel,
}: {
  platformName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "var(--gh-bg3)",
          border: "1px solid var(--gh-border2)",
          borderRadius: "20px",
          padding: "28px",
          width: "360px",
          maxWidth: "90vw",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "10px",
            color: "var(--gh-text)",
          }}
        >
          Disconnect {platformName}?
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "var(--gh-text2)",
            marginBottom: "24px",
            lineHeight: "1.6",
          }}
        >
          Your library data will remain but won&apos;t auto-update until you reconnect.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--gh-border2)",
              color: "var(--gh-text2)",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              background: "var(--gh-pink-dim)",
              border: "1px solid rgba(255,64,129,0.4)",
              color: "var(--gh-pink)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              cursor: "pointer",
            }}
          >
            DISCONNECT
          </button>
        </div>
      </div>
    </div>
  );
}
