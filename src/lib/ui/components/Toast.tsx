import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type ToastVariant = "default" | "success" | "warning" | "error";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title: string;
  description?: string;
}

const borders: Record<ToastVariant, string> = {
  default: "border-border",
  success: "border-success/30",
  warning: "border-warning/30",
  error: "border-error/30",
};

const dots: Record<ToastVariant, string> = {
  default: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export function Toast({
  variant = "default",
  title,
  description,
  className,
  ...rest
}: ToastProps) {
  return (
    <div
      className={cn(
        "flex w-80 items-start gap-3 rounded-md border bg-background p-4",
        "shadow-[0_1px_4px_0_rgba(0,0,0,.06)]",
        borders[variant],
        className,
      )}
      {...rest}
    >
      <span className={cn("mt-[0.3125rem] h-1.5 w-1.5 shrink-0 rounded-full", dots[variant])} />
      <div className="flex flex-col gap-0.5">
        <p className="font-sans text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="font-sans text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
