"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { applyTheme } from "@/lib/ui";
import { Sidebar } from "@/components/layout/Sidebar.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";
import type { TagCount } from "@/lib/types.ts";

const STORAGE_KEY = "my-memos:theme";

export interface AppShellProps {
  tags?: TagCount[];
  activeTags?: string[];
  viewAsPublic?: boolean;
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
  user: CurrentUser | null;
  children: ReactNode;
}

export function AppShell({
  tags = [],
  activeTags = [],
  viewAsPublic = false,
  selectedDate,
  onDateChange = () => {},
  user,
  children,
}: AppShellProps) {
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const themeReady = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const dark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    applyTheme(dark);
    themeReady.current = true;
  }, []);

  useEffect(() => {
    if (themeReady.current) localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <button
        type="button"
        className={[
          "fixed inset-0 z-30 bg-black/40 md:hidden",
          "transition-opacity duration-200 cursor-default",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-label="Close sidebar"
        tabIndex={sidebarOpen ? 0 : -1}
        onClick={() => setSidebarOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
      />

      <Sidebar
        tags={tags}
        activeTags={activeTags}
        viewAsPublic={viewAsPublic}
        isDark={isDark}
        open={sidebarOpen}
        onToggleTheme={(btn) => {
          const next = !isDark;
          applyTheme(next, btn);
          setIsDark(next);
        }}
        onClose={() => setSidebarOpen(false)}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        user={user}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 h-12 bg-background/95 backdrop-blur-sm border-b border-border md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <span className="font-serif font-semibold text-accent tracking-tight">my memos</span>
        </div>

        {children}
      </main>
    </div>
  );
}
