"use client";

import { useEffect, useState, type ReactNode } from "react";

const LAYOUT_KEY = "my-memos:layout";

export interface LayoutSwitchContext {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export interface LayoutSwitchProps {
  /** URL 里的 date 过滤参数（yyyy-MM-dd 或空串） */
  dateFilter: string;
  renderOld: (ctx: LayoutSwitchContext) => ReactNode;
  renderNew: (ctx: LayoutSwitchContext) => ReactNode;
}

/**
 * 三个列表页共用的新旧布局切换器：
 * SSR 恒渲染 new（与原版一致，无 hydration 错位），挂载后读 localStorage；
 * selectedDate 由 URL date 参数派生；右下角悬浮切换 pill。
 */
export function LayoutSwitch({ dateFilter, renderOld, renderNew }: LayoutSwitchProps) {
  const [layout, setLayout] = useState<"old" | "new">("new");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_KEY);
    setLayout(saved === "old" ? "old" : "new");
  }, []);

  useEffect(() => {
    setSelectedDate(dateFilter ? new Date(`${dateFilter}T00:00:00`) : undefined);
  }, [dateFilter]);

  function toggleLayout() {
    setLayout((prev) => {
      const next = prev === "old" ? "new" : "old";
      localStorage.setItem(LAYOUT_KEY, next);
      return next;
    });
  }

  return (
    <>
      {layout === "old"
        ? renderOld({ selectedDate, onDateChange: setSelectedDate })
        : renderNew({ selectedDate, onDateChange: setSelectedDate })}

      {/* layout toggle pill */}
      <button
        type="button"
        onClick={toggleLayout}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-1.5
          h-7 px-3 rounded-full border border-border bg-background shadow-sm
          font-mono text-[11px] text-muted-foreground
          hover:text-foreground hover:border-border-strong hover:shadow-md
          transition-all"
        title="Switch layout"
      >
        {layout === "old" ? "new →" : "← classic"}
      </button>
    </>
  );
}
