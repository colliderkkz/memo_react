import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type AlertVariant = "default" | "success" | "warning" | "error";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  children?: ReactNode;
}

const variants: Record<AlertVariant, string> = {
  default: "border-border bg-muted text-foreground",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
};

export function Alert({ variant = "default", className, children, ...rest }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="root"
      className={cn("rounded-lg border px-4 py-3 font-sans text-sm", variants[variant], className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface AlertTitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export function AlertTitle({ className, children, ...rest }: AlertTitleProps) {
  return (
    <p
      data-slot="title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...rest}
    >
      {children}
    </p>
  );
}

export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export function AlertDescription({ className, children, ...rest }: AlertDescriptionProps) {
  return (
    <p data-slot="description" className={cn("text-sm opacity-80", className)} {...rest}>
      {children}
    </p>
  );
}
