import type { HTMLAttributes } from "react";
// 注意：此组件会进入 Server Component 树，必须绕过 @/lib/ui barrel（其中含客户端组件），
// 直接从源码导入 cn。
import { cn } from "@/lib/ui/lib/utils";
import { renderMarkdown } from "@/lib/utils/markdown.ts";
import { stripHashtags } from "@/lib/utils/tags.ts";

export interface MarkdownContentProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  stripTags?: boolean;
}

// renderMarkdown 是纯函数（mdast→hast→html，含 HTML 转义与协议白名单），
// 服务端/客户端同构可用，故不加 "use client"。
export function MarkdownContent({
  content,
  stripTags = false,
  className,
  ...rest
}: MarkdownContentProps) {
  const html = renderMarkdown(stripTags ? stripHashtags(content) : content);
  return (
    <div
      className={cn("md-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
}
