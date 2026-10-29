import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: AvatarSize;
}

const sizes: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-14 w-14 text-lg",
};

export function Avatar({ src, alt, fallback, size = "md", className, ...rest }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
        sizes[size],
        className,
      )}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 与原版一致，头像走本地 API，无需 next/image 优化
        <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
      ) : (
        <span className="select-none font-sans font-medium text-muted-foreground">
          {fallback.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
