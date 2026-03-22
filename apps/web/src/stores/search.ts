import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchStore {
  isOpen: boolean;
  query: string;
  recentSearches: string[];
  open: () => void;
  close: () => void;
  setQuery: (q: string) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      query: "",
      recentSearches: [],

      open: () => set({ isOpen: true, query: "" }),
      close: () => set({ isOpen: false, query: "" }),

      setQuery: (q) => set({ query: q }),

      addRecentSearch: (q) => {
        const trimmed = q.trim();
        if (!trimmed || trimmed.length < 2) return;
        const current = get().recentSearches.filter((s) => s !== trimmed);
        set({ recentSearches: [trimmed, ...current].slice(0, 8) });
      },

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "gh-search",
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);
