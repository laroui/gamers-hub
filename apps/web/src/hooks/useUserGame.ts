import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type { UserGame, GameStatus } from "@gamers-hub/types";

export function useUserGame(userGameId: string) {
  return useQuery({
    queryKey: ["library", "game", userGameId],
    queryFn: async () => {
      const { data } = await api.get<UserGame>(`/library/${userGameId}`);
      return data;
    },
    enabled: !!userGameId,
    staleTime: 2 * 60 * 1000,
  });
}

interface UserGamePatch {
  status?: GameStatus;
  userRating?: number | null;
  userNotes?: string | null;
  completionPct?: number;
}

export function usePatchUserGame(userGameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: UserGamePatch) => {
      const { data } = await api.patch<UserGame>(`/library/games/${userGameId}`, patch);
      return data;
    },
    // Optimistic update — update cache immediately, revert on error
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["library", "game", userGameId] });
      const previous = queryClient.getQueryData<UserGame>(["library", "game", userGameId]);
      queryClient.setQueryData<UserGame>(["library", "game", userGameId], (old) =>
        old ? ({ ...old, ...patch } as UserGame) : old,
      );
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["library", "game", userGameId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["library", "game", userGameId] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
}
