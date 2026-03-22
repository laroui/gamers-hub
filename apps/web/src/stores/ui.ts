import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameStatus, PlatformId, LibraryQueryParams } from "@gamers-hub/types";

// ── UI store (not persisted — resets on refresh) ──────────────
interface UIState {
  sidebarOpen: boolean;
  activePage: string;
  setSidebarOpen: (open: boolean) => void;
  setActivePage: (page: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  activePage: "library",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePage: (page) => set({ activePage: page }),
}));

// ── Library filter store (persisted) ─────────────────────────
interface LibraryFilterState {
  filters: LibraryQueryParams;
  viewMode: "grid" | "list";
  setFilter: <K extends keyof LibraryQueryParams>(key: K, value: LibraryQueryParams[K]) => void;
  resetFilters: () => void;
  setViewMode: (mode: "grid" | "list") => void;
}

const defaultFilters: LibraryQueryParams = {
  sort: "recent",
  limit: 40,
};

export const useLibraryStore = create<LibraryFilterState>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      viewMode: "grid",
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value, cursor: undefined },
        })),
      resetFilters: () => set({ filters: defaultFilters }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: "gh-library-filters",
      partialize: (state) => ({
        viewMode: state.viewMode,
        filters: { sort: state.filters.sort },
      }),
    },
  ),
);
