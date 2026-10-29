"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import {
  Archive,
  Check,
  ChevronRight,
  Clock3,
  Globe,
  Hash,
  Heart,
  Lock,
  Pencil,
  Search,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  type CommandItemData,
} from "@/lib/ui";
import type { Memo, MemoVisibility, TagCount } from "@/lib/types.ts";
import {
  createArchiveActions,
  createDeleteActions,
  createEditActions,
  createFavoriteActions,
  createPinActions,
  useStore,
} from "@/lib/state/memo-actions.ts";
import { apiCreateMemo, apiListMemos } from "@/lib/services/memos.ts";
import { showToast } from "@/lib/state/toast.ts";
import { useUpdateQuery } from "@/lib/utils/index.ts";
import { useTagAutocomplete } from "@/lib/state/use-tag-autocomplete.ts";
import { MemoCard } from "@/components/MemoCard.tsx";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { MarkdownEditor } from "@/components/MarkdownEditor.tsx";
import { MemoFilterBar } from "@/components/MemoFilterBar.tsx";

export interface LegacyHomeProps {
  memos: Memo[];
  nextCursor: string | null;
  tags: TagCount[];
  initialSearch: string;
  initialTags: string[];
  viewAsPublic: boolean;
  sortByUpdated: boolean;
  selectedDate: Date | undefined;
}

