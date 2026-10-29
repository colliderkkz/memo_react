"use client";

import { useEffect, useState } from "react";

// 开场动画：圆环描边绘制 + "memo" 字母逐个弹出 + 圆形光圈收束退场。
// 仅整页加载时播放一次；尊重系统"减少动态效果"设置。
export function IntroSplash() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const timer = setTimeout(() => setDone(true), 1700);
    return () => clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <div className="intro-splash" aria-hidden="true">
      <div className="intro-core">
        <svg className="intro-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" />
        </svg>
        <div className="intro-orbit">
          <span className="intro-dot" />
        </div>
        <p className="intro-word">
          {["m", "e", "m", "o"].map((letter, i) => (
            <span key={i} className="intro-letter" style={{ "--i": i } as React.CSSProperties}>
              {letter}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
