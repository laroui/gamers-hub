import { useEffect } from "react";

export function useTauriEvents() {
  useEffect(() => {
    // Only run in Tauri context
    if (typeof window.__TAURI__ === "undefined") return;

    // Dynamically import Tauri API to avoid breaking web builds
    void import("@tauri-apps/api/event").then(({ listen }) => {
      const unlisten = listen("sync-all", () => {
        // Dispatch a custom DOM event that PlatformsPage can listen to
        window.dispatchEvent(new CustomEvent("gh:sync-all"));
      });
      return unlisten;
    });
  }, []);
}
