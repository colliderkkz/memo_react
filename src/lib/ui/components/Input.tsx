import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const base = cn(
  "flex h-9 w-full rounded-md border bg-background px-3 py-1",
  "font-sans text-sm text-foreground placeholder:text-muted-foreground",
  "outline-none transition-colors duration-100",
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
);

export function Input({ error, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        base,
        error ? "border-error focus-visible:ring-error" : "border-border focus-visible:ring-accent",
        className,
      )}
      {...rest}
    />
  );
}
