"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { Lock, RotateCcw, Trash2 } from "lucide-react";
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
import { groupBy, useUpdateQuery } from "@/lib/utils/index.ts";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { Masthead } from "@/components/layout/Masthead.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";

export interface ArchiveViewProps {
  memos: Memo[];
  nextCursor: string | null;
  initialTags: string[];
  selectedDate: Date | undefined;
  user: CurrentUser | null;
}

function groupByMonth(items: Memo[]) {
  return [...groupBy(items, (m) => new Date(m.createdAt).toISOString().slice(0, 7)).entries()].sort(
    (a, b) => b[0].localeCompare(a[0]),
  );
}

function monthLabel(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  const d = new Date(year!, month! - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function ArchiveView({
  memos: initialMemos,
  nextCursor: initialCursor,
  initialTags,
  selectedDate,
  user,
}: ArchiveViewProps) {
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
        return !(initialTags.length > 0 && !initialTags.some((t) => m.tags.includes(t)));
      }),
    [allMemos, selectedDate, initialTags],
  );
  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  function toggleTag(tag: string) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((t) => t !== tag)
      : [...initialTags, tag];
    updateQuery({ tags: next });
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <div className="max-w-280 mx-auto px-4 sm:px-8 pb-24 pt-7">
          <Masthead user={user} />

          {/* Page heading */}
          <div className="max-w-180 mx-auto mb-8">
            <div className="relative inline-block">
              <h1 className="font-serif font-semibold text-7 text-foreground leading-none">
                archive
              </h1>
              <span className="absolute left-0 -bottom-1.5 h-0.5 w-8 rounded-sm bg-accent" />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Archived memos — restore or permanently delete.
            </p>
          </div>

          {/* Archive list */}
          <div className="max-w-180 mx-auto space-y-10">
            {grouped.map(([monthKey, items]) => (
              <section key={monthKey}>
                {/* Month header */}
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="font-serif font-semibold text-lg text-foreground shrink-0">
                    {monthLabel(monthKey)}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                    {items.length} entries
                  </span>
                </div>

                {/* Entries */}
                <div className="space-y-2">
                  {items.map((memo) => (
                    <div
                      key={memo.id}
                      className="group px-3.5 py-3 rounded-md
                  border border-transparent hover:border-border hover:bg-muted transition-colors"
                    >
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {dateLabel(memo.createdAt)}
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

                      {/* Hover actions */}
                      <div
                        className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border
                    memo-hover-actions transition-opacity"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 font-normal text-muted-foreground"
                          disabled={resState.restoringId === memo.id}
                          onClick={() => res.restore(memo.id)}
                        >
                          <RotateCcw size={12} />
                          {resState.restoringId === memo.id ? "Restoring..." : "Restore"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5 font-normal ml-auto"
                          onClick={() => del.request(memo.id)}
                        >
                          <Trash2 size={12} />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {filtered.length === 0 ? (
              <p className="text-center py-16 text-muted-foreground text-sm">No archived memos.</p>
            ) : null}

            {/* sentinel for infinite scroll */}
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
