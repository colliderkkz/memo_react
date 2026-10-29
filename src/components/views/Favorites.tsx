"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { Heart, Lock } from "lucide-react";
import { Button } from "@/lib/ui";
import type { Memo } from "@/lib/types.ts";
import { createFavoriteActions, useStore } from "@/lib/state/memo-actions.ts";
import { useMemoPagination } from "@/lib/state/use-memo-pagination.ts";
import { groupBy, useUpdateQuery } from "@/lib/utils/index.ts";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { XImportForm } from "@/components/XImportForm.tsx";
import { Masthead } from "@/components/layout/Masthead.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";

export interface FavoritesViewProps {
  memos: Memo[];
  nextCursor: string | null;
  initialTags: string[];
  selectedDate: Date | undefined;
  user: CurrentUser | null;
}

export function FavoritesView({
  memos: initialMemos,
  nextCursor: initialCursor,
  initialTags,
  selectedDate,
  user,
}: FavoritesViewProps) {
  const router = useRouter();
  const updateQuery = useUpdateQuery();

  const favorite = useMemo(
    () => createFavoriteActions(() => router.refresh()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const favoriteState = useStore(favorite.store);

  const extraParams = useMemo(() => {
    const p: Record<string, string> = { favoritesOnly: "true" };
    if (selectedDate) p.date = format(selectedDate, "yyyy-MM-dd");
    if (initialTags.length > 0) p.tags = initialTags.join(",");
    return p;
  }, [selectedDate, initialTags]);

  const { allMemos, cursor, loadingMore, sentinelRef } = useMemoPagination({
    initialMemos,
    initialCursor,
    extraParams,
    errorText: "Failed to load more favorite memos",
  });

  const filtered = useMemo(
    () =>
      allMemos.filter((memo) => {
        if (selectedDate && !isSameDay(new Date(memo.updatedAt), selectedDate)) return false;
        return !(initialTags.length > 0 && !initialTags.some((tag) => memo.tags.includes(tag)));
      }),
    [allMemos, selectedDate, initialTags],
  );
  const grouped = useMemo(
    () =>
      [
        ...groupBy(filtered, (memo) => new Date(memo.createdAt).toISOString().slice(0, 7)).entries(),
      ].sort((a, b) => b[0].localeCompare(a[0])),
    [filtered],
  );

  function toggleTag(tag: string) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((activeTag) => activeTag !== tag)
      : [...initialTags, tag];
    updateQuery({ tags: next });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-280 mx-auto px-4 sm:px-8 pb-24 pt-7">
        <Masthead user={user} />

        <div className="max-w-180 mx-auto mb-8">
          <div className="relative inline-block">
            <h1 className="font-serif font-semibold text-7 text-foreground leading-none">
              favorites
            </h1>
            <span className="absolute left-0 -bottom-1.5 h-0.5 w-8 rounded-sm bg-accent" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">Memos saved for quick access.</p>
        </div>

        <div className="max-w-180 mx-auto space-y-10">
          <XImportForm />

          {grouped.map(([monthKey, items]) => (
            <section key={monthKey}>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="font-serif font-semibold text-lg text-foreground shrink-0">
                  {new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <div className="flex-1 h-px bg-border" />
                <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                  {items.length} entries
                </span>
              </div>

              <div className="space-y-2">
                {items.map((memo) => (
                  <div
                    key={memo.id}
                    className="group px-3.5 py-3 rounded-md
                  border border-transparent hover:border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(memo.createdAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {memo.visibility === "private" ? (
                        <Lock size={10} className="text-muted-foreground opacity-50" />
                      ) : null}
                    </div>

                    <MarkdownContent
                      content={memo.content}
                      stripTags
                      className="max-h-48 overflow-y-auto text-sm leading-relaxed"
                    />

                    {memo.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {memo.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="inline-flex items-center gap-0.5 px-2 py-px rounded-full text-[11px]
                          border border-accent/25 text-accent hover:bg-accent/8 transition-colors"
                          >
                            <span className="opacity-50">#</span>
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div
                      className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border
                    memo-hover-actions transition-opacity"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 font-normal text-muted-foreground"
                        disabled={favoriteState.favoritingId === memo.id}
                        onClick={() => favorite.toggle(memo)}
                      >
                        <Heart size={12} fill="currentColor" />
                        {favoriteState.favoritingId === memo.id ? "Removing..." : "Unfavorite"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {filtered.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">No favorite memos.</p>
          ) : null}

          {cursor ? (
            <div ref={sentinelRef} className="h-4">
              {loadingMore ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <span className="inline-block w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  loading...
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
