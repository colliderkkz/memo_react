"use client";

import { isToday, isYesterday, isSameDay, format, formatDistanceToNow } from "date-fns";
import { Globe, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/lib/ui";
import { useReveal } from "@/lib/utils/use-reveal.ts";
import type { Memo } from "@/lib/types.ts";

export interface MemoCardProps {
  memo: Memo;
  selectedDate: Date | undefined;
  hoverActions?: boolean;
  tags?: string[];
  activeTags?: string[];
  onTagClick?: (tag: string) => void;
  content: ReactNode;
  actions?: ReactNode;
}

export function MemoCard({
  memo,
  selectedDate,
  hoverActions = false,
  tags,
  activeTags,
  onTagClick,
  content,
  actions,
}: MemoCardProps) {
  const revealRef = useReveal();
  const date = new Date(memo.createdAt);
  const visLabel = memo.visibility === "public" ? "Public" : "Private";
  const dateHighlight = !selectedDate || isSameDay(new Date(memo.updatedAt), selectedDate);

  return (
    <article
      id={`memo-${memo.id}`}
      data-memo-id={memo.id}
      ref={revealRef}
      className="group relative bg-background border border-border rounded-lg px-5 py-4 shadow-xs hover:shadow-md hover:border-border-strong hover:-translate-y-px transition-all duration-150"
    >
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <span suppressHydrationWarning>{formatDistanceToNow(date, { addSuffix: true })}</span>
        <span className="opacity-40">·</span>
        <span className="flex items-center gap-1">
          {memo.visibility === "public" ? <Globe size={11} /> : <Lock size={11} />}
          {visLabel}
        </span>
        <span className="flex-1" />
        <Badge
          variant={dateHighlight ? "default" : "secondary"}
          className={dateHighlight ? "" : "opacity-50"}
        >
          {isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMM d")}
        </Badge>
      </div>

      {content}

      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag)}
              className="transition-transform duration-150 hover:scale-105"
            >
              <Badge
                variant="outline"
                className={
                  activeTags?.includes(tag)
                    ? "border-accent/50 bg-accent/10 text-accent cursor-pointer"
                    : "border-accent/25 text-accent cursor-pointer hover:bg-accent/8"
                }
              >
                #{tag}
              </Badge>
            </button>
          ))}
        </div>
      ) : null}

      {actions ? (
        <div
          className={`flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-border ${
            hoverActions ? "memo-hover-actions-md" : ""
          } transition-opacity duration-100`}
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
}
