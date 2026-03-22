import { useState } from "react";
import type { PlatformId } from "@gamers-hub/types";

interface Props {
  platform: PlatformId;
  platformGameId: string;
}

/**
 * Returns the deep-link URL to launch/install a game on the given platform.
 * Returns null if the platform has no supported launch URL yet.
 */
function getLaunchUrl(platform: PlatformId, platformGameId: string): string | null {
  switch (platform) {
    case "steam":
      return `steam://run/${platformGameId}`;
    // Stubs — URLs are correct but disabled until those platforms are live
    // case "epic":
    //   return `com.epicgames.launcher://apps/${platformGameId}?action=launch&silent=true`;
    // case "gog":
    //   return `goggalaxy://openGame/${platformGameId}`;
    // case "ubisoft":
    //   return `uplay://launch/${platformGameId}/0`;
    // case "battlenet":
    //   return `battlenet://${platformGameId}`;
    default:
      return null;
  }
}

export function LaunchButton({ platform, platformGameId }: Props) {
  const [launched, setLaunched] = useState(false);
  const url = getLaunchUrl(platform, platformGameId);
  const isSupported = url !== null;

  function handleLaunch() {
    if (!url) return;
    // window.open works for custom protocol URLs in both browser and Tauri:
    // the OS intercepts "steam://" and hands it to the Steam client.
    window.open(url, "_self");
    setLaunched(true);
    setTimeout(() => setLaunched(false), 2000);
  }

  const label = isSupported
    ? launched
      ? "Launching…"
      : "▶  Launch"
    : "▶  Launch";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={handleLaunch}
        disabled={!isSupported || launched}
        title={
          isSupported
            ? `Open in ${platform === "steam" ? "Steam" : platform}`
            : "Launch not yet supported for this platform"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 24px",
          borderRadius: "10px",
          border: isSupported ? "1px solid var(--gh-cyan)" : "1px solid var(--gh-border2)",
          background: isSupported
            ? launched
              ? "rgba(0,230,118,0.15)"
              : "rgba(0,212,255,0.12)"
            : "var(--gh-surface)",
          color: isSupported
            ? launched
              ? "var(--gh-green)"
              : "var(--gh-cyan)"
            : "var(--gh-text3)",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          letterSpacing: "0.5px",
          cursor: isSupported && !launched ? "pointer" : "default",
          transition: "all 0.15s",
          boxShadow: isSupported && !launched
            ? "0 0 12px rgba(0,212,255,0.15)"
            : "none",
          opacity: !isSupported ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isSupported || launched) return;
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.2)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,212,255,0.3)";
        }}
        onMouseLeave={(e) => {
          if (!isSupported || launched) return;
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,255,0.12)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(0,212,255,0.15)";
        }}
      >
        {label}
      </button>
      {!isSupported && (
        <span style={{
          position: "absolute",
          top: "-22px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "10px",
          color: "var(--gh-text3)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          Coming soon
        </span>
      )}
    </div>
  );
}
