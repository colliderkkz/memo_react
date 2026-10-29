"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiListMemos } from "@/lib/services/memos.ts";
import { showToast } from "@/lib/state/toast.ts";
import type { Memo } from "@/lib/types.ts";

export interface MemoPaginationOptions {
  initialMemos: Memo[];
  initialCursor: string | null;
  /** 加载更多时附加的查询参数（date/tags/archivedOnly 等），随过滤条件变化 */
  extraParams: Record<string, string>;
  errorText: string;
}

/**
 * Archive/Favorites（新旧布局共用）的游标分页 + 无限滚动哨兵。
 * 语义与原 Svelte 版一致：初始数据变化（router.refresh 或过滤改变）时重置累积列表，
 * loadRequestSeq 防过期响应写入。
 */
export function useMemoPagination({
  initialMemos,
  initialCursor,
  extraParams,
  errorText,
}: MemoPaginationOptions) {
  const [allMemos, setAllMemos] = useState(initialMemos);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const loadingRef = useRef(loadingMore);
  loadingRef.current = loadingMore;
  const seqRef = useRef(0);
  const extraParamsRef = useRef(extraParams);
  extraParamsRef.current = extraParams;

  useEffect(() => {
    setAllMemos(initialMemos);
    setCursor(initialCursor);
    cursorRef.current = initialCursor;
    setLoadingMore(false);
    loadingRef.current = false;
    seqRef.current += 1;
  }, [initialMemos, initialCursor]);

  const loadMore = useCallback((): Promise<void> => {
    const cur = cursorRef.current;
    if (!cur || loadingRef.current) return Promise.resolve();
    setLoadingMore(true);
    loadingRef.current = true;
    const requestSeq = seqRef.current;
    const queryParams = new URLSearchParams({ cursor: cur, limit: "25", ...extraParamsRef.current });

    return apiListMemos(`/api/memos?${queryParams.toString()}`)
      .then((pageData) => {
        if (requestSeq !== seqRef.current) return;
        setAllMemos((prev) => [...prev, ...pageData.memos]);
        setCursor(pageData.nextCursor);
        cursorRef.current = pageData.nextCursor;
      })
      .catch(() => {
        if (requestSeq !== seqRef.current) return;
        showToast("error", errorText);
      })
      .finally(() => {
        if (requestSeq !== seqRef.current) return;
        setLoadingMore(false);
        loadingRef.current = false;
      });
  }, [errorText]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

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

  return { allMemos, cursor, loadingMore, sentinelRef };
}
