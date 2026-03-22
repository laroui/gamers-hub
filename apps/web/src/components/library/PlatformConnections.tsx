import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import type { PlatformConnection, SyncJobProgress } from "@gamers-hub/types";
import { usePlatforms, useTriggerSync } from "../../hooks/usePlatforms.ts";
import { getPlatform } from "../../lib/platforms.ts";
import { tokenStore } from "../../lib/api/client.ts";
import { useToast } from "../../stores/toast.ts";
import { Spinner } from "../ui/Spinner.tsx";

// ── Fetch-based SSE for sync progress ───────────────────────────

function useSyncProgress(platform: string, jobId: string | null): SyncJobProgress | null {
  const [progress, setProgress] = useState<SyncJobProgress | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    if (!jobId) return;
    const token = tokenStore.get();
    if (!token) return;

    aliveRef.current = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/v1/platforms/${platform}/sync/progress`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (aliveRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            if (chunk.startsWith("data: ")) {
              try {
                const data = JSON.parse(chunk.slice(6)) as SyncJobProgress;
                if (aliveRef.current) setProgress(data);
                if (data.stage === "done") return;
              } catch {
                // malformed chunk — skip
              }
            }
          }
        }
      } catch {
        // AbortError or network error — ignore
      } finally {
        if (aliveRef.current) setProgress(null);
      }
    })();

    return () => {
      aliveRef.current = false;
      controller.abort();
    };
  }, [jobId, platform]);

  return progress;
}

// ── Per-platform card ───────────────────────────────────────────

function PlatformCard({
  conn,
  onRefresh,
}: {
  conn: PlatformConnection;
  onRefresh: () => void;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const progress = useSyncProgress(conn.platform, jobId);
  const { mutateAsync: triggerSync, isPending } = useTriggerSync();
  const { success, error } = useToast();
  const meta = getPlatform(conn.platform);

  // When sync completes, toast + refresh
  useEffect(() => {
    if (progress?.stage === "done") {
      success(`${meta.name} synced — ${conn.gamesCount} games`);
      setJobId(null);
      onRefresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.stage]);

  const handleSync = async () => {
    try {
      const { jobId: id } = await triggerSync(conn.platform);
      setJobId(id);
    } catch {
      error("Sync failed");
    }
  };

  const isSyncing = isPending || jobId !== null;
  const progressText =
    progress && progress.stage !== "done"
      ? `${progress.message} (${progress.processed}/${progress.total})`
      : null;

  return (
    <div
      className="gh-card"
      style={{ padding: "14px 16px", minWidth: "220px", flexShrink: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "18px", color: meta.color }}>{meta.emoji}</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--gh-text)",
            }}
          >
            {meta.name}
          </span>
          <span className="pulse-dot" />
        </div>
        <button
          onClick={() => void handleSync()}
          disabled={isSyncing}
          style={{
            background: "transparent",
            border: "1px solid var(--gh-border2)",
            borderRadius: "6px",
            padding: "4px 8px",
            color: isSyncing ? "var(--gh-text3)" : "var(--gh-cyan)",
            cursor: isSyncing ? "not-allowed" : "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {isSyncing ? <Spinner size={12} /> : "↻"}
        </button>
      </div>

      <div style={{ fontSize: "11px", color: "var(--gh-text3)" }}>
        {progressText ?? (
          <>
            {conn.gamesCount} games ·{" "}
            {conn.lastSynced
              ? `synced ${formatDistanceToNow(new Date(conn.lastSynced), { addSuffix: true })}`
              : "never synced"}
          </>
        )}
      </div>
    </div>
  );
}

// ── Container ───────────────────────────────────────────────────

export function PlatformConnections() {
  const queryClient = useQueryClient();
  const { data: platforms, isLoading } = usePlatforms();
  const { mutateAsync: triggerSync } = useTriggerSync();
  const { success } = useToast();

  const connected = platforms ?? [];

  if (isLoading) return null;
  if (connected.length === 0) {
    return (
      <div
        style={{
          marginBottom: "24px",
          padding: "14px 16px",
          borderRadius: "12px",
          border: "1px dashed var(--gh-border2)",
          fontSize: "12px",
          color: "var(--gh-text3)",
          textAlign: "center",
        }}
      >
        Connect a platform to sync your games →{" "}
        <a href="/platforms" style={{ color: "var(--gh-cyan)", textDecoration: "none" }}>
          Platforms
        </a>
      </div>
    );
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["platforms"] });
    queryClient.invalidateQueries({ queryKey: ["library"] });
  };

  const handleSyncAll = async () => {
    for (const conn of connected) {
      await triggerSync(conn.platform);
      await new Promise<void>((r) => setTimeout(r, 500));
    }
    success("Sync triggered for all platforms");
  };

  return (
    <div style={{ marginBottom: "28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-display)",
            letterSpacing: "1px",
            color: "var(--gh-text3)",
          }}
        >
          CONNECTED PLATFORMS
        </div>
        {connected.length > 1 && (
          <button
            onClick={() => void handleSyncAll()}
            style={{
              background: "transparent",
              border: "1px solid var(--gh-border)",
              borderRadius: "6px",
              padding: "4px 10px",
              color: "var(--gh-text2)",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.5px",
            }}
          >
            SYNC ALL
          </button>
        )}
      </div>

      <div
        className="hide-scrollbar"
        style={{ display: "flex", gap: "12px", overflowX: "auto", scrollbarWidth: "none" }}
      >
        {connected.map((conn) => (
          <PlatformCard key={conn.id} conn={conn} onRefresh={handleRefresh} />
        ))}
      </div>
    </div>
  );
}
