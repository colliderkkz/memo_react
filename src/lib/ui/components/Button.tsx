import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base = cn(
  "inline-flex items-center justify-center gap-2",
  "rounded-md font-sans text-sm font-medium",
  "cursor-pointer select-none whitespace-nowrap",
  "transition-colors duration-100",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:opacity-50 disabled:pointer-events-none",
);

const variants: Record<ButtonVariant, string> = {
  default: "bg-accent text-accent-foreground hover:bg-accent/85",
  secondary: "border border-border bg-muted text-foreground hover:bg-border",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  destructive: "border border-error/40 text-error bg-transparent hover:bg-error/10",
  link: "text-accent underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

export function Button({
  variant = "default",
  size = "md",
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cn(base, variants[variant], sizes[size], className)} {...rest} />
  );
}
