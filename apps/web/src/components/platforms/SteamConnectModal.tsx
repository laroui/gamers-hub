import { useState } from "react";
import { api } from "../../lib/api/client.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../stores/toast.ts";
import { useTriggerSync } from "../../hooks/usePlatforms.ts";

export function SteamConnectModal({ onClose }: { onClose: () => void }) {
  const [steamId, setSteamId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: triggerSync } = useTriggerSync();

  const handleConnect = async () => {
    if (!steamId.trim()) {
      error("Steam ID is required");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/steam-key", { steamId: steamId.trim() });

      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      success("Steam connected! Starting initial sync…");

      try {
        await triggerSync("steam");
      } catch { /* sync trigger failure is non-fatal */ }

      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not connect Steam. Check your Steam ID and try again.";
      error(msg);
    } finally {
      setIsLoading(false);
    }
  };

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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--gh-bg3)",
          border: "1px solid var(--gh-border2)",
          borderRadius: "20px",
          padding: "28px",
          width: "420px",
          maxWidth: "90vw",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span style={{ fontSize: "28px" }}>🎮</span>
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--gh-text)",
                margin: 0,
              }}
            >
              Connect Steam
            </h3>
            <p style={{ fontSize: "12px", color: "var(--gh-text3)", margin: "2px 0 0" }}>
              Enter your Steam 64-bit ID to link your library
            </p>
          </div>
        </div>

        {/* Steam ID field */}
        <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
          <span
            style={{
              fontSize: "11px",
              color: "var(--gh-text3)",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Steam 64-bit ID
          </span>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleConnect(); }}
            placeholder="76561198000000000"
            autoFocus
            style={{
              background: "var(--gh-surface)",
              border: "1px solid var(--gh-border2)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "var(--gh-text)",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              outline: "none",
              letterSpacing: "1px",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--gh-text3)" }}>
            Find yours at{" "}
            <a
              href="https://steamid.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--gh-cyan)" }}
            >
              steamid.io
            </a>
            {" "}— look up your profile URL and copy the SteamID64 value
          </span>
        </label>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
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
            onClick={() => { void handleConnect(); }}
            disabled={isLoading}
            style={{
              flex: 2,
              padding: "10px",
              borderRadius: "8px",
              background: "var(--gh-cyan)",
              border: "none",
              color: "var(--gh-bg)",
              fontFamily: "var(--font-display)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "CONNECTING..." : "CONNECT STEAM"}
          </button>
        </div>
      </div>
    </div>
  );
}
