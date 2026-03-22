import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { Achievement } from "@gamers-hub/types";

export function useGameAchievements(gameId: string, enabled = true) {
  return useQuery({
    queryKey: ["achievements", gameId],
    queryFn: async () => {
      const { data } = await api.get<Achievement[]>(`/games/${gameId}/achievements`);
      return data;
    },
    enabled: enabled && !!gameId,
    staleTime: 5 * 60 * 1000,
  });
}
