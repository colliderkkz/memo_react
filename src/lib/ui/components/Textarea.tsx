import { useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  autoresize?: boolean;
}

const base = cn(
  "flex min-h-20 w-full rounded-md border bg-background px-3 py-2",
  "font-sans text-sm text-foreground placeholder:text-muted-foreground",
  "outline-none transition-colors duration-100 resize-y",
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
);

export function Textarea({
  error,
  autoresize = false,
  className,
  onInput,
  ...rest
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // 与原 $effect 一致：autoresize 时每次 value 变化后重算高度
  useEffect(() => {
    if (autoresize) Promise.resolve().then(resize);
  });

  return (
    <textarea
      ref={ref}
      className={cn(
        base,
        autoresize && "resize-none overflow-hidden",
        error ? "border-error focus-visible:ring-error" : "border-border focus-visible:ring-accent",
        className,
      )}
      onInput={(e) => {
        if (autoresize) resize();
        onInput?.(e);
      }}
      {...rest}
    />
  );
}
