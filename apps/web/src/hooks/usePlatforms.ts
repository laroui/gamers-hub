import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { PlatformConnection, PlatformId, SyncStatus } from "@gamers-hub/types";

// Shape the API actually returns from GET /platforms
// (all 10 platforms, with connected: boolean)
interface PlatformApiRow {
  platform: PlatformId;
  displayName: string;
  connected: boolean;
  gamesCount: number;
  lastSynced: string | null;
  syncStatus: SyncStatus;
}

export function usePlatforms() {
  return useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data } = await api.get<PlatformApiRow[]>("/platforms");
      // Only return connected platforms so PlatformCard.connection is null for disconnected
      return data.filter((c) => c.connected) as unknown as PlatformConnection[];
    },
    staleTime: 30 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (platform: string) => {
      const { data } = await api.post<{ jobId: string; message: string }>(
        `/platforms/${platform}/sync`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (platform: string) => {
      await api.delete(`/platforms/${platform}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useConnectPlatform() {
  return useMutation({
    mutationFn: async (platform: string) => {
      const { data } = await api.post<{ authUrl: string; state: string }>(
        `/platforms/${platform}/connect`,
      );
      return data;
    },
  });
}
