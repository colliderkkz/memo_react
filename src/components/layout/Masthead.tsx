"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Globe,
  Heart,
  Home,
  Moon,
  Pencil,
  Sun,
  UserRound,
} from "lucide-react";
import {
  applyTheme,
  Avatar,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@/lib/ui";
import { useUpdateQuery } from "@/lib/utils/index.ts";
import { ProfileDialog } from "@/components/ProfileDialog.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";
import type { MemoStats, TagCount } from "@/lib/types.ts";

const THEME_KEY = "my-memos:theme";
const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/favorites", label: "Favorites", Icon: Heart },
  { href: "/archive", label: "Archive", Icon: Archive },
] as const;

export interface MastheadProps {
  memoStats?: MemoStats;
  tags?: TagCount[];
  viewAsPublic?: boolean;
  user: CurrentUser | null;
}

export function Masthead({ memoStats, viewAsPublic = false, user }: MastheadProps) {
  const pathname = usePathname();
  const router = useRouter();
  const updateQuery = useUpdateQuery();

  const [isDark, setIsDark] = useState(false);
  const themeReady = useRef(false);
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const dark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    applyTheme(dark);
    themeReady.current = true;
  }, []);

  useEffect(() => {
    if (themeReady.current) localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  function toggleTheme() {
    const next = !isDark;
    applyTheme(next, themeBtnRef.current);
    setIsDark(next);
  }

  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5 pb-4 border-b border-border mb-4">
        {/* wordmark */}
        <div className="masthead-parallax flex flex-col gap-1.5 shrink-0">
          <p
            suppressHydrationWarning
            className="anim-fade-up font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground"
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <div className="anim-fade-up anim-delay-1 flex items-baseline gap-3">
            <span className="font-serif font-semibold tracking-tight leading-none text-foreground relative masthead-wordmark">
              my memos
              <span className="wordmark-bar absolute left-0 -bottom-1.75 h-0.75 w-13 rounded-sm bg-accent" />
            </span>
            {memoStats && memoStats.total > 0 ? (
              <span className="font-mono text-xs text-muted-foreground pt-0.5 hidden lg:inline">
                <strong className="text-foreground font-semibold">{memoStats.total}</strong>{" "}
                entries
                {memoStats.today > 0 ? (
                  <>
                    &nbsp;·&nbsp;
                    <strong className="text-foreground font-semibold">{memoStats.today}</strong>{" "}
                    today
                  </>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 lg:flex-1 lg:justify-end lg:gap-4">
          {/* nav */}
          <nav className="anim-fade-up anim-delay-2 flex gap-1 lg:pr-3 lg:mr-1 lg:border-r lg:border-border">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => router.push(href)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors
            ${
              active
                ? "text-accent bg-accent/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
                >
                  <Icon size={13} />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* theme + avatar */}
          <div className="anim-fade-up anim-delay-3 flex items-center gap-2 shrink-0">
            <Tooltip content={viewAsPublic ? "View as private" : "View as public"} side="top">
              <button
                type="button"
                onClick={() => updateQuery({ view: viewAsPublic ? null : "public" })}
                className="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-pressed={viewAsPublic}
                aria-label={viewAsPublic ? "View as private" : "View as public"}
              >
                {viewAsPublic ? <UserRound size={15} /> : <Globe size={15} />}
              </button>
            </Tooltip>

            {/* theme */}
            <Tooltip content={isDark ? "Light mode" : "Dark mode"} side="top">
              <button
                type="button"
                ref={themeBtnRef}
                onClick={toggleTheme}
                className="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </Tooltip>

            {/* avatar */}
            <Popover>
              <PopoverTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0">
                <Avatar
                  src={user?.image ?? undefined}
                  fallback={user?.name ?? "Owner"}
                  size="sm"
                />
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-52">
                <div className="flex flex-col items-center gap-3 py-1">
                  <Avatar
                    src={user?.image ?? undefined}
                    fallback={user?.name ?? "Owner"}
                    size="lg"
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-44">{user?.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full"
                    onClick={() => setProfileOpen(true)}
                  >
                    <Pencil size={13} />
                    编辑资料
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} user={user} />
    </>
  );
}
