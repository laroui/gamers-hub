import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { LibraryQueryParams, PaginatedResponse, UserGame } from "@gamers-hub/types";

export function useLibrary(filters: LibraryQueryParams) {
  return useInfiniteQuery({
    queryKey: ["library", filters],
    queryFn: async ({ pageParam }) => {
      const params = pageParam !== undefined
        ? { ...filters, cursor: pageParam }
        : { ...filters };
      const { data } = await api.get<PaginatedResponse<UserGame>>("/library", { params });
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
