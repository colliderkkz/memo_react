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
  RotateCw,
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
  HeatingRate,
  Textarea,
  Timeline,
  Tooltip,
  type CommandItemData,
  type TimelineGroup,
} from "@/lib/ui";
import type { Memo, MemoStats, MemoVisibility, TagCount } from "@/lib/types.ts";
import {
  createArchiveActions,
  createDeleteActions,
  createEditActions,
  createFavoriteActions,
  createPinActions,
  useStore,
} from "@/lib/state/memo-actions.ts";
import { apiCreateMemo, apiListMemos } from "@/lib/services/memos.ts";
import { apiGetQuote, apiResetQuote, apiSaveQuote } from "@/lib/services/settings.ts";
import { showToast } from "@/lib/state/toast.ts";
import { getCaretScreenPosition, groupBy, useUpdateQuery } from "@/lib/utils/index.ts";
import { useReveal } from "@/lib/utils/use-reveal.ts";
import { useTagAutocomplete } from "@/lib/state/use-tag-autocomplete.ts";
import { MarkdownContent } from "@/components/MarkdownContent.tsx";
import { MarkdownEditor } from "@/components/MarkdownEditor.tsx";
import { TagManagerDialog } from "@/components/TagManagerDialog.tsx";
import { Masthead } from "@/components/layout/Masthead.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";

const HEATING_WEEKS = 14;
const QUOTES = [
  "Beauty that accumulates through repetition, not through display.",
  "The surface of things is where meaning hides.",
  "A note kept is a thought that survived the morning.",
];

function groupByDay(items: Memo[]) {
  return [...groupBy(items, (m) => format(new Date(m.createdAt), "yyyy-MM-dd")).entries()].sort(
    (a, b) => b[0].localeCompare(a[0]),
  );
}

function dayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((base.getTime() - d.getTime()) / 86400000);
  const sub = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diff === 0) return { h: "today", sub, isToday: true };
  if (diff === 1) return { h: "yesterday", sub, isToday: false };
  return {
    h: d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase(),
    sub,
    isToday: false,
  };
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export interface HomeViewProps {
  memos: Memo[];
  nextCursor: string | null;
  activityMemos: Memo[];
  memoStats: MemoStats;
  tags: TagCount[];
  initialSearch: string;
  initialTags: string[];
  viewAsPublic: boolean;
  sortByUpdated: boolean;
  selectedDate: Date | undefined;
  user: CurrentUser | null;
}

