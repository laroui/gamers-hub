import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { UserGame, Game } from "@gamers-hub/types";

export interface SearchResult {
  type: "owned" | "catalog";
  id: string;
  gameId: string;
  title: string;
  coverUrl: string | null;
  genres: string[];
  platform?: string;
  hoursPlayed?: number;
  status?: string;
  metacritic?: number | null;
  releaseYear?: number | null;
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", "global", query],
    queryFn: async (): Promise<{ owned: SearchResult[]; catalog: SearchResult[] }> => {
      if (query.length < 2) return { owned: [], catalog: [] };

      const [libraryRes, catalogRes] = await Promise.allSettled([
        api.get<{ data: UserGame[]; total: number }>("/library", {
          params: { search: query, limit: 5 },
        }),
        api.get<Game[]>("/games/search", {
          params: { q: query },
        }),
      ]);

      const ownedGames: UserGame[] =
        libraryRes.status === "fulfilled" ? libraryRes.value.data.data : [];

      const catalogGames: Game[] =
        catalogRes.status === "fulfilled" ? catalogRes.value.data : [];

      const ownedGameIds = new Set(ownedGames.map((g) => g.game.id));

      const owned: SearchResult[] = ownedGames.map((g) => ({
        type: "owned" as const,
        id: g.id,
        gameId: g.game.id,
        title: g.game.title,
        coverUrl: g.game.coverUrl ?? null,
        genres: g.game.genres ?? [],
        platform: g.platform,
        hoursPlayed: g.hoursPlayed,
        status: g.status,
        metacritic: g.game.metacritic,
        releaseYear: g.game.releaseYear,
      }));

      const catalog: SearchResult[] = catalogGames
        .filter((g) => !ownedGameIds.has(g.id))
        .slice(0, 5)
        .map((g) => ({
          type: "catalog" as const,
          id: g.id,
          gameId: g.id,
          title: g.title,
          coverUrl: g.coverUrl ?? null,
          genres: g.genres ?? [],
          metacritic: g.metacritic,
          releaseYear: g.releaseYear,
        }));

      return { owned, catalog };
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
    placeholderData: { owned: [], catalog: [] },
  });
}
