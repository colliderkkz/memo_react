"use client";

import { useCallback } from "react";

/**
 * 滚动进入视口时淡入上浮（一次性）。对应原 reveal action：
 * <div ref={useReveal(80)}>，参数为延迟毫秒数。React 19 ref 回调返回清理函数。
 */
export function useReveal(delay = 0) {
  return useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      node.style.setProperty("--reveal-delay", `${delay}ms`);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || !("IntersectionObserver" in window)) {
        node.classList.add("is-revealed");
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              node.classList.add("is-revealed");
              observer.disconnect();
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(node);

      return () => observer.disconnect();
    },
    [delay],
  );
}
