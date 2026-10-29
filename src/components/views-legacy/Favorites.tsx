"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { Heart } from "lucide-react";
import { Button } from "@/lib/ui";
import type { Memo } from "@/lib/types.ts";
import { createFavoriteActions, useStore } from "@/lib/state/memo-actions.ts";
import { useMemoPagination } from "@/lib/state/use-memo-pagination.ts";
import { useUpdateQuery } from "@/lib/utils/index.ts";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { MemoCard } from "@/components/MemoCard.tsx";
import { MemoFilterBar } from "@/components/MemoFilterBar.tsx";
import { XImportForm } from "@/components/XImportForm.tsx";

export interface LegacyFavoritesProps {
  memos: Memo[];
  nextCursor: string | null;
  initialTags: string[];
  selectedDate: Date | undefined;
}

export function LegacyFavorites({
  memos: initialMemos,
  nextCursor: initialCursor,
  initialTags,
  selectedDate,
}: LegacyFavoritesProps) {
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

  function toggleTag(tag: string) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((activeTag) => activeTag !== tag)
      : [...initialTags, tag];
    updateQuery({ tags: next });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="px-1">
        <p className="text-sm font-medium text-foreground">Favorites</p>
        <p className="text-xs text-muted-foreground mt-0.5">Memos saved for quick access.</p>
      </div>

      <XImportForm />

      <MemoFilterBar selectedDate={selectedDate} activeTags={initialTags} onRemoveTag={toggleTag} />

      <div className="space-y-3">
        {filtered.map((memo) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            selectedDate={selectedDate}
            tags={memo.tags}
            activeTags={initialTags}
            onTagClick={toggleTag}
            content={
              <MarkdownContent content={memo.content} stripTags className="max-h-48 overflow-y-auto" />
            }
            actions={
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
            }
          />
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
  );
}
