import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import { useAuth } from "../lib/auth/AuthProvider.tsx";
import type { User } from "@gamers-hub/types";

export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: async (patch: { username?: string; avatarUrl?: string | null }) => {
      const { data } = await api.patch<User>("/auth/me", patch);
      return data;
    },
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["profile", "me"], updatedUser);
      await refreshUser();
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const { data } = await api.post<User>("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(["profile", "me"], updatedUser);
      await refreshUser();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      await api.post("/auth/change-password", payload);
    },
  });
}
