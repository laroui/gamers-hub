import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api/client.ts";
import type { Post, PostComment, PaginatedResponse } from "@gamers-hub/types";

// ── Query keys ────────────────────────────────────────────────

export const postKeys = {
  all: ["posts"] as const,
  list: () => [...postKeys.all, "list"] as const,
  detail: (id: string) => [...postKeys.all, "detail", id] as const,
  comments: (id: string) => [...postKeys.all, "comments", id] as const,
};

// ── Hooks ─────────────────────────────────────────────────────

export function usePosts() {
  return useInfiniteQuery({
    queryKey: postKeys.list(),
    queryFn: async ({ pageParam = "0" }) => {
      const { data } = await api.get<PaginatedResponse<Post>>("/posts", {
        params: { cursor: pageParam, limit: 20 },
      });
      return data;
    },
    initialPageParam: "0",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<Post>(`/posts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: postKeys.comments(postId),
    queryFn: async () => {
      const { data } = await api.get<{ data: PostComment[]; nextCursor: string | null }>(
        `/posts/${postId}/comments`,
        { params: { limit: 50 } },
      );
      return data;
    },
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; body: string; coverUrl?: string | null; tags?: string[] }) => {
      const { data } = await api.post<Post>("/posts", body);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: postKeys.list() }),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data } = await api.post<{ liked: boolean }>(`/posts/${postId}/like`);
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: postKeys.list() }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      const { data } = await api.post<PostComment>(`/posts/${postId}/comments`, { body });
      return data;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: postKeys.comments(vars.postId) });
      void qc.invalidateQueries({ queryKey: postKeys.list() });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: string; commentId: string }) => {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: postKeys.comments(vars.postId) });
      void qc.invalidateQueries({ queryKey: postKeys.list() });
    },
  });
}
