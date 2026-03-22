import { useLibraryStore } from "../stores/ui.ts";
import { useLibrary } from "../hooks/useLibrary.ts";
import { StatsRow } from "../components/library/StatsRow.tsx";
import { RecentlyPlayed } from "../components/library/RecentlyPlayed.tsx";
import { PlatformConnections } from "../components/library/PlatformConnections.tsx";
import { FilterBar } from "../components/library/FilterBar.tsx";
import { GamesGrid } from "../components/library/GamesGrid.tsx";

export function LibraryPage() {
  const { filters, viewMode } = useLibraryStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useLibrary(filters);

  return (
    <div className="page-enter">
      <StatsRow />
      <RecentlyPlayed />
      <PlatformConnections />
      <FilterBar />
      <GamesGrid
        pages={data?.pages ?? []}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        viewMode={viewMode}
        onFetchNextPage={fetchNextPage}
      />
    </div>
  );
}
