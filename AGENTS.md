# AGENTS

本仓库是 **my-memos**（个人备忘录，本地单用户）——单应用 Next.js（App Router）+ React 19 项目，
由 SvelteKit + Cloudflare（D1/R2/KV）技术栈重构而来。无鉴权、无外部服务，数据全在 `data/`。

## 架构速览

- `src/app/` — App Router：三个列表页（`/`、`/archive`、`/favorites`，均为 Server Component 取数 +
  client 视图）、分享页 `memo/[id]`（generateMetadata + JSON-LD + 客户端跳回 `/#memo-<id>`）、
  `api/**/route.ts`（与前端 services 一一对应）、`rss.xml`/`sitemap.xml`/`robots.txt`
- `src/components/` — 页面级组件：`views/`（新版 Masthead 布局）、`views-legacy/`（旧版 Sidebar 布局，
  两者由 `LayoutSwitch` 按 localStorage `my-memos:layout` 切换）、`layout/`、编辑器/对话框等
- `src/lib/ui/` — 从原 @my-memos/ui 移植的 React 组件（仅保留实际用到的 ~25 个符号；
  纯手写实现，无 radix/无动画库；入场动画在 `src/styles/ui-animations.css`）
- `src/lib/server/` — 服务端逻辑（大部分自 SvelteKit 版平移）：
  - `bindings/` — 存储层：`db.ts`（node:sqlite + 自动迁移）、`r2.ts`（文件树 bucket + `.meta.json`
    sidecar）、`kv.ts`（同库 kv 表，带 TTL）、`index.ts`（`getEnv()` 惰性单例 + Proxy `env`）
  - `memos/` — repository（drizzle-orm/node-sqlite + 3 条原生 json_each 查询）、service、storage、
    validation、query、cache
  - `og/` — 手写 SVG + @resvg/resvg-wasm 渲染分享图；wasm 用 createRequire 运行时解析（勿改回
    静态 import，Turbopack 会尝试打包 .wasm 而失败）；Google Fonts 运行时拉取并缓存进 kv
- `src/lib/state/` — 客户端状态：`toast.ts`/`memo-actions.ts`（vanilla store + useSyncExternalStore，
  工厂接受 `refresh` 回调 = `router.refresh()`）、`use-tag-autocomplete.ts`、`use-memo-pagination.ts`
- `src/lib/services/` — 浏览器端 fetch 包装（纯函数，SSR/客户端同构可用）
- `src/lib/utils/markdown.ts` — mdast→hast→html 渲染管线（含 HTML 转义与协议白名单），
  `MarkdownContent` 经 `dangerouslySetInnerHTML` 使用它

## 约定与坑

- **数据层三件套形状**：路由从 `@/lib/server/bindings/index.ts` 导入 `env`，取 `env.DB`
  （DatabaseSync）、`env.MEMOS_BUCKET`、`env.MEMOS_CACHE`，再显式传参给 `lib/server` 函数——
  不要在 lib/server 里直接 import bindings。所有 shim 方法必须是 async（调用方有 `.catch()`）。
- **所有数据路由**都要 `export const dynamic = "force-dynamic"`，否则构建期静态化会缓存旧数据。
- `params` / `searchParams` 在 Next 15+ 是 **Promise**，必须 await。
- node:sqlite 原生查询的聚合值可能是 BigInt，序列化前要 `Number()`（见 repository.ts）。
- KV key 含冒号（`memo-og:`、`settings:`），**不要**把 KV 改成文件目录方案（Windows NTFS ADS 陷阱）。
- Hydration：localStorage/日期驱动的 UI 一律 mount-effect 或叶子节点 `suppressHydrationWarning`。
- MarkdownContent 会进入 Server Component 树——它只能从 `@/lib/ui/lib/utils` 导入 cn，
  **不能**走 `@/lib/ui` barrel（会拉进客户端组件导致 RSC 报错）。
- 从项目根目录运行（data/ 与 migrations/ 按 cwd 解析）；`MEMOS_DATA_DIR` 可覆盖数据目录。
- 迁移 SQL 放 `migrations/*.sql`（`_migrations` 表跟踪，启动自动应用；文件按名排序、不可改已应用的）。
- 测试：`src/__tests__/*.test.ts`（vitest，node 环境，纯单元测试；bindings 用 `{} as MemoDatabase`
  等桩 + vi.mock）。跑法 `pnpm test`；类型检查 `pnpm typecheck`。
- 旧数据迁移脚本 `scripts/migrate-from-wrangler.mjs`（miniflare state → data/，一次性，只读源）。

## 常用命令

```bash
corepack pnpm dev        # 开发 :3000
corepack pnpm build      # 生产构建
corepack pnpm start      # 运行生产构建
corepack pnpm test       # vitest
corepack pnpm typecheck  # tsc --noEmit
```
