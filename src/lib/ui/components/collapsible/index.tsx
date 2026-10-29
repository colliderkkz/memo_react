"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

export interface CollapsibleContextValue {
  open: boolean;
  toggle(): void;
  setOpen(value: boolean): void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

export function useCollapsibleContext(): CollapsibleContextValue {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible components must be used inside <Collapsible>");
  return ctx;
}

export interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Collapsible({
  open: openProp,
  onOpenChange,
  children,
  className,
  ...rest
}: CollapsibleProps) {
  const [internal, setInternal] = useState(false);
  const open = openProp ?? internal;

  const setOpen = useCallback(
    (value: boolean) => {
      setInternal(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  return (
    <CollapsibleContext.Provider value={{ open, toggle, setOpen }}>
      <div
        data-slot="root"
        data-state={open ? "open" : "closed"}
        className={cn("w-full", className)}
        {...rest}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

export interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function CollapsibleContent({ children, className, ...rest }: CollapsibleContentProps) {
  const ctx = useCollapsibleContext();
  if (!ctx.open) return null;
  return (
    <div
      data-state="open"
      data-slot="content"
      className={cn("overflow-hidden ui-slide-in", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CollapsibleTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function CollapsibleTrigger({
  children,
  className,
  type = "button",
  onClick,
  ...rest
}: CollapsibleTriggerProps) {
  const ctx = useCollapsibleContext();

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) ctx.toggle();
  }

  return (
    <button
      type={type}
      data-slot="trigger"
      aria-expanded={ctx.open}
      data-state={ctx.open ? "open" : "closed"}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2",
        "cursor-pointer transition-colors duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
