import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site.ts";
import { IntroSplash } from "@/components/IntroSplash.tsx";
import { ToastsViewport } from "@/components/ToastsViewport.tsx";
import "./globals.css";

// 与原 app.html 一致的防闪烁主题脚本
const themeScript = `(function () {
  var t = localStorage.getItem("my-memos:theme");
  var dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
})();`;

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.png" },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: "/rss.xml", title: `${SITE_NAME} RSS` },
      ],
    },
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <IntroSplash />
        <ToastsViewport />
      </body>
    </html>
  );
}
