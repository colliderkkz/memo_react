import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/utils";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: string;
  side?: TooltipSide;
  delay?: number;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, side = "top", delay = 300, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function show() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    clearTimeout(timer.current);
    setVisible(false);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div
      className={cn("relative inline-flex", className)}
      role="none"
      tabIndex={-1}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && content ? (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 rounded-md px-2.5 py-1.5",
            "bg-foreground text-background text-xs font-sans whitespace-nowrap",
            "pointer-events-none shadow-sm",
            "ui-fade-in-100",
            side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
            side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-1.5",
            side === "left" && "right-full top-1/2 -translate-y-1/2 mr-1.5",
            side === "right" && "left-full top-1/2 -translate-y-1/2 ml-1.5",
          )}
        >
          {content}
        </div>
      ) : null}
    </div>
  );
}
