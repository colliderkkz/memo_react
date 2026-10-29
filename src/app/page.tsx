import { env } from "@/lib/server/bindings/index.ts";
import { getCurrentUser } from "@/lib/server/current-user.ts";
import { parsePageFilters } from "@/lib/server/filters.ts";
import {
  countMemoStats,
  isMemoSearchWithinLimit,
  isValidMemoDate,
  listMemoActivity,
  listMemos,
  listTagCounts,
} from "@/lib/server/memos/index.ts";
import { urlFromSearchParams, type NextSearchParams } from "@/lib/server/page-url.ts";
import { HomePageClient } from "./home-client.tsx";

export const dynamic = "force-dynamic";

const PAGE_LIMIT = 25;
const ACTIVITY_WEEKS = 14;

function activitySince(): string {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - today.getUTCDay() - (ACTIVITY_WEEKS - 1) * 7);
  return start.toISOString();
}

function ErrorNote({ text }: { text: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
      {text}
    </main>
  );
}

export default async function HomePage({
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
  const publicOnly = filters.viewAsPublic;
  const sortByUpdated = filters.sortByUpdated;

  const today = new Date().toISOString().slice(0, 10);

  const [{ memos, nextCursor }, tagCounts, memoStats, activityMemos, user] = await Promise.all([
    listMemos(env.DB, {
      search: filters.search || undefined,
      date: filters.date || undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      publicOnly,
      sortByUpdated,
      limit: PAGE_LIMIT,
    }),
    listTagCounts(env.DB, publicOnly),
    countMemoStats(env.DB, today, publicOnly),
    listMemoActivity(env.DB, publicOnly, activitySince()),
    getCurrentUser(),
  ]);

  return (
    <HomePageClient
      memos={memos}
      nextCursor={nextCursor}
      activityMemos={activityMemos}
      memoStats={memoStats}
      tags={tagCounts}
      filters={filters}
      user={user}
    />
  );
}
