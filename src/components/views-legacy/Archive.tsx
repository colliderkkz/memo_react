"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { RotateCcw, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/lib/ui";
import type { Memo } from "@/lib/types.ts";
import {
  createDeleteActions,
  createRestoreActions,
  useStore,
} from "@/lib/state/memo-actions.ts";
import { useMemoPagination } from "@/lib/state/use-memo-pagination.ts";
import { useUpdateQuery } from "@/lib/utils/index.ts";
import { MemoCard } from "@/components/MemoCard.tsx";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { MemoFilterBar } from "@/components/MemoFilterBar.tsx";

export interface LegacyArchiveProps {
  memos: Memo[];
  nextCursor: string | null;
  initialTags: string[];
  selectedDate: Date | undefined;
}

export function LegacyArchive({
  memos: initialMemos,
  nextCursor: initialCursor,
  initialTags,
  selectedDate,
}: LegacyArchiveProps) {
  const router = useRouter();
  const updateQuery = useUpdateQuery();

  const del = useMemo(
    () => createDeleteActions(() => router.refresh()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const res = useMemo(
    () => createRestoreActions(() => router.refresh()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const delState = useStore(del.store);
  const resState = useStore(res.store);

  const extraParams = useMemo(() => {
    const p: Record<string, string> = { archivedOnly: "true" };
    if (selectedDate) p.date = format(selectedDate, "yyyy-MM-dd");
    if (initialTags.length > 0) p.tags = initialTags.join(",");
    return p;
  }, [selectedDate, initialTags]);

  const { allMemos, cursor, loadingMore, sentinelRef } = useMemoPagination({
    initialMemos,
    initialCursor,
    extraParams,
    errorText: "Failed to load more archived memos",
  });

  const filtered = useMemo(
    () =>
      allMemos.filter((m) => {
        const updatedAt = new Date(m.updatedAt);
        if (selectedDate && !isSameDay(updatedAt, selectedDate)) return false;
        if (initialTags.length > 0 && !initialTags.some((t) => m.tags.includes(t))) return false;
        return true;
      }),
    [allMemos, selectedDate, initialTags],
  );

  function toggleCardTag(tag: string) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((t) => t !== tag)
      : [...initialTags, tag];
    updateQuery({ tags: next });
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="px-1">
          <p className="text-sm font-medium text-foreground">Archive</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Archived memos — restore or permanently delete.
          </p>
        </div>

        <MemoFilterBar
          selectedDate={selectedDate}
          activeTags={initialTags}
          onRemoveTag={toggleCardTag}
        />

        <div className="space-y-3">
          {filtered.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              selectedDate={selectedDate}
              tags={memo.tags}
              activeTags={initialTags}
              onTagClick={toggleCardTag}
              content={
                <MarkdownContent
                  content={memo.content}
                  stripTags
                  className="max-h-48 overflow-y-auto"
                />
              }
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-normal text-muted-foreground"
                    disabled={resState.restoringId === memo.id}
                    onClick={() => res.restore(memo.id)}
                  >
                    <RotateCcw size={12} />
                    {resState.restoringId === memo.id ? "Restoring…" : "Restore"}
                  </Button>
                  <span className="flex-1" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5 font-normal"
                    onClick={() => del.request(memo.id)}
                  >
                    <Trash2 size={12} />
                    Delete
                  </Button>
                </>
              }
            />
          ))}

          {filtered.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">No archived memos.</p>
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

      <Dialog open={delState.showDeleteDialog} onOpenChange={del.setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete this memo?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The memo will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={del.cancel} disabled={delState.isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={del.confirm} disabled={delState.isDeleting}>
              {delState.isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
