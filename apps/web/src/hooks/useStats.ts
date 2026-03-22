import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client.ts";
import type {
  PlayHeatmap,
  PlayStreaks,
  WeeklyPlaytime,
  GamingWrapped,
  LibraryStats,
} from "@gamers-hub/types";

interface PlaytimeByPlatform {
  platform: string;
  minutes: number;
  hours: number;
  games: number;
}

interface PlaytimeByGenre {
  genre: string;
  minutes: number;
  hours: number;
  games: number;
}

export function useLibraryStatsOverview() {
  return useQuery({
    queryKey: ["library", "stats"],
    queryFn: async () => {
      const { data } = await api.get<LibraryStats>("/library/stats");
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayHeatmap(year: number) {
  return useQuery({
    queryKey: ["sessions", "heatmap", year],
    queryFn: async () => {
      const { data } = await api.get<PlayHeatmap>("/sessions/heatmap", {
        params: { year },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1h
  });
}

export function usePlayStreaks() {
  return useQuery({
    queryKey: ["sessions", "streaks"],
    queryFn: async () => {
      const { data } = await api.get<PlayStreaks>("/sessions/streaks");
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useWeeklyPlaytime(weeks = 12) {
  return useQuery({
    queryKey: ["stats", "weekly", weeks],
    queryFn: async () => {
      const { data } = await api.get<WeeklyPlaytime[]>("/stats/playtime/weekly", {
        params: { weeks },
      });
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function usePlaytimeByPlatform() {
  return useQuery({
    queryKey: ["stats", "platform"],
    queryFn: async () => {
      const { data } = await api.get<PlaytimeByPlatform[]>("/stats/playtime/by-platform");
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function usePlaytimeByGenre() {
  return useQuery({
    queryKey: ["stats", "genre"],
    queryFn: async () => {
      const { data } = await api.get<PlaytimeByGenre[]>("/stats/playtime/by-genre");
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useGamingWrapped(year: number) {
  return useQuery({
    queryKey: ["stats", "wrapped", year],
    queryFn: async () => {
      const { data } = await api.get<GamingWrapped>(`/stats/wrapped/${year}`);
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
