import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { PlatformConnection } from "@gamers-hub/types";

export function usePlatforms() {
  return useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data } = await api.get<PlatformConnection[]>("/platforms");
      return data;
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
      await api.delete(`/platforms/${platform}/disconnect`);
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
