"use client";

import { AppShell } from "@/components/layout/AppShell.tsx";
import { LayoutSwitch } from "@/components/LayoutSwitch.tsx";
import { ArchiveView } from "@/components/views/Archive.tsx";
import { LegacyArchive } from "@/components/views-legacy/Archive.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";
import type { PageFilters } from "@/lib/server/filters.ts";
import type { Memo, TagCount } from "@/lib/types.ts";

export interface ArchivePageClientProps {
  memos: Memo[];
  nextCursor: string | null;
  tags: TagCount[];
  filters: PageFilters;
  user: CurrentUser | null;
}

export function ArchivePageClient({
  memos,
  nextCursor,
  tags,
  filters,
  user,
}: ArchivePageClientProps) {
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
          <LegacyArchive
            memos={memos}
            nextCursor={nextCursor}
            initialTags={filters.tags}
            selectedDate={selectedDate}
          />
        </AppShell>
      )}
      renderNew={({ selectedDate }) => (
        <ArchiveView
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
