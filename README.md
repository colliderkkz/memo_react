# my-memos

个人备忘录应用（本地单用户版），基于 **React + Next.js（App Router）** 构建。

改造自 [Pleasurecruise/my-memos](https://github.com/Pleasurecruise/my-memos)（AGPL-3.0）。
本版本从上游的 SvelteKit + Cloudflare（D1/R2/KV）技术栈重构为纯 Node 单应用：
无登录认证、无 AI 聊天、无 MCP 接口、**无任何外部数据库或云服务**——数据全部保存在
项目根目录的 `data/` 文件夹里。

## 功能

- **备忘录** — Markdown 时间线，标签、搜索、日期过滤、置顶、收藏、归档、公开/私密可见性
- **图片上传** — 编辑器图片按钮、Ctrl+V 粘贴截图、拖拽图片文件三种方式；图片存本地，限 10MB（PNG/JPEG/GIF/WebP/AVIF）
- **标签管理** — 点击统计区 "tags in use" 打开管理对话框，重命名/删除标签并同步改写所有相关备忘录正文里的 `#话题`
- **活动日历** — 热力图格子可点击，按天过滤时间线；统计区显示 entries / tags in use / days written
- **自定义句子** — 右栏 quiet thought 悬停可编辑，可一键恢复每日轮换
- **动效** — 开场圆环 + memo 字母光圈收束动画、标题滚动视差、内容滚动揭示、按键微交互（均遵循系统"减少动态效果"设置）
- **X 导入** — 粘贴推文链接导入为备忘录（需要能访问 api.fxtwitter.com）
- **OG 分享图** — 为公开备忘录动态生成分享卡片图（首次生成需联网拉取 Google Fonts，失败时降级为无字体渲染）
- **双布局** — 新版（Masthead）与旧版（Sidebar）界面可切换，深浅色主题

## 本地运行

要求：Node >= 24（自带 corepack 与 node:sqlite）。

```bash
corepack enable
corepack pnpm install   # 安装依赖
corepack pnpm dev       # 开发模式 → http://localhost:3000
```

生产模式（日常使用推荐，启动快）：

```bash
corepack pnpm build
corepack pnpm start     # → http://localhost:3000
```

所有请求都视为本人（Owner），可读写全部备忘录，包括私密内容。

## 日常使用（Windows 双击脚本）

装好依赖之后，日常只需要项目根目录下的两个脚本，**不需要 Docker、数据库或任何外部服务**：

| 脚本               | 作用                                                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `start-memos.bat`  | 双击启动服务（首次会自动构建一次），就绪后自动打开浏览器 http://localhost:3000；服务已在运行时只开浏览器。使用期间保持窗口开着，关窗口即停止 |
| `backup-memos.bat` | 双击把全部数据打包成 `backups\memos-backup-<时间戳>.zip`。备份前建议先关掉服务窗口；恢复 = 停服务后把 zip 内容解压覆盖回 `data\`             |

数据只有 `data/` 一个文件夹（见「在另一台电脑上使用」），定期跑一下备份脚本即可。

## 常用命令

| 命令                       | 说明                                       |
| -------------------------- | ------------------------------------------ |
| `corepack pnpm dev`        | 启动开发服务器（:3000）                    |
| `corepack pnpm build`      | 生产构建（输出 `.next/`）                  |
| `corepack pnpm start`      | 运行生产构建                               |
| `corepack pnpm test`       | 运行测试（vitest）                         |
| `corepack pnpm typecheck`  | 类型检查（tsc）                            |
| `node scripts/check-bindings.mjs` | 存储层自检（临时目录，不碰真实数据） |
| `node scripts/check-api.mjs`      | API 冒烟矩阵（需服务在 :3000 运行）   |

## 数据存储

全部数据位于 `data/`（可用环境变量 `MEMOS_DATA_DIR` 改位置）：

```
data/
├── db.sqlite    # SQLite：memos 元数据+正文摘要、kv 表（设置、OG 图/字体缓存）
└── r2/          # 文件树：备忘录正文 .md、上传图片 uploads/、头像 profile/avatar
                 #（每个文件旁可有 .meta.json 记录 contentType）
```

- 数据库迁移：启动时自动执行 `migrations/*.sql`（`_migrations` 表跟踪），无需手动操作
- 备份该目录即备份全部数据；不要在服务运行时复制（SQLite WAL 写入中复制会得到损坏快照）

## 注意

- **无鉴权**：本应用没有任何登录和 API 鉴权，仅适合在 localhost 本机使用，不要暴露到局域网/公网。
- **从项目根目录启动**：`pnpm dev` / `pnpm start` / 双击 bat 都自动满足；手动 `node` 运行时注意 cwd。
- **个性化**：站点名称在 `src/lib/site.ts`；界面文案在 `src/components/layout/Masthead.tsx` / `Sidebar.tsx` / `AppShell.tsx`；图标为 `public/favicon.png`。

## 在另一台电脑上使用

1. 新电脑安装 **Node >= 24**（[nodejs.org](https://nodejs.org) 下载，自带 corepack）。
2. 拷贝整个项目文件夹到新电脑，**排除**以下可再生的目录（其余全部要拷，尤其是数据目录）：
   - `node_modules/`
   - `.next/`
   - **必须包含** `data/` —— 这是全部备忘录数据
3. 在新电脑的项目根目录打开终端：

   ```bash
   corepack enable
   corepack pnpm install    # 需要联网，几分钟
   corepack pnpm dev        # → http://localhost:3000，数据原样出现
   ```

### 两台电脑之间同步数据

数据就是 `data/` 这一个文件夹：

1. 两台电脑都**停止**服务（Ctrl+C 或关窗口）
2. 用 U 盘/网盘把整个 `data` 文件夹从旧电脑复制到新电脑覆盖
3. 重新启动即可

注意：不要在服务运行时复制（SQLite 写入中复制会得到损坏的快照）；覆盖是整库替换，不是合并——两边都写过数据时，只能保留其中一边。

## 技术栈

Next.js（App Router）· React 19 · node:sqlite（内置，经 drizzle-orm）· Tailwind CSS 4 · vitest · pnpm

## License

AGPL-3.0（继承自上游项目）
