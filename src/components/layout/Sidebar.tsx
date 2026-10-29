"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Archive,
  CalendarDays,
  Globe,
  Heart,
  Home,
  Moon,
  Pencil,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import {
  Avatar,
  Button,
  DatePicker,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  cn,
} from "@/lib/ui";
import { useUpdateQuery } from "@/lib/utils/index.ts";
import { ProfileDialog } from "@/components/ProfileDialog.tsx";
import type { CurrentUser } from "@/lib/server/current-user.ts";
import type { TagCount } from "@/lib/types.ts";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/archive", label: "Archive", icon: Archive },
] as const;

export interface SidebarProps {
  tags: TagCount[];
  activeTags: string[];
  viewAsPublic: boolean;
  isDark: boolean;
  open: boolean;
  onToggleTheme: (button: HTMLElement) => void;
  onClose: () => void;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  user: CurrentUser | null;
}

export function Sidebar({
  tags,
  activeTags,
  viewAsPublic,
  isDark,
  open,
  onToggleTheme,
  onClose,
  selectedDate,
  onDateChange,
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const updateQuery = useUpdateQuery();
  const [profileOpen, setProfileOpen] = useState(false);

  function handleDateChange(date: Date) {
    if (
      selectedDate &&
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    ) {
      onDateChange(undefined);
      updateQuery({ date: null });
    } else {
      onDateChange(date);
      updateQuery({ date: format(date, "yyyy-MM-dd") });
    }
  }

  function toggleTag(tag: string) {
    const next = activeTags.length === 1 && activeTags[0] === tag ? [] : [tag];
    updateQuery({ tags: next });
  }

  function clearDate() {
    onDateChange(undefined);
    updateQuery({ date: null });
  }

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 md:relative md:z-auto",
          "flex flex-col w-60 shrink-0 h-screen border-r border-border bg-background",
          "transition-transform duration-200 ease-in-out",
          !open && "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="px-5 pt-5 pb-4 shrink-0 flex items-center justify-between">
            <span className="flex items-center gap-2 text-accent font-serif font-semibold text-lg tracking-tight select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.png" alt="" className="h-4.25 w-4.25 shrink-0 rounded-sm" />
              my memos
            </span>
            <Tooltip content="Close sidebar" side="right">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 text-muted-foreground md:hidden"
              >
                <X size={15} />
              </Button>
            </Tooltip>
          </div>

          <nav className="px-3 space-y-0.5 shrink-0">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Button
                  key={href}
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(href)}
                  className={cn(
                    "w-full justify-start gap-2.5 font-normal",
                    active
                      ? "bg-accent/10 text-accent hover:bg-accent/10"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Button>
              );
            })}
          </nav>

          <Separator className="mx-4 my-4 w-auto" />

          <div className="px-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <CalendarDays size={12} />
                Filter by date
              </span>
              {selectedDate ? (
                <Tooltip content="Clear date filter" side="right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearDate}
                    className="h-5 w-5 text-muted-foreground"
                  >
                    <X size={11} />
                  </Button>
                </Tooltip>
              ) : null}
            </div>
            <DatePicker value={selectedDate} onChange={handleDateChange} />
          </div>

          <Separator className="mx-4 my-4 w-auto" />

          <div className="px-3 flex-1">
            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tags
            </p>
            <div className="space-y-0.5">
              {tags.map(({ name, count }) => (
                <Button
                  key={name}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTag(name)}
                  className={cn(
                    "w-full justify-between font-normal",
                    activeTags.includes(name)
                      ? "bg-accent/10 text-accent hover:bg-accent/10"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs opacity-70">#</span>
                    {name}
                  </span>
                  <span className="text-xs opacity-50">{count}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-3 py-4 shrink-0 border-t border-border flex items-center justify-end gap-1">
          <Tooltip content={isDark ? "Light mode" : "Dark mode"} side="top">
            <button
              type="button"
              onClick={(e) => onToggleTheme(e.currentTarget as HTMLElement)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </Tooltip>

          <Tooltip content={viewAsPublic ? "View as private" : "View as public"} side="top">
            <button
              type="button"
              onClick={() => updateQuery({ view: viewAsPublic ? null : "public" })}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-pressed={viewAsPublic}
              aria-label={viewAsPublic ? "View as private" : "View as public"}
            >
              {viewAsPublic ? <UserRound size={15} /> : <Globe size={15} />}
            </button>
          </Tooltip>

          <Popover>
            <PopoverTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0">
              <Avatar src={user?.image ?? undefined} fallback={user?.name ?? "Owner"} size="sm" />
            </PopoverTrigger>

            <PopoverContent side="top" align="center" className="w-56">
              <div className="flex flex-col items-center gap-3 py-1">
                <Avatar
                  src={user?.image ?? undefined}
                  fallback={user?.name ?? "Owner"}
                  size="lg"
                />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-45">{user?.email}</p>
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
      </aside>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} user={user} />
    </>
  );
}
