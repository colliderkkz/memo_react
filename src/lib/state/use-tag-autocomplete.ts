"use client";

import { useMemo, useState } from "react";

function getHashContext(text: string, pos: number) {
  const before = text.slice(0, pos);
  const match = before.match(/#([\p{Letter}\p{Number}_\-/]*)$/u);
  if (!match) return null;
  return { query: match[1], start: pos - match[0].length, end: pos };
}

/**
 * 原 createTagAutocomplete(getTagNames) 的 hook 化：调用方直接传当前 tag 名列表。
 * onValueChange 在编辑器 value 变化时调用；onKeydown 返回非 null 表示应以返回值替换编辑器内容。
 */
export function useTagAutocomplete(tagNames: string[]) {
  const [currentValue, setCurrentValue] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(() => {
    if (!tagNames.length) return [];
    return query === ""
      ? tagNames
      : tagNames.filter((t) => t.toLowerCase().startsWith(query.toLowerCase()));
  }, [tagNames, query]);

  function onValueChange(value: string): void {
    setCurrentValue(value);
    const ctx = getHashContext(value, value.length);
    if (ctx && tagNames.length > 0) {
      setQuery(ctx.query);
      setOpen(true);
      setActiveIndex(0);
    } else {
      setOpen(false);
    }
  }

  function select(tag: string): string | null {
    const ctx = getHashContext(currentValue, currentValue.length);
    if (!ctx) return null;
    const inserted = `#${tag} `;
    setOpen(false);
    return currentValue.slice(0, ctx.start) + inserted + currentValue.slice(ctx.end);
  }

  function onKeydown(e: KeyboardEvent | React.KeyboardEvent): string | null {
    if (!open || suggestions.length === 0) return null;
    if (e.key === "Tab") {
      e.preventDefault();
      return select(suggestions[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
    return null;
  }

  function close() {
    setOpen(false);
  }

  return {
    open,
    activeIndex,
    setActiveIndex,
    suggestions,
    onValueChange,
    onKeydown,
    select,
    close,
  };
}
