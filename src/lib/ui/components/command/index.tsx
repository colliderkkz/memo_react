"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

export interface CommandItemData {
  key: string;
  label: string;
  description?: string;
}

export interface CommandContextValue {
  activeIndex: number;
  onSelect: (item: CommandItemData) => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

export function useCommandContext(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error("Command components must be used inside <Command>");
  return ctx;
}

export interface CommandProps {
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  onSelect?: (item: CommandItemData) => void;
  children?: ReactNode;
}

export function Command({
  activeIndex: activeIndexProp,
  onActiveIndexChange,
  onSelect,
  children,
}: CommandProps) {
  const [internal, setInternal] = useState(0);
  const activeIndex = activeIndexProp ?? internal;
  const rootEl = useRef<HTMLDivElement | null>(null);
  // navigate 在 document 级监听器里读到的 activeIndex 需保持最新
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;

  const setActiveIndex = useCallback(
    (value: number) => {
      setInternal(value);
      onActiveIndexChange?.(value);
    },
    [onActiveIndexChange],
  );

  const handleSelect = useCallback(
    (item: CommandItemData) => {
      onSelect?.(item);
    },
    [onSelect],
  );

  useEffect(() => {
    function itemElements(): HTMLElement[] {
      if (!rootEl.current) return [];
      return Array.from(rootEl.current.querySelectorAll<HTMLElement>("[data-command-index]"));
    }

    function navigate(direction: number) {
      const items = itemElements();
      if (items.length === 0) return;
      const indices = items.map((el) => Number(el.dataset.commandIndex));
      const currentIdx = indices.indexOf(activeRef.current);
      const nextIdx = (currentIdx + direction + indices.length) % indices.length;
      setActiveIndex(indices[nextIdx]!);
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1);
      }
    }

    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [setActiveIndex]);

  return (
    <CommandContext.Provider value={{ activeIndex, onSelect: handleSelect }}>
      <div data-slot="root" ref={rootEl}>
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export interface CommandInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function CommandInput({ className, ...rest }: CommandInputProps) {
  return (
    <input
      type="text"
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent px-3 py-1 text-sm",
        "outline-none placeholder:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  );
}

export interface CommandListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function CommandList({ children, className, ...rest }: CommandListProps) {
  const ctx = useCommandContext();
  const containerEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerEl.current;
    if (!el || ctx.activeIndex < 0) return;
    const frame = requestAnimationFrame(() => {
      const activeItem = el.querySelector(`[data-command-index="${ctx.activeIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ctx.activeIndex]);

  return (
    <div
      ref={containerEl}
      role="listbox"
      data-slot="list"
      className={cn("max-h-72 overflow-y-auto overflow-x-hidden p-1 scrollbar-none", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CommandItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  item: CommandItemData;
  index: number;
  children?: ReactNode;
}

export function CommandItem({ item, index, className, children, ...rest }: CommandItemProps) {
  const ctx = useCommandContext();
  const isActive = ctx.activeIndex === index;

  return (
    <button
      type="button"
      role="option"
      data-slot="item"
      aria-selected={isActive}
      data-command-index={index}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "transition-colors duration-[var(--duration-fast)]",
        isActive ? "bg-accent text-accent-foreground" : "text-foreground",
        className,
      )}
      onClick={() => ctx.onSelect(item)}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface CommandGroupProps extends HTMLAttributes<HTMLDivElement> {
  heading?: string;
  children?: ReactNode;
}

export function CommandGroup({ heading, className, children, ...rest }: CommandGroupProps) {
  return (
    <div role="group" data-slot="group" className={cn("overflow-hidden p-1", className)} {...rest}>
      {heading ? (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{heading}</div>
      ) : null}
      {children}
    </div>
  );
}

export interface CommandSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

export function CommandSeparator({ className, ...rest }: CommandSeparatorProps) {
  return (
    <div
      role="separator"
      data-slot="separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...rest}
    />
  );
}

export interface CommandEmptyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function CommandEmpty({ className, children, ...rest }: CommandEmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
