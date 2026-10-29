import { env } from "@/lib/server/bindings/index.ts";
import { getCurrentUser } from "@/lib/server/current-user.ts";
import { parsePageFilters } from "@/lib/server/filters.ts";
import {
  isMemoSearchWithinLimit,
  isValidMemoDate,
  listMemos,
  listTagCounts,
} from "@/lib/server/memos/index.ts";
import { urlFromSearchParams, type NextSearchParams } from "@/lib/server/page-url.ts";
import { ArchivePageClient } from "./archive-client.tsx";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 25;

function ErrorNote({ text }: { text: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
      {text}
    </main>
  );
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<NextSearchParams>;
}) {
  const filters = parsePageFilters(urlFromSearchParams(await searchParams));
  if (!isMemoSearchWithinLimit(filters.search)) {
    return <ErrorNote text="Search query is too long." />;
  }
  if (filters.date && !isValidMemoDate(filters.date)) {
    return <ErrorNote text="Invalid date filter." />;
  }

  const [{ memos, nextCursor }, tagCounts, user] = await Promise.all([
    listMemos(env.DB, {
      archivedOnly: true,
      date: filters.date || undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      limit: PAGE_LIMIT,
    }),
    listTagCounts(env.DB),
    getCurrentUser(),
  ]);

  return (
    <ArchivePageClient
      memos={memos}
      nextCursor={nextCursor}
      tags={tagCounts}
      filters={filters}
      user={user}
    />
  );
}
