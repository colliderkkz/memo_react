# Architecture

my-memos 是一个本地单用户的 Next.js（App Router）应用：Server Components 直接读数据，
route handlers 提供 JSON API，浏览器端通过 `src/lib/services/*` 的 fetch 包装调用。
无鉴权、无外部服务；所有持久化都在项目根目录 `data/`。

## 数据流

```
浏览器组件 (views/, views-legacy/)
   │  fetch（src/lib/services/*）
   ▼
route handlers (src/app/api/**/route.ts)          ← zod 校验入参
   │  env.DB / env.MEMOS_BUCKET / env.MEMOS_CACHE  （从 bindings 取，显式传参）
   ▼
service 层 (src/lib/server/memos/service.ts)      ← 业务编排：创建/更新/删除/标签改写
   ├─ repository.ts  drizzle-orm/node-sqlite + 3 条原生 json_each 查询 → data/db.sqlite
   ├─ storage.ts     备忘录正文读写 → MEMOS_BUCKET（data/r2/memos/YYYY/MM/<id>.md）
   └─ cache.ts       OG 图缓存失效 → MEMOS_CACHE（db.sqlite 的 kv 表）
```

页面（`/`、`/archive`、`/favorites`、`/memo/[id]`）是 Server Component，直接调用同一套
service 函数取数后把纯数据传给 client 视图；数据变更后客户端用 `router.refresh()`
重新执行服务端取数（与旧版 `invalidateAll()` 语义一致，无乐观更新）。

## 存储层（src/lib/server/bindings/）

替代原 Cloudflare D1/R2/KV 的最小实现，接口形状保持一致，便于对照旧代码：

| 模块      | 原绑定        | 实现                                                        |
| --------- | ------------- | ----------------------------------------------------------- |
| `db.ts`   | D1（SQLite）  | `node:sqlite` DatabaseSync；启动自动执行 `migrations/*.sql`（`_migrations` 跟踪） |
| `r2.ts`   | R2 对象存储   | `data/r2/` 文件树；contentType 存 `<file>.meta.json` sidecar；get/put/delete/head |
| `kv.ts`   | KV 命名空间   | 同一个 db.sqlite 里的 `kv` 表（key/value BLOB/expires_at）；get/put/delete/list(prefix,cursor) |
| `index.ts`| `cloudflare:workers` 的 env | `getEnv()` globalThis 惰性单例 + Proxy `env` 导出 |

设计约束：

- **kv 用表不用文件目录**：key 含冒号（`memo-og:`、`settings:`），Windows 文件名冒号是 NTFS ADS 陷阱。
- **所有 shim 方法 async**：调用方存在 `.catch()` 链（profile.ts、current-user.ts）。
- **list 游标语义**：按 key 排序、`cursor` = 最后返回的 key、`list_complete = keys.length < limit`，
  保证 `og/cache.ts` 的 do/while 清理循环终止。
- `memos.excerpt` 列冗余存了完整正文摘要，列表/搜索/统计路径不读 r2；只有单条详情
  （getMemo）、标签改写会读正文文件。

## OG 分享图（src/lib/server/og/）

手写 SVG（宽字符感知的单行截断）→ `@resvg/resvg-wasm` 渲染 PNG。wasm 字节用
`createRequire(import.meta.url).resolve()` 运行时解析（不能被打包器静态分析，见 AGENTS.md）；
字体运行时从 Google Fonts 拉 TTF 子集并缓存进 kv（30 天 TTL），离线时降级为无字体渲染。
背景图 `base.jpg` 由 fs 读取转 data-URI（模块级 memoize）。

## 客户端状态（src/lib/state/）

- `toast.ts` / `memo-actions.ts`：模块级 vanilla store（不可变快照）+ `useSyncExternalStore`；
  actions 工厂接受 `refresh` 回调（组件传 `() => router.refresh()`，测试传 spy）。
- `use-tag-autocomplete.ts`：`#话题` 光标上下文检测 + 建议列表（普通 hook）。
- `use-memo-pagination.ts`：游标分页 + IntersectionObserver 无限滚动（Archive/Favorites 新旧布局共用）。

## UI 组件（src/lib/ui/）

自旧 `packages/ui`（Svelte）逐字移植的 React 版，只保留实际用到的组件；
Dialog/Popover/Collapsible/Command 均为手写（context + Escape/外部 pointerdown 监听，无 portal、
无 radix），markup 与 Tailwind 类与原 Svelte 版一致。Svelte 出场动画未复刻（仅入场，
`src/styles/ui-animations.css`）。

## 测试

`src/__tests__/*.test.ts`（vitest，node 环境）：markdown 渲染、memo 校验、服务编排（mock
repository/storage/cache）、上传命名/类型映射、X 导入解析、discovery 生成器、OG SVG 布局、
编辑 actions 状态机。存储层另有 `scripts/check-bindings.mjs`（临时目录端到端自检）与
`scripts/check-api.mjs`（对运行中服务的 API 冒烟矩阵）。
