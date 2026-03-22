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
    queryKey: ["stats", "heatmap", year],
    queryFn: async () => {
      const { data } = await api.get<PlayHeatmap>("/stats/heatmap", {
        params: { year },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1h
  });
}

export function usePlayStreaks() {
  return useQuery({
    queryKey: ["stats", "streaks"],
    queryFn: async () => {
      const { data } = await api.get<PlayStreaks>("/stats/streaks");
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useWeeklyPlaytime(weeks = 12) {
  return useQuery({
    queryKey: ["stats", "weekly", weeks],
    queryFn: async () => {
      const { data } = await api.get<WeeklyPlaytime[]>("/stats/weekly", {
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
      const { data } = await api.get<Omit<PlaytimeByPlatform, "hours">[]>("/stats/platforms");
      return data.map((d) => ({ ...d, hours: Math.round(d.minutes / 60) }));
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function usePlaytimeByGenre() {
  return useQuery({
    queryKey: ["stats", "genre"],
    queryFn: async () => {
      const { data } = await api.get<Omit<PlaytimeByGenre, "hours">[]>("/stats/genres");
      return data.map((d) => ({ ...d, hours: Math.round(d.minutes / 60) }));
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useGamingWrapped(year: number) {
  return useQuery({
    queryKey: ["stats", "wrapped", year],
    queryFn: async () => {
      const { data } = await api.get<GamingWrapped>("/stats/wrapped", {
        params: { year },
      });
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}
