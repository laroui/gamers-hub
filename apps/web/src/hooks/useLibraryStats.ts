import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { LibraryStats } from "@gamers-hub/types";

export function useLibraryStats() {
  return useQuery({
    queryKey: ["library", "stats"],
    queryFn: async () => {
      const { data } = await api.get<LibraryStats>("/library/stats");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
