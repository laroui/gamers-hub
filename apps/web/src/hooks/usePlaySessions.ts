import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { PlaySession, PlatformId } from "@gamers-hub/types";

interface SessionsResponse {
  data: PlaySession[];
  nextCursor: string | null;
}

export function usePlaySessions(userGameId?: string, limit = 10) {
  return useQuery({
    queryKey: ["sessions", userGameId],
    queryFn: async () => {
      const { data } = await api.get<SessionsResponse>(`/sessions/${userGameId}`, {
        params: { limit },
      });
      return data.data;
    },
    enabled: !!userGameId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLogSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userGameId: string;
      startedAt: string;
      minutes: number;
      platform: PlatformId;
      device?: string;
    }) => {
      const { data } = await api.post<PlaySession>("/sessions", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}
