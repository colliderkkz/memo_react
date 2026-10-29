"use client";

import { AppShell } from "@/components/layout/AppShell.tsx";
import { LayoutSwitch } from "@/components/LayoutSwitch.tsx";
import { HomeView } from "@/components/views/Home.tsx";
import { LegacyHome } from "@/components/views-legacy/Home.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";
import type { PageFilters } from "@/lib/server/filters.ts";
import type { Memo, MemoStats, TagCount } from "@/lib/types.ts";

export interface HomePageClientProps {
  memos: Memo[];
  nextCursor: string | null;
  activityMemos: Memo[];
  memoStats: MemoStats;
  tags: TagCount[];
  filters: PageFilters;
  user: CurrentUser | null;
}

export function HomePageClient({
  memos,
  nextCursor,
  activityMemos,
  memoStats,
  tags,
  filters,
  user,
}: HomePageClientProps) {
  return (
    <LayoutSwitch
      dateFilter={filters.date}
      renderOld={({ selectedDate, onDateChange }) => (
        <AppShell
          tags={tags}
          activeTags={filters.tags}
          viewAsPublic={filters.viewAsPublic}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          user={user}
        >
          <LegacyHome
            memos={memos}
            nextCursor={nextCursor}
            tags={tags}
            initialSearch={filters.search}
            initialTags={filters.tags}
            viewAsPublic={filters.viewAsPublic}
            sortByUpdated={filters.sortByUpdated}
            selectedDate={selectedDate}
          />
        </AppShell>
      )}
      renderNew={({ selectedDate }) => (
        <HomeView
          memos={memos}
          nextCursor={nextCursor}
          activityMemos={activityMemos}
          memoStats={memoStats}
          tags={tags}
          initialSearch={filters.search}
          initialTags={filters.tags}
          viewAsPublic={filters.viewAsPublic}
          sortByUpdated={filters.sortByUpdated}
          selectedDate={selectedDate}
          user={user}
        />
      )}
    />
  );
}
