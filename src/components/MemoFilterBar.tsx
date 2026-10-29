"use client";

import { X } from "lucide-react";

export interface MemoFilterBarProps {
  selectedDate: Date | undefined;
  activeTags: string[];
  onRemoveTag: (tag: string) => void;
}

export function MemoFilterBar({ selectedDate, activeTags, onRemoveTag }: MemoFilterBarProps) {
  if (!selectedDate && activeTags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
      {selectedDate ? (
        <p className="text-xs text-muted-foreground">
          Showing memos from
          <span className="text-accent font-medium">
            {" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </p>
      ) : null}
      {activeTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              #{tag}
              <X size={10} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
