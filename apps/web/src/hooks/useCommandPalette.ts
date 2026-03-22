import { useEffect } from "react";
import { useSearchStore } from "../stores/search.ts";

export function useCommandPalette() {
  const { open, close, isOpen } = useSearchStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? close() : open();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);
}
