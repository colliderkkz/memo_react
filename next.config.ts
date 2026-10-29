import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 不让 Next 生成/覆盖根目录 AGENTS.md（项目自有）
  agentRules: false,
  // 让 resvg 的 wasm 与 drizzle 的动态 driver require 在运行时按 Node 方式解析，
  // 不被 Turbopack 打进 server bundle。
  serverExternalPackages: ["@resvg/resvg-wasm", "drizzle-orm"],
  // 不使用 output:"standalone" —— og/base.jpg 与 data/ 都按项目目录 fs 读取。
  async redirects() {
    // 与原 hooks.server.ts 一致：/favicon.ico → /favicon.png (301)
    return [{ source: "/favicon.ico", destination: "/favicon.png", permanent: true }];
  },
};

export default nextConfig;
