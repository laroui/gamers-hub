import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { UserGame } from "@gamers-hub/types";
import { GameCard } from "./GameCard.tsx";
import { GameListRow } from "./GameListRow.tsx";
import { Spinner } from "../ui/Spinner.tsx";

interface GamesGridProps {
  pages: { data: UserGame[] }[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  viewMode: "grid" | "list";
  onFetchNextPage: () => void;
}

export function GamesGrid({
  pages,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  viewMode,
  onFetchNextPage,
}: GamesGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onFetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage]);

  const allGames = pages.flatMap((page) => page.data);

  if (isLoading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 16 }, (_, i) => (
          <GameCard.Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (allGames.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 20px",
          color: "var(--gh-text3)",
          fontFamily: "var(--font-display)",
          fontSize: "16px",
          letterSpacing: "1px",
        }}
      >
        NO GAMES FOUND
        <div
          style={{
            fontSize: "13px",
            marginTop: "8px",
            fontFamily: "var(--font-body)",
            letterSpacing: 0,
          }}
        >
          Try adjusting your filters or connect a platform to sync your library.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={viewMode === "grid" ? gridStyle : listStyle}>
        {allGames.map((game) =>
          viewMode === "grid" ? (
            <GameCard key={game.id} game={game} />
          ) : (
            <GameListRow key={game.id} game={game} />
          ),
        )}
      </div>

      <div ref={sentinelRef} style={{ height: "1px" }} />

      {isFetchingNextPage && (
        <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
          <Spinner size={24} />
        </div>
      )}
    </div>
  );
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "16px",
};

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};
