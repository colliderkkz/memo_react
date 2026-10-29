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
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";
import { useEscapeKey } from "../dialog";

export interface PopoverContextValue {
  open: boolean;
  wrapper: React.RefObject<HTMLDivElement | null>;
  toggle(): void;
  close(): void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover components must be used inside <Popover>");
  return ctx;
}

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  className?: string;
}

export function Popover({ open: openProp, onOpenChange, children, className }: PopoverProps) {
  const [internal, setInternal] = useState(false);
  const open = openProp ?? internal;
  const wrapper = useRef<HTMLDivElement | null>(null);

  const setOpen = useCallback(
    (value: boolean) => {
      setInternal(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);

  return (
    <PopoverContext.Provider value={{ open, wrapper, toggle, close }}>
      <div ref={wrapper} data-slot="root" className={cn("relative inline-flex", className)}>
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export type PopoverSide = "top" | "bottom";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: PopoverSide;
  align?: PopoverAlign;
  children?: ReactNode;
}

export function PopoverContent({
  side = "bottom",
  align = "start",
  children,
  className,
  ...rest
}: PopoverContentProps) {
  const ctx = usePopoverContext();

  useEscapeKey(ctx.open, ctx.close);

  useEffect(() => {
    if (!ctx.open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ctx.wrapper.current?.contains(e.target as Node)) ctx.close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ctx]);

  if (!ctx.open) return null;

  return (
    <div
      data-slot="content"
      className={cn(
        "absolute z-50 rounded-lg border border-border bg-background shadow-md",
        "min-w-48 p-3 focus:outline-none",
        "ui-popover-in",
        side === "bottom" && align === "start" && "top-full left-0 mt-1.5",
        side === "bottom" && align === "center" && "top-full left-1/2 -translate-x-1/2 mt-1.5",
        side === "bottom" && align === "end" && "top-full right-0 mt-1.5",
        side === "top" && align === "start" && "bottom-full left-0 mb-1.5",
        side === "top" && align === "center" && "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
        side === "top" && align === "end" && "bottom-full right-0 mb-1.5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface PopoverTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function PopoverTrigger({ children, className, ...rest }: PopoverTriggerProps) {
  const ctx = usePopoverContext();
  return (
    <button
      type="button"
      data-slot="trigger"
      aria-expanded={ctx.open}
      aria-haspopup="dialog"
      onClick={() => ctx.toggle()}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}
