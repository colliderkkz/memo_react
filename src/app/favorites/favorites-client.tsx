"use client";

import { AppShell } from "@/components/layout/AppShell.tsx";
import { LayoutSwitch } from "@/components/LayoutSwitch.tsx";
import { FavoritesView } from "@/components/views/Favorites.tsx";
import { LegacyFavorites } from "@/components/views-legacy/Favorites.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";
import type { PageFilters } from "@/lib/server/filters.ts";
import type { Memo, TagCount } from "@/lib/types.ts";

export interface FavoritesPageClientProps {
  memos: Memo[];
  nextCursor: string | null;
  tags: TagCount[];
  filters: PageFilters;
  user: CurrentUser | null;
}

export function FavoritesPageClient({
  memos,
  nextCursor,
  tags,
  filters,
  user,
}: FavoritesPageClientProps) {
  return (
    <LayoutSwitch
      dateFilter={filters.date}
      renderOld={({ selectedDate, onDateChange }) => (
        <AppShell
          tags={tags}
          activeTags={filters.tags}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          user={user}
        >
          <LegacyFavorites
            memos={memos}
            nextCursor={nextCursor}
            initialTags={filters.tags}
            selectedDate={selectedDate}
          />
        </AppShell>
      )}
      renderNew={({ selectedDate }) => (
        <FavoritesView
          memos={memos}
          nextCursor={nextCursor}
          initialTags={filters.tags}
          selectedDate={selectedDate}
          user={user}
        />
      )}
    />
  );
}
