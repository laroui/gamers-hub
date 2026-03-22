import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { UserGame } from "@gamers-hub/types";

export function useRecentlyPlayed(limit = 10) {
  return useQuery({
    queryKey: ["library", "recent", limit],
    queryFn: async () => {
      const { data } = await api.get<UserGame[]>("/library/recent", {
        params: { limit },
      });
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
