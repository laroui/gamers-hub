import { useState } from "react";
import { api } from "../../lib/api/client.ts";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../stores/toast.ts";
import { useTriggerSync } from "../../hooks/usePlatforms.ts";

export function NintendoConnectModal({ onClose }: { onClose: () => void }) {
  const [sessionToken, setSessionToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: triggerSync } = useTriggerSync();

  const handleConnect = async () => {
    if (!sessionToken.trim()) {
      error("Session token is required");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/auth/nintendo-token", { sessionToken: sessionToken.trim() });
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      success("Nintendo connected! Starting initial sync…");
      try {
        await triggerSync("nintendo");
      } catch { /* non-fatal */ }
      onClose();
    } catch (err: unknown) {
      error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to connect Nintendo account",
      );
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "28px" }}>🔴</span>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--gh-text)",
              margin: 0,
            }}
          >
            Connect Nintendo
          </h3>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "var(--gh-text2)",
            lineHeight: "1.6",
            marginBottom: "16px",
          }}
        >
          Nintendo Switch Online requires a session token obtained via{" "}
          <a
            href="https://github.com/nickel-org/nxapi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gh-cyan)" }}
          >
            nxapi
          </a>
          . Run{" "}
          <code
            style={{
              background: "var(--gh-surface2)",
              padding: "1px 5px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            nxapi nso auth
          </code>{" "}
          then paste your session token below.
        </p>

        <label
          style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "var(--gh-text3)",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Session Token
          </span>
          <textarea
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
            placeholder="Paste your Nintendo session token here…"
            rows={3}
            style={{
              background: "var(--gh-surface)",
              border: "1px solid var(--gh-border2)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "var(--gh-text)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              outline: "none",
              resize: "none",
              lineHeight: "1.5",
            }}
          />
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
            {isLoading ? "CONNECTING..." : "CONNECT"}
          </button>
        </div>
      </div>
    </div>
  );
}
