import { useState } from "react";
import { usePlatforms, useConnectPlatform, useTriggerSync } from "../hooks/usePlatforms.ts";
import { PLATFORMS } from "../lib/platforms.ts";
import { PlatformCard } from "../components/platforms/PlatformCard.tsx";
import { NintendoConnectModal } from "../components/platforms/NintendoConnectModal.tsx";
import { useToast } from "../stores/toast.ts";
import { Spinner } from "../components/ui/Spinner.tsx";
import type { PlatformId } from "@gamers-hub/types";

export function PlatformsPage() {
  const { data: connections = [], isLoading } = usePlatforms();
  const { mutateAsync: connectPlatform } = useConnectPlatform();
  const { mutateAsync: triggerSync } = useTriggerSync();
  const { success, error, info } = useToast();

  const [nintendoModalOpen, setNintendoModalOpen] = useState(false);
  const [syncAllActive, setSyncAllActive] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  // Build a map: platformId → connection (or undefined)
  const connectionMap = Object.fromEntries(
    connections.map((c) => [c.platform, c]),
  ) as Record<PlatformId, (typeof connections)[number] | undefined>;

  const connectedPlatforms = connections.filter(
    (c) => c.syncStatus !== "error" || c.gamesCount > 0,
  );

  // ── Connect handler ───────────────────────────────────────────
  const handleConnect = async (platformId: PlatformId) => {
    if (platformId === "nintendo") {
      setNintendoModalOpen(true);
      return;
    }

    // OAuth flow — open popup
    try {
      const { authUrl } = await connectPlatform(platformId);

      const popup = window.open(
        authUrl,
        "oauth_connect",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );

      if (!popup) {
        error("Popup blocked. Please allow popups for this site and try again.");
        return;
      }

      const platformName = PLATFORMS.find((p) => p.id === platformId)?.name ?? platformId;
      info(`Opening ${platformName} login…`);

      const handler = async (event: MessageEvent) => {
        // Accept messages from the popup — in dev the API (port 3000) differs from
        // the frontend origin (port 5173), so we can't enforce same-origin here.
        // We verify the payload shape (success + matching platform) instead.
        if (
          (event.data as { success?: boolean; platform?: string } | null)?.success &&
          (event.data as { success?: boolean; platform?: string }).platform === platformId
        ) {
          window.removeEventListener("message", handler);
          popup.close();
          success(`${platformName} connected! Starting sync…`);
          try {
            await triggerSync(platformId);
          } catch { /* non-fatal */ }
        }
      };

      window.addEventListener("message", handler);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handler);
        }
      }, 500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes("not configured")) {
        error(`${platformId} is not configured. Add the API keys to your .env file.`);
      } else {
        error(`Failed to initiate ${platformId} connection`);
      }
    }
  };

  // ── Sync All handler ──────────────────────────────────────────
  const handleSyncAll = async () => {
    const connected = connections.filter((c) => c.gamesCount > 0 || c.syncStatus === "success");
    if (connected.length === 0) {
      info("No connected platforms to sync");
      return;
    }

    setSyncAllActive(true);
    setSyncAllProgress({ done: 0, total: connected.length });

    for (let i = 0; i < connected.length; i++) {
      try {
        await triggerSync(connected[i]!.platform);
        setSyncAllProgress({ done: i + 1, total: connected.length });
        if (i < connected.length - 1) await new Promise((r) => setTimeout(r, 600));
      } catch {
        /* continue with next platform on failure */
      }
    }

    setSyncAllActive(false);
    setSyncAllProgress(null);
    success(
      `Sync queued for ${connected.length} platform${connected.length !== 1 ? "s" : ""}`,
    );
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--gh-text)",
              letterSpacing: "1px",
              marginBottom: "4px",
            }}
          >
            MY PLATFORMS
          </h1>
          <p style={{ fontSize: "13px", color: "var(--gh-text3)" }}>
            {connectedPlatforms.length} of {PLATFORMS.length} platforms connected
          </p>
        </div>

        {connectedPlatforms.length > 0 && (
          <button
            onClick={() => { void handleSyncAll(); }}
            disabled={syncAllActive}
            style={{
              background: syncAllActive ? "var(--gh-surface2)" : "var(--gh-cyan-dim)",
              border: "1px solid rgba(0,229,255,0.4)",
              borderRadius: "10px",
              padding: "10px 20px",
              color: "var(--gh-cyan)",
              fontFamily: "var(--font-display)",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              cursor: syncAllActive ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s",
            }}
          >
            {syncAllActive ? (
              <>
                <Spinner size={14} />
                {syncAllProgress
                  ? `SYNCING ${syncAllProgress.done}/${syncAllProgress.total}…`
                  : "SYNCING…"}
              </>
            ) : (
              "↻ SYNC ALL"
            )}
          </button>
        )}
      </div>

      {/* Platform grid */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton gh-card" style={{ height: "180px" }} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {PLATFORMS.map((meta) => (
            <PlatformCard
              key={meta.id}
              meta={meta}
              connection={connectionMap[meta.id] ?? null}
              onConnect={handleConnect}
              syncAllActive={syncAllActive}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {nintendoModalOpen && <NintendoConnectModal onClose={() => setNintendoModalOpen(false)} />}
    </div>
  );
}