export function HomeView({
  memos: initialMemos,
  nextCursor: initialCursor,
  activityMemos,
  memoStats,
  tags,
  initialSearch,
  initialTags,
  viewAsPublic,
  sortByUpdated,
  selectedDate,
  user,
}: HomeViewProps) {
  const router = useRouter();
  const updateQuery = useUpdateQuery();
  const refresh = useCallback(() => router.refresh(), [router]);

  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<MemoVisibility>("private");
  const [isSaving, setIsSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [customQuote, setCustomQuote] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);

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

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [tagMenuStyle, setTagMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!ac.open || !editorRef.current) return;

    function update() {
      if (!editorRef.current) return;
      const caretPosition = getCaretScreenPosition(editorRef.current);
      setTagMenuStyle({ left: caretPosition.x, top: caretPosition.y });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("selectionchange", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("selectionchange", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ac.open]);

  const visLabel = visibility === "public" ? "Public" : "Private";
  const activeSearch = search ?? initialSearch;
  const hasSearch = Boolean(activeSearch.trim());
  const showCardResults = hasSearch || sortByUpdated;

  const filtered = useMemo(
    () =>
      allMemos.filter((m) => {
        if (selectedDate && !isSameDay(new Date(m.updatedAt), selectedDate)) return false;
        if (initialTags.length > 0 && !initialTags.some((t) => m.tags.includes(t))) return false;
        if (!activeSearch) return true;
        return (
          m.content.toLowerCase().includes(activeSearch.toLowerCase()) ||
          m.tags.some((t) => t.includes(activeSearch.toLowerCase()))
        );
      }),
    [allMemos, selectedDate, initialTags, activeSearch],
  );
  const pinnedFiltered = useMemo(() => filtered.filter((m) => m.pinned), [filtered]);
  const unpinnedFiltered = useMemo(() => filtered.filter((m) => !m.pinned), [filtered]);
  const timelineContent: TimelineGroup<Memo>[] = useMemo(
    () =>
      groupByDay(unpinnedFiltered).map(([day, items]) => {
        const lbl = dayLabel(day);
        return { key: day, heading: lbl.h, subLabel: lbl.sub, isToday: lbl.isToday, items };
      }),
    [unpinnedFiltered],
  );

  const heatingDays = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - (HEATING_WEEKS - 1) * 7);

    const counts = new Map<string, number>();
    for (const memo of activityMemos) {
      const key = format(new Date(memo.createdAt), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from({ length: HEATING_WEEKS * 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      return {
        key,
        label: d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        value: d <= today ? (counts.get(key) ?? 0) : 0,
        disabled: d > today,
      };
    });
  }, [activityMemos]);

  const heatingStats = useMemo(
    () => [
      { label: "entries", value: activityMemos.length },
      { label: "tags in use", value: tags.length, clickable: true },
      { label: "days written", value: groupByDay(activityMemos).length },
    ],
    [activityMemos, tags],
  );

  function handleDayClick(day: { key: string }) {
    const current = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
    updateQuery({ date: current === day.key ? null : day.key });
  }

  function handleStatClick(stat: { label: string }) {
    if (stat.label === "tags in use") setTagManagerOpen(true);
  }

  const quote = customQuote ?? QUOTES[new Date().getDate() % QUOTES.length];

  function startEditQuote() {
    setQuoteDraft(quote ?? "");
    setEditingQuote(true);
  }

  async function saveQuote() {
    const text = quoteDraft.trim();
    if (!text || quoteBusy) return;
    setQuoteBusy(true);
    try {
      setCustomQuote(await apiSaveQuote(text));
      setEditingQuote(false);
      showToast("success", "句子已更新");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    } finally {
      setQuoteBusy(false);
    }
  }

  async function resetQuote() {
    if (quoteBusy) return;
    setQuoteBusy(true);
    try {
      await apiResetQuote();
      setCustomQuote(null);
      showToast("success", "已恢复每日轮换句子");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "恢复失败");
    } finally {
      setQuoteBusy(false);
    }
  }

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  // Reset accumulated memos when initial data changes (e.g. filter applied / refresh)
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

  // Infinite scroll: observe sentinel to load more
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

  // hash 深链（/memo/[id] 分享页重定向过来）：自动加载到目标并居中高亮
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

  useEffect(() => {
    let cancelled = false;
    apiGetQuote()
      .then((text) => {
        if (!cancelled) setCustomQuote(text);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTag(tag: string) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((t) => t !== tag)
      : [...initialTags, tag];
    updateQuery({ tags: next });
  }

  function syncSearch(value: string) {
    setSearch(value);
    updateQuery({ search: value.trim() || null });
  }

  function clearSearch() {
    setSearch("");
    updateQuery({ search: null });
  }

  function saveMemo() {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    setError("");
    apiCreateMemo(content, visibility)
      .then(() => {
        refresh();
        setContent("");
        setComposerOpen(false);
        ac.close();
        showToast("success", visibility === "public" ? "Memo published" : "Memo saved");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to save memo.");
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const quoteReveal = useReveal();
  const heatReveal = useReveal(90);
  const searchReveal = useReveal(180);

  function renderMemo(memo: Memo) {
    const isEditing = editState.editingId === memo.id;
    return (
      <div key={memo.id}>
        <p className="font-mono text-[11px] text-muted-foreground tracking-wide mb-1">
          {timeOnly(sortByUpdated ? memo.updatedAt : memo.createdAt)} · {memo.visibility}
        </p>

        <div
          id={`memo-${memo.id}`}
          data-memo-id={memo.id}
          className="group px-3.5 py-3 rounded-md transition-colors hover:bg-muted border border-transparent hover:border-border"
        >
          {memo.pinned && !isEditing ? (
            <span
              className="inline-flex items-center gap-1 mb-1.5 font-mono text-[10px] uppercase tracking-widest
                text-accent px-1.5 py-px rounded border border-accent/30"
            >
              <Star size={8} fill="currentColor" />
              pinned
            </span>
          ) : null}

          {isEditing ? (
            <MarkdownEditor
              value={editState.editContent}
              onTextChange={edit.setEditContent}
              className="-mx-1 -my-1"
            />
          ) : (
            <MarkdownContent
              content={memo.content}
              stripTags
              className="max-h-48 overflow-y-auto text-sm leading-relaxed"
            />
          )}

          {!isEditing && memo.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {memo.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="inline-flex items-center gap-0.5 px-2 py-px rounded-full text-xs
                    border border-accent/25 text-accent hover:bg-accent/8 transition-colors"
                >
                  <span className="opacity-50">#</span>
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="mt-2.5 pt-2.5 border-t border-border overflow-x-auto
              memo-hover-actions transition-opacity"
          >
            <div className="flex items-center gap-1 min-w-max">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 font-normal text-muted-foreground"
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
                    {editState.editVisibility === "public" ? (
                      <Globe size={11} />
                    ) : (
                      <Lock size={11} />
                    )}
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
                    className="gap-1.5 font-normal text-muted-foreground max-sm:px-2"
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
                    className="gap-1.5 font-normal text-muted-foreground max-sm:px-2"
                    disabled={arcState.archivingId === memo.id}
                    onClick={() => {
                      arc.archive(memo.id);
                    }}
                    aria-label="Archive memo"
                    title="Archive memo"
                  >
                    <Archive size={12} />
                    <span className="hidden sm:inline">
                      {arcState.archivingId === memo.id ? "Archiving..." : "Archive"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 font-normal text-muted-foreground max-sm:px-2"
                    title={
                      memo.visibility === "private" ? "Only accessible to you" : "Share memo"
                    }
                    aria-label={memo.visibility === "public" ? "Share memo" : "Copy memo link"}
                    onClick={() => {
                      const url = `${window.location.origin}/memo/${memo.id}`;
                      navigator.clipboard
                        .writeText(url)
                        .then(() => {
                          showToast("success", "Link copied to clipboard");
                        })
                        .catch(() => {
                          showToast("error", "Failed to copy link");
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
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <div className="max-w-280 mx-auto px-4 sm:px-8 pb-24 pt-7">
          <Masthead memoStats={memoStats} tags={tags} viewAsPublic={viewAsPublic} user={user} />

          {/* TAG STRIP */}
          <div className="flex gap-1.5 overflow-x-auto pb-3.5 mb-4 border-b border-border scrollbar-none">
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground px-1 py-1 self-center shrink-0">
              tags
            </span>
            {tags.map(({ name, count }) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleTag(name)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0 text-xs
            border transition-colors
            ${
              initialTags.includes(name)
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-accent/25 text-accent hover:bg-accent/8"
            }`}
              >
                <span className="opacity-50">#</span>
                {name}
                <span className="opacity-50 font-mono text-[10px]">{count}</span>
              </button>
            ))}
          </div>

          <div className="relative lg:hidden mb-4">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              placeholder="Search memos..."
              value={activeSearch}
              onChange={(e) => syncSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-17 rounded border border-border bg-background text-sm
          text-foreground placeholder:text-muted-foreground outline-none
          focus:border-accent transition-colors"
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

          {/* JOURNAL + RAIL */}
          <div className="anim-fade-up anim-delay-2 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              {composerOpen ? (
                <div className="relative mb-4 ui-fade-in-150">
                  <div className="border border-border rounded-lg bg-background shadow-xs overflow-hidden">
                    <MarkdownEditor
                      value={content}
                      onTextChange={(v) => {
                        setContent(v);
                        ac.onValueChange(v);
                      }}
                      editorRef={editorRef}
                      onBlur={() => setTimeout(() => ac.close(), 150)}
                      onKeyDown={(e) => {
                        const next = ac.onKeydown(e);
                        if (next !== null) setContent(next);
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveMemo();
                      }}
                      placeholder="A line for the notebook..."
                      className="min-h-15"
                    />
                    <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setVisibility(visibility === "public" ? "private" : "public")
                        }
                        className="gap-1.5 font-normal text-muted-foreground"
                      >
                        {visibility === "public" ? <Globe size={11} /> : <Lock size={11} />}
                        {visLabel}
                      </Button>
                      <span className="flex-1" />
                      <span className="text-xs text-muted-foreground opacity-50 hidden sm:inline">
                        Cmd+Enter
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => {
                          setComposerOpen(false);
                          setContent("");
                        }}
                      >
                        <X size={12} />
                      </Button>
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
                      <CommandList
                        className="fixed z-50 w-24 bg-background border border-border rounded-lg shadow-md"
                        style={tagMenuStyle}
                      >
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
              ) : (
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="w-full text-left px-4 py-3 rounded border border-dashed border-border
              text-muted-foreground font-serif text-sm italic
              hover:border-accent/40 hover:bg-muted transition-colors mb-4"
                >
                  <span className="text-accent mr-1.5">
                    <Pencil size={11} className="inline -mt-0.5" />
                  </span>
                  A line for the notebook -- click to write...
                </button>
              )}

              {error ? (
                <Alert variant="error" className="flex items-start gap-2 py-2.5 mb-4">
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

              {showCardResults ? (
                <div className="space-y-2">{filtered.map((memo) => renderMemo(memo))}</div>
              ) : pinnedFiltered.length > 0 ? (
                <Collapsible
                  open={pinnedOpen}
                  onOpenChange={setPinnedOpen}
                  className="mb-4"
                >
                  <CollapsibleTrigger
                    className="pinned-trigger w-fit max-w-full rounded px-0.5 py-px font-mono text-xs leading-5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={pinnedOpen ? "Collapse pinned memos" : "Expand pinned memos"}
                  >
                    <ChevronRight
                      size={14}
                      className="shrink-0 transition-transform"
                      style={{
                        transform: pinnedOpen ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    />
                    <code className="text-foreground">pinned</code>
                    <span className="min-w-0 truncate">
                      {pinnedFiltered.length} {pinnedFiltered.length === 1 ? "entry" : "entries"}
                    </span>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2">
                    <div className="space-y-1 pb-1">{pinnedFiltered.map((memo) => renderMemo(memo))}</div>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {!showCardResults ? (
                <>
                  <div className="hidden sm:block">
                    <Timeline groups={timelineContent} renderItem={(memo) => renderMemo(memo)} />
                  </div>

                  <div className="space-y-6 sm:hidden">
                    {timelineContent.map((group) => (
                      <section key={group.key}>
                        <div className="flex items-baseline gap-2 px-1 mb-2">
                          <span className="font-serif text-[1.0625rem] font-semibold text-foreground">
                            {group.heading}
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                            {group.subLabel}
                          </span>
                        </div>
                        <div className="space-y-1">{group.items.map((memo) => renderMemo(memo))}</div>
                      </section>
                    ))}
                  </div>
                </>
              ) : null}

              {filtered.length === 0 && !composerOpen ? (
                <p className="py-20 text-center text-sm text-muted-foreground">No memos found.</p>
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

            {/* RIGHT: sticky rail (hidden on mobile) */}
            <aside className="hidden min-w-0 lg:flex sticky top-8 flex-col gap-4 self-start">
              {/* quiet thought */}
              <div
                ref={quoteReveal}
                className="group/quote relative border border-border rounded-lg bg-muted p-4"
              >
                <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                  quiet thought
                </p>
                {editingQuote ? (
                  <>
                    <Textarea
                      value={quoteDraft}
                      onChange={(e) => setQuoteDraft(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        disabled={quoteBusy}
                        onClick={() => setEditingQuote(false)}
                      >
                        取消
                      </Button>
                      <Button
                        size="sm"
                        className="h-7"
                        disabled={quoteBusy || quoteDraft.trim().length === 0}
                        onClick={() => void saveQuote()}
                      >
                        保存
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-serif italic text-sm leading-relaxed text-foreground">
                      {quote}
                    </p>
                    <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 transition-opacity group-hover/quote:opacity-100 focus-within:opacity-100">
                      {customQuote ? (
                        <Tooltip content="恢复每日轮换" side="top">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            disabled={quoteBusy}
                            onClick={() => void resetQuote()}
                            aria-label="恢复每日轮换句子"
                          >
                            <RotateCw size={12} />
                          </Button>
                        </Tooltip>
                      ) : null}
                      <Tooltip content="编辑这句话" side="top">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={startEditQuote}
                          aria-label="编辑句子"
                        >
                          <Pencil size={12} />
                        </Button>
                      </Tooltip>
                    </div>
                  </>
                )}
              </div>

              <div ref={heatReveal}>
                <HeatingRate
                  title="last 14 weeks"
                  days={heatingDays}
                  stats={heatingStats}
                  showRate={false}
                  selectedKey={selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined}
                  onDayClick={handleDayClick}
                  onStatClick={handleStatClick}
                />
              </div>

              <TagManagerDialog
                open={tagManagerOpen}
                onOpenChange={setTagManagerOpen}
                tags={tags}
              />

              {/* search */}
              <div
                ref={searchReveal}
                className="border border-border rounded-lg bg-background p-4"
              >
                <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                  find
                </p>
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    placeholder="Search..."
                    value={activeSearch}
                    onChange={(e) => syncSearch(e.target.value)}
                    className="w-full h-8 pl-7 pr-15 rounded border border-border bg-muted text-sm
                text-foreground placeholder:text-muted-foreground outline-none
                focus:border-accent focus:bg-background transition-colors"
                  />
                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-7 top-1/2 flex h-5.5 w-5.5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Clear search"
                      title="Clear search"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => updateQuery({ sort: sortByUpdated ? null : "updated" })}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5.5 w-5.5 items-center justify-center rounded transition-colors ${
                      sortByUpdated
                        ? "bg-accent/10 text-accent hover:bg-accent/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-pressed={sortByUpdated}
                    aria-label={sortByUpdated ? "Sort by created time" : "Sort by updated time"}
                    title={sortByUpdated ? "Sort by created time" : "Sort by updated time"}
                  >
                    <Clock3 size={12} />
                  </button>
                </div>
              </div>
            </aside>
          </div>
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