export function LegacyHome({
  memos: initialMemos,
  nextCursor: initialCursor,
  tags,
  initialSearch,
  initialTags,
  viewAsPublic,
  sortByUpdated,
  selectedDate,
}: LegacyHomeProps) {
  const router = useRouter();
  const updateQuery = useUpdateQuery();
  const refresh = useCallback(() => router.refresh(), [router]);

  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<MemoVisibility>("private");
  const [isSaving, setIsSaving] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [error, setError] = useState("");

  const [allMemos, setAllMemos] = useState(initialMemos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const loadingRef = useRef(loadingMore);
  loadingRef.current = loadingMore;
  const loadRequestSeq = useRef(0);

  const del = useMemo(() => createDeleteActions(refresh), [refresh]);
  const edit = useMemo(() => createEditActions(refresh), [refresh]);
  const pin = useMemo(() => createPinActions(refresh), [refresh]);
  const favorite = useMemo(() => createFavoriteActions(refresh), [refresh]);
  const arc = useMemo(() => createArchiveActions(refresh), [refresh]);
  const delState = useStore(del.store);
  const editState = useStore(edit.store);
  const pinState = useStore(pin.store);
  const favoriteState = useStore(favorite.store);
  const arcState = useStore(arc.store);

  const tagNames = useMemo(() => tags.map((t) => t.name), [tags]);
  const ac = useTagAutocomplete(tagNames);

  const visLabel = visibility === "public" ? "Public" : "Private";
  const hasSearch = Boolean(search.trim());
  const showCardResults = hasSearch || sortByUpdated;

  const filtered = useMemo(
    () =>
      allMemos.filter((m) => {
        const updatedAt = new Date(m.updatedAt);
        if (selectedDate && !isSameDay(updatedAt, selectedDate)) return false;
        if (initialTags.length > 0 && !initialTags.some((t) => m.tags.includes(t))) return false;
        if (!search) return true;
        return (
          m.content.toLowerCase().includes(search.toLowerCase()) ||
          m.tags.some((t) => t.includes(search.toLowerCase()))
        );
      }),
    [allMemos, selectedDate, initialTags, search],
  );
  const pinned = useMemo(() => filtered.filter((m) => m.pinned), [filtered]);
  const rest = useMemo(() => filtered.filter((m) => !m.pinned), [filtered]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setAllMemos(initialMemos);
    setCursor(initialCursor);
    cursorRef.current = initialCursor;
    setLoadingMore(false);
    loadingRef.current = false;
    loadRequestSeq.current += 1;
  }, [initialMemos, initialCursor]);

  const loadMore = useCallback((): Promise<boolean> => {
    const cur = cursorRef.current;
    if (!cur || loadingRef.current) return Promise.resolve(false);
    setLoadingMore(true);
    loadingRef.current = true;
    const requestSeq = loadRequestSeq.current;
    const queryParams = new URLSearchParams({ cursor: cur, limit: "25" });
    if (initialSearch) queryParams.set("search", initialSearch);
    if (selectedDate) queryParams.set("date", format(selectedDate, "yyyy-MM-dd"));
    if (initialTags.length > 0) queryParams.set("tags", initialTags.join(","));
    if (viewAsPublic) queryParams.set("publicOnly", "true");
    if (sortByUpdated) queryParams.set("sortByUpdated", "true");

    return apiListMemos(`/api/memos?${queryParams.toString()}`)
      .then((pageData) => {
        if (requestSeq !== loadRequestSeq.current) return false;
        setAllMemos((prev) => [...prev, ...pageData.memos]);
        setCursor(pageData.nextCursor);
        cursorRef.current = pageData.nextCursor;
        return pageData.memos.length > 0;
      })
      .catch(() => {
        if (requestSeq !== loadRequestSeq.current) return false;
        showToast("error", "Failed to load more memos");
        return false;
      })
      .finally(() => {
        if (requestSeq === loadRequestSeq.current) {
          setLoadingMore(false);
          loadingRef.current = false;
        }
      });
  }, [initialSearch, selectedDate, initialTags, viewAsPublic, sortByUpdated]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  function centerMemo(el: HTMLElement, behavior: ScrollBehavior) {
    const rect = el.getBoundingClientRect();
    const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(
      maxTop,
      Math.max(0, rect.top + window.scrollY - (window.innerHeight - rect.height) / 2),
    );
    window.scrollTo({ top: target, behavior });
  }

  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

  async function focusMemo(memoId: string, cancelled: () => boolean): Promise<boolean> {
    const el = document.getElementById(`memo-${memoId}`);
    if (!el) return false;

    for (let i = 0; i < 10 && cursorRef.current && !cancelled(); i++) {
      const rect = el.getBoundingClientRect();
      const desiredTop = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
      const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (desiredTop <= maxTop + 1) break;
      await loadMoreRef.current();
      await nextFrame();
    }
    if (cancelled()) return true;

    centerMemo(el, "smooth");
    const settle = () => centerMemo(el, "auto");
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", settle, { once: true });
    } else {
      setTimeout(settle, 500);
    }
    el.classList.add("memo-highlight");
    setTimeout(() => el.classList.remove("memo-highlight"), 2500);
    return true;
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && cursorRef.current && !loadingRef.current) {
          void loadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor]);

  function toggleCardTag(tag: string) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((t) => t !== tag)
      : [...initialTags, tag];
    updateQuery({ tags: next });
  }

  function cycleVisibility() {
    setVisibility(visibility === "public" ? "private" : "public");
  }

  function syncSearch(value: string) {
    setSearch(value);
    updateQuery({ search: value.trim() || null });
  }

  function clearSearch() {
    setSearch("");
    updateQuery({ search: null });
  }

  async function saveMemo() {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await apiCreateMemo(content, visibility);
      refresh();
      ac.close();
      setContent("");
      setSearch("");
      showToast("success", visibility === "public" ? "Memo published" : "Memo saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memo.");
    } finally {
      setIsSaving(false);
    }
  }

  // hash 深链（/memo/[id] 分享页重定向过来）
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#memo-")) return;
    const memoId = hash.replace("#memo-", "");

    let cancelled = false;
    const isCancelled = () => cancelled;
    (async () => {
      for (let i = 0; i < 60 && !cancelled; i++) {
        if (await focusMemo(memoId, isCancelled)) return;
        if (!cursorRef.current) break;
        await loadMoreRef.current();
        await nextFrame();
        await nextFrame();
      }
      if (!cancelled) showToast("error", "Shared memo could not be found");
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderCard(memo: Memo) {
    const isEditing = editState.editingId === memo.id;
    return (
      <MemoCard
        key={memo.id}
        memo={memo}
        selectedDate={selectedDate}
        hoverActions={!isEditing}
        tags={isEditing ? undefined : memo.tags}
        activeTags={initialTags}
        onTagClick={toggleCardTag}
        content={
          isEditing ? (
            <MarkdownEditor
              value={editState.editContent}
              onTextChange={edit.setEditContent}
              className="-mx-3 -my-1"
            />
          ) : (
            <MarkdownContent content={memo.content} stripTags className="max-h-48 overflow-y-auto" />
          )
        }
        actions={
          isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 font-normal"
                onClick={edit.cancel}
              >
                <X size={12} />
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-normal text-muted-foreground"
                onClick={() =>
                  edit.setEditVisibility(
                    editState.editVisibility === "public" ? "private" : "public",
                  )
                }
              >
                {editState.editVisibility === "public" ? <Globe size={11} /> : <Lock size={11} />}
                {editState.editVisibility === "public" ? "Public" : "Private"}
              </Button>
              <Button
                size="sm"
                className="gap-1.5 font-normal ml-auto"
                disabled={!editState.editContent.trim() || editState.isUpdating}
                onClick={() => edit.save(memo.id)}
              >
                <Check size={12} />
                {editState.isUpdating ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 font-normal ${
                  memo.pinned ? "text-accent" : "text-muted-foreground"
                } max-sm:px-2`}
                disabled={pinState.pinningId === memo.id}
                onClick={() => pin.toggle(memo)}
                aria-label={memo.pinned ? "Unpin memo" : "Pin memo"}
                title={memo.pinned ? "Unpin memo" : "Pin memo"}
              >
                <Star size={12} fill={memo.pinned ? "currentColor" : "none"} />
                <span className="hidden sm:inline">{memo.pinned ? "Unpin" : "Pin"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 font-normal ${
                  memo.favorite ? "text-accent" : "text-muted-foreground"
                } max-sm:px-2`}
                disabled={favoriteState.favoritingId === memo.id}
                onClick={() => favorite.toggle(memo)}
                aria-label={memo.favorite ? "Unfavorite memo" : "Favorite memo"}
                title={memo.favorite ? "Unfavorite memo" : "Favorite memo"}
              >
                <Heart size={12} fill={memo.favorite ? "currentColor" : "none"} />
                <span className="hidden sm:inline">
                  {memo.favorite ? "Unfavorite" : "Favorite"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 font-normal max-sm:px-2"
                onClick={() => edit.start(memo)}
                aria-label="Edit memo"
                title="Edit memo"
              >
                <Pencil size={12} />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 font-normal max-sm:px-2"
                disabled={arcState.archivingId === memo.id}
                onClick={() => {
                  arc.archive(memo.id);
                }}
                aria-label="Archive memo"
                title="Archive memo"
              >
                <Archive size={12} />
                <span className="hidden sm:inline">
                  {arcState.archivingId === memo.id ? "Archiving…" : "Archive"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 font-normal text-muted-foreground max-sm:px-2"
                title={memo.visibility === "private" ? "Only accessible to you" : "Share memo"}
                aria-label={memo.visibility === "public" ? "Share memo" : "Copy memo link"}
                onClick={() => {
                  const url = `${window.location.origin}/memo/${memo.id}`;
                  navigator.clipboard
                    .writeText(url)
                    .then(() => showToast("success", "Link copied to clipboard"))
                    .catch(() => {
                      const ta = document.createElement("textarea");
                      ta.value = url;
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                      showToast("success", "Link copied to clipboard");
                    });
                }}
              >
                <Share2 size={12} />
                <span className="hidden sm:inline">
                  {memo.visibility === "public" ? "Share" : "Copy link"}
                </span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 font-normal ml-auto max-sm:px-2"
                onClick={() => del.request(memo.id)}
                aria-label="Delete memo"
                title="Delete memo"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </>
          )
        }
      />
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="relative">
          <div className="bg-background border border-border rounded-lg shadow-xs overflow-hidden">
            <MarkdownEditor
              value={content}
              onTextChange={(v) => {
                setContent(v);
                ac.onValueChange(v);
              }}
              onKeyDown={(e) => {
                const next = ac.onKeydown(e);
                if (next !== null) setContent(next);
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void saveMemo();
              }}
              placeholder="What's on your mind? Markdown is supported."
              className="min-h-20"
            />
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={cycleVisibility}
                className="gap-1.5 font-normal text-muted-foreground"
              >
                {visibility === "public" ? <Globe size={11} /> : <Lock size={11} />}
                {visLabel}
              </Button>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground opacity-50 hidden sm:inline">
                ⌘ Enter
              </span>
              <Button size="sm" disabled={!content.trim() || isSaving} onClick={saveMemo}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {ac.open && ac.suggestions.length > 0 ? (
            <Command
              activeIndex={ac.activeIndex}
              onActiveIndexChange={ac.setActiveIndex}
              onSelect={(item: CommandItemData) => {
                const next = ac.select(item.key);
                setContent(next ?? content);
              }}
            >
              <CommandList className="absolute top-full left-0 right-0 mt-1 z-50">
                {ac.suggestions.map((tag, i) => (
                  <CommandItem key={tag} item={{ key: tag, label: tag }} index={i}>
                    <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{tag}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          ) : null}
        </div>

        {error ? (
          <Alert variant="error" className="flex items-start gap-2 py-2.5">
            <AlertDescription className="flex-1">{error}</AlertDescription>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-error/60 hover:text-error transition-colors"
            >
              <X size={13} />
            </button>
          </Alert>
        ) : null}

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search memos..."
            value={search}
            onChange={(e) => syncSearch(e.target.value)}
            className="pl-9 pr-17"
          />
          {hasSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-8.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={13} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => updateQuery({ sort: sortByUpdated ? null : "updated" })}
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded transition-colors ${
              sortByUpdated
                ? "bg-accent/10 text-accent hover:bg-accent/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            aria-pressed={sortByUpdated}
            aria-label={sortByUpdated ? "Sort by created time" : "Sort by updated time"}
            title={sortByUpdated ? "Sort by created time" : "Sort by updated time"}
          >
            <Clock3 size={13} />
          </button>
        </div>

        <MemoFilterBar
          selectedDate={selectedDate}
          activeTags={initialTags}
          onRemoveTag={toggleCardTag}
        />

        <div className="space-y-3">
          {showCardResults ? (
            filtered.map((memo) => renderCard(memo))
          ) : pinned.length > 0 ? (
            <Collapsible open={pinnedOpen} onOpenChange={setPinnedOpen}>
              <CollapsibleTrigger
                className="pinned-trigger w-fit max-w-full rounded px-0.5 py-px font-mono text-xs leading-5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={pinnedOpen ? "Collapse pinned memos" : "Expand pinned memos"}
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform"
                  style={{ transform: pinnedOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                />
                <code className="text-foreground">pinned</code>
                <span className="min-w-0 truncate">
                  {pinned.length} {pinned.length === 1 ? "entry" : "entries"}
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2">
                <div className="space-y-3 pb-1">{pinned.map((memo) => renderCard(memo))}</div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          {!showCardResults ? rest.map((memo) => renderCard(memo)) : null}

          {filtered.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground text-sm">No memos found.</p>
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
            <DialogTitle>Delete this memo?</DialogTitle>
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
