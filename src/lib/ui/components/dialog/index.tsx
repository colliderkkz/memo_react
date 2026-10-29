"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";

export interface DialogContextValue {
  open: boolean;
  close(): void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used inside <Dialog>");
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function Dialog({ open: openProp, onOpenChange, children }: DialogProps) {
  const [internal, setInternal] = useState(false);
  const open = openProp ?? internal;
  const close = useCallback(() => {
    setInternal(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, close }}>{children}</DialogContext.Provider>
  );
}

export interface DialogContentProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
  children?: ReactNode;
}

export function DialogContent({ children, className, ...rest }: DialogContentProps) {
  const ctx = useDialogContext();

  useEscapeKey(ctx.open, ctx.close);

  if (!ctx.open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 ui-fade-in-150"
        role="presentation"
        onClick={() => ctx.close()}
      />

      {/* Panel */}
      <div
        data-slot="content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "bg-background border border-border rounded-xl shadow-lg",
          "p-6 focus:outline-none",
          "ui-dialog-panel-in",
          className,
        )}
        role="dialog"
        aria-modal="true"
        {...rest}
      >
        {children}
      </div>
    </>
  );
}

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function DialogHeader({ children, className, ...rest }: DialogHeaderProps) {
  return (
    <div data-slot="header" className={cn("flex flex-col gap-1.5 mb-5", className)} {...rest}>
      {children}
    </div>
  );
}

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
}

export function DialogTitle({ children, className, ...rest }: DialogTitleProps) {
  return (
    <h2
      data-slot="title"
      className={cn("text-base font-semibold text-foreground leading-tight", className)}
      {...rest}
    >
      {children}
    </h2>
  );
}

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export function DialogDescription({ children, className, ...rest }: DialogDescriptionProps) {
  return (
    <p
      data-slot="description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...rest}
    >
      {children}
    </p>
  );
}

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function DialogFooter({ children, className, ...rest }: DialogFooterProps) {
  return (
    <div
      data-slot="footer"
      className={cn("flex flex-row justify-end gap-2 mt-6", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

// 共享小工具：open 时监听 Escape
export function useEscapeKey(active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [active, close]);
}
