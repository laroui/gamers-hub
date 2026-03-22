import { useState, useEffect, useRef } from "react";
import { tokenStore } from "../lib/api/client.ts";
import type { SyncJobProgress } from "@gamers-hub/types";

interface SyncState {
  progress: SyncJobProgress | null;
  isActive: boolean;
  error: string | null;
}

export function useSyncProgress(platform: string, jobId: string | null): SyncState {
  const [state, setState] = useState<SyncState>({
    progress: null,
    isActive: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const token = tokenStore.get();
    if (!token) return;

    // Abort any previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ progress: null, isActive: true, error: null });

    (async () => {
      try {
        const res = await fetch(
          `/api/v1/platforms/${platform}/sync/progress`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        if (!res.ok || !res.body) {
          setState({ progress: null, isActive: false, error: "Failed to connect to sync stream" });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            if (chunk.startsWith("data: ")) {
              try {
                const data = JSON.parse(chunk.slice(6)) as SyncJobProgress;
                setState({ progress: data, isActive: data.stage !== "done", error: null });
                if (data.stage === "done") return;
              } catch { /* malformed chunk, skip */ }
            }
          }
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setState({ progress: null, isActive: false, error: "Sync stream disconnected" });
      } finally {
        setState((prev) => ({ ...prev, isActive: false }));
      }
    })();

    return () => {
      abortRef.current?.abort();
    };
  }, [jobId, platform]);

  return state;
}
